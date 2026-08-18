import { ensureDatabase, getD1 } from "../../../db";
import { getCurrentMember } from "../../server/member";

export async function GET(request: Request) {
  const member = await getCurrentMember();
  if (!member) return Response.json({ error: "Sign in to use calls." }, { status: 401 });
  await ensureDatabase();
  const d1 = getD1();
  const callId = new URL(request.url).searchParams.get("callId");
  if (callId) {
    const call = await d1.prepare("SELECT * FROM call_sessions WHERE id = ? AND (caller_profile_id = ? OR callee_profile_id = ?)")
      .bind(callId, member.id, member.id).first<Record<string, string | number | null>>();
    if (!call) return Response.json({ error: "Call not found." }, { status: 404 });
    const candidates = await d1.prepare("SELECT id, profile_id, candidate_json, created_at FROM call_candidates WHERE call_id = ? AND profile_id <> ? ORDER BY created_at ASC")
      .bind(callId, member.id).all<{ id: string; profile_id: string; candidate_json: string; created_at: number }>();
    return Response.json({ call: mapCall(call), candidates: candidates.results.map((item) => ({ id: item.id, profileId: item.profile_id, candidate: JSON.parse(item.candidate_json), createdAt: item.created_at })) });
  }
  const incoming = await d1.prepare("SELECT c.*, p.display_name AS caller_name, p.avatar_color AS caller_color FROM call_sessions c JOIN profiles p ON p.id = c.caller_profile_id WHERE c.callee_profile_id = ? AND c.status = 'ringing' ORDER BY c.created_at DESC LIMIT 1")
    .bind(member.id).first<Record<string, string | number | null>>();
  return Response.json({ incoming: incoming ? mapCall(incoming) : null });
}

export async function POST(request: Request) {
  const member = await getCurrentMember();
  if (!member) return Response.json({ error: "Sign in to use calls." }, { status: 401 });
  await ensureDatabase();
  const d1 = getD1();
  const input = await request.json() as { action?: "start" | "answer" | "candidate" | "status"; callId?: string; calleeProfileId?: string; conversationId?: string; mode?: "voice" | "video"; description?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit; status?: "active" | "declined" | "ended" };
  const now = Date.now();
  if (input.action === "start") {
    if (!input.calleeProfileId || input.calleeProfileId === member.id || !input.description || !input.conversationId) return Response.json({ error: "Start a message conversation before calling." }, { status: 400 });
    const callee = await d1.prepare("SELECT id FROM profiles WHERE id = ?").bind(input.calleeProfileId).first<{ id: string }>();
    if (!callee) return Response.json({ error: "That member could not be found." }, { status: 404 });
    const conversation = await d1.prepare("SELECT id FROM conversations WHERE id = ? AND ((founder_profile_id = ? AND investor_profile_id = ?) OR (founder_profile_id = ? AND investor_profile_id = ?))")
      .bind(input.conversationId, member.id, input.calleeProfileId, input.calleeProfileId, member.id).first<{ id: string }>();
    if (!conversation) return Response.json({ error: "Calls are available after both members have a conversation." }, { status: 403 });
    const id = `call-${crypto.randomUUID()}`;
    await d1.prepare("INSERT INTO call_sessions (id, caller_profile_id, callee_profile_id, conversation_id, mode, status, offer_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'ringing', ?, ?, ?)")
      .bind(id, member.id, input.calleeProfileId, input.conversationId ?? null, input.mode === "voice" ? "voice" : "video", JSON.stringify(input.description), now, now).run();
    return Response.json({ callId: id, status: "ringing" }, { status: 201 });
  }
  if (!input.callId) return Response.json({ error: "A call id is required." }, { status: 400 });
  const call = await d1.prepare("SELECT caller_profile_id, callee_profile_id FROM call_sessions WHERE id = ? AND (caller_profile_id = ? OR callee_profile_id = ?)")
    .bind(input.callId, member.id, member.id).first<{ caller_profile_id: string; callee_profile_id: string }>();
  if (!call) return Response.json({ error: "Call not found." }, { status: 404 });
  if (input.action === "answer" && input.description) {
    await d1.prepare("UPDATE call_sessions SET answer_json = ?, status = 'active', updated_at = ? WHERE id = ? AND callee_profile_id = ?")
      .bind(JSON.stringify(input.description), now, input.callId, member.id).run();
  } else if (input.action === "candidate" && input.candidate) {
    await d1.prepare("INSERT INTO call_candidates (id, call_id, profile_id, candidate_json, created_at) VALUES (?, ?, ?, ?, ?)")
      .bind(`candidate-${crypto.randomUUID()}`, input.callId, member.id, JSON.stringify(input.candidate), now).run();
  } else if (input.action === "status" && input.status) {
    await d1.prepare("UPDATE call_sessions SET status = ?, updated_at = ? WHERE id = ?").bind(input.status, now, input.callId).run();
  } else {
    return Response.json({ error: "Unsupported call update." }, { status: 400 });
  }
  return Response.json({ ok: true });
}

function mapCall(row: Record<string, string | number | null>) {
  return {
    id: row.id,
    callerProfileId: row.caller_profile_id,
    calleeProfileId: row.callee_profile_id,
    callerName: row.caller_name,
    callerColor: row.caller_color,
    conversationId: row.conversation_id,
    mode: row.mode,
    status: row.status,
    offer: row.offer_json ? JSON.parse(String(row.offer_json)) : null,
    answer: row.answer_json ? JSON.parse(String(row.answer_json)) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
