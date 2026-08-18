import { ensureDatabase, getD1 } from "../../../db";
import { getCurrentMember } from "../../server/member";

export async function GET(request: Request) {
  const member = await getCurrentMember();
  if (!member) return Response.json({ error: "Sign in to view meeting times." }, { status: 401 });
  await ensureDatabase();
  const d1 = getD1();
  const investorProfileId = new URL(request.url).searchParams.get("investorProfileId");
  if (investorProfileId) {
    const result = await d1.prepare("SELECT id, investor_profile_id, starts_at, ends_at FROM availability_slots WHERE investor_profile_id = ? AND status = 'open' AND starts_at > ? ORDER BY starts_at ASC LIMIT 30")
      .bind(investorProfileId, Date.now()).all<{ id: string; investor_profile_id: string; starts_at: number; ends_at: number }>();
    return Response.json({ slots: result.results.map((slot) => ({ id: slot.id, investorProfileId: slot.investor_profile_id, startsAt: slot.starts_at, endsAt: slot.ends_at })) });
  }
  const result = await d1.prepare(`SELECT m.id, m.notes, m.status, m.created_at, s.starts_at, s.ends_at,
      p.display_name AS investor_name, p.company AS investor_company
    FROM meetings m JOIN availability_slots s ON s.id = m.slot_id JOIN profiles p ON p.id = m.investor_profile_id
    WHERE m.organizer_profile_id = ? OR m.investor_profile_id = ? ORDER BY s.starts_at ASC LIMIT 50`)
    .bind(member.id, member.id).all<{ id: string; notes: string; status: string; created_at: number; starts_at: number; ends_at: number; investor_name: string; investor_company: string }>();
  return Response.json({ meetings: result.results.map((meeting) => ({ id: meeting.id, notes: meeting.notes, status: meeting.status, startsAt: meeting.starts_at, endsAt: meeting.ends_at, investorName: meeting.investor_name, investorCompany: meeting.investor_company, createdAt: meeting.created_at })) });
}

export async function POST(request: Request) {
  const member = await getCurrentMember();
  if (!member) return Response.json({ error: "Sign in to schedule a meeting." }, { status: 401 });
  await ensureDatabase();
  const d1 = getD1();
  const input = await request.json() as { slotId?: string; conversationId?: string; notes?: string };
  if (!input.slotId) return Response.json({ error: "Choose an available time." }, { status: 400 });
  const slot = await d1.prepare("SELECT id, investor_profile_id, starts_at, ends_at, status FROM availability_slots WHERE id = ?")
    .bind(input.slotId).first<{ id: string; investor_profile_id: string; starts_at: number; ends_at: number; status: string }>();
  if (!slot || slot.status !== "open" || slot.starts_at <= Date.now()) return Response.json({ error: "That time is no longer available." }, { status: 409 });
  if (slot.investor_profile_id === member.id) return Response.json({ error: "You cannot book your own availability." }, { status: 400 });
  const updated = await d1.prepare("UPDATE availability_slots SET status = 'booked', booked_by_profile_id = ? WHERE id = ? AND status = 'open'")
    .bind(member.id, slot.id).run();
  if (!updated.meta.changes) return Response.json({ error: "Someone just booked that time. Choose another slot." }, { status: 409 });
  const id = `meeting-${crypto.randomUUID()}`;
  try {
    await d1.prepare("INSERT INTO meetings (id, slot_id, organizer_profile_id, investor_profile_id, conversation_id, notes, status, created_at) VALUES (?, ?, ?, ?, ?, ?, 'scheduled', ?)")
      .bind(id, slot.id, member.id, slot.investor_profile_id, input.conversationId ?? null, input.notes?.trim().slice(0, 500) ?? "", Date.now()).run();
  } catch (error) {
    await d1.prepare("UPDATE availability_slots SET status = 'open', booked_by_profile_id = NULL WHERE id = ? AND booked_by_profile_id = ?").bind(slot.id, member.id).run();
    throw error;
  }
  return Response.json({ meeting: { id, startsAt: slot.starts_at, endsAt: slot.ends_at, status: "scheduled" } }, { status: 201 });
}
