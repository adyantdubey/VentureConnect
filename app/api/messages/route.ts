import { ensureDatabase, getD1 } from "../../../db";
import { getCurrentMember } from "../../server/member";
import { MATCH_MODEL_VERSION, matchByProfileIds } from "../../intelligence";

type ProfileRow = {
  id: string;
  display_name: string;
  role: "founder" | "investor";
  headline: string;
  company: string;
  avatar_color: string;
  sectors_json: string;
  stages_json: string;
  locations_json: string;
};

type ConversationRow = {
  id: string;
  inbox_tier: "primary" | "secondary" | "request";
  routing_score: number;
  routing_reason_json: string;
  routing_model_version: string;
  last_message_at: number;
  other_id: string;
  display_name: string;
  role: "founder" | "investor";
  headline: string;
  company: string;
  avatar_color: string;
  preview: string | null;
  unread_count: number;
};

export async function GET(request: Request) {
  const member = await getCurrentMember();
  if (!member) return Response.json({ error: "Sign in to view messages." }, { status: 401 });
  await ensureDatabase();
  const d1 = getD1();
  const conversationId = new URL(request.url).searchParams.get("conversationId");

  if (conversationId) {
    const allowed = await d1.prepare("SELECT id FROM conversations WHERE id = ? AND (founder_profile_id = ? OR investor_profile_id = ?)")
      .bind(conversationId, member.id, member.id).first<{ id: string }>();
    if (!allowed) return Response.json({ error: "Conversation not found." }, { status: 404 });
    const result = await d1.prepare("SELECT m.id, m.sender_profile_id, m.recipient_profile_id, m.body, m.created_at, m.read_at, p.display_name AS sender_name FROM messages m JOIN profiles p ON p.id = m.sender_profile_id WHERE m.conversation_id = ? ORDER BY m.created_at ASC LIMIT 250")
      .bind(conversationId).all<{ id: string; sender_profile_id: string; recipient_profile_id: string; body: string; created_at: number; read_at: number | null; sender_name: string }>();
    await d1.prepare("UPDATE messages SET read_at = ? WHERE conversation_id = ? AND recipient_profile_id = ? AND read_at IS NULL")
      .bind(Date.now(), conversationId, member.id).run();
    return Response.json({ messages: result.results.map((item) => ({ id: item.id, senderProfileId: item.sender_profile_id, recipientProfileId: item.recipient_profile_id, senderName: item.sender_name, body: item.body, createdAt: item.created_at, readAt: item.read_at })) });
  }

  const conversations = await d1.prepare(`SELECT c.id, c.inbox_tier, c.routing_score, c.routing_reason_json, c.routing_model_version, c.last_message_at,
      p.id AS other_id, p.display_name, p.role, p.headline, p.company, p.avatar_color,
      (SELECT body FROM messages lm WHERE lm.conversation_id = c.id ORDER BY lm.created_at DESC LIMIT 1) AS preview,
      (SELECT COUNT(*) FROM messages um WHERE um.conversation_id = c.id AND um.recipient_profile_id = ? AND um.read_at IS NULL) AS unread_count
    FROM conversations c
    JOIN profiles p ON p.id = CASE WHEN c.founder_profile_id = ? THEN c.investor_profile_id ELSE c.founder_profile_id END
    WHERE c.founder_profile_id = ? OR c.investor_profile_id = ?
    ORDER BY c.last_message_at DESC LIMIT 100`)
    .bind(member.id, member.id, member.id, member.id).all<ConversationRow>();
  const contacts = await d1.prepare("SELECT id, display_name, role, headline, company, avatar_color, sectors_json, stages_json, locations_json FROM profiles WHERE id <> ? ORDER BY role DESC, display_name ASC LIMIT 80")
    .bind(member.id).all<ProfileRow>();

  return Response.json({
    conversations: conversations.results.map(mapConversation),
    contacts: contacts.results.map(mapContact),
  });
}

export async function POST(request: Request) {
  const member = await getCurrentMember();
  if (!member) return Response.json({ error: "Sign in to send a message." }, { status: 401 });
  await ensureDatabase();
  const d1 = getD1();
  const input = await request.json() as { recipientProfileId?: string; conversationId?: string; body?: string };
  const body = input.body?.trim().slice(0, 2_000);
  if (!body) return Response.json({ error: "Write a message first." }, { status: 400 });
  const recent = await d1.prepare("SELECT COUNT(*) AS count FROM messages WHERE sender_profile_id = ? AND created_at >= ?")
    .bind(member.id, Date.now() - 86_400_000).first<{ count: number }>();
  if ((recent?.count ?? 0) >= 100) return Response.json({ error: "You have reached today’s messaging limit." }, { status: 429 });

  let conversation = input.conversationId
    ? await d1.prepare("SELECT id, founder_profile_id, investor_profile_id, inbox_tier FROM conversations WHERE id = ? AND (founder_profile_id = ? OR investor_profile_id = ?)")
      .bind(input.conversationId, member.id, member.id).first<{ id: string; founder_profile_id: string; investor_profile_id: string; inbox_tier: string }>()
    : null;

  let recipientId = input.recipientProfileId;
  if (conversation) recipientId = conversation.founder_profile_id === member.id ? conversation.investor_profile_id : conversation.founder_profile_id;
  if (!recipientId || recipientId === member.id) return Response.json({ error: "Choose another member." }, { status: 400 });
  const recipient = await d1.prepare("SELECT id, role, sectors_json, stages_json, locations_json FROM profiles WHERE id = ?")
    .bind(recipientId).first<{ id: string; role: "founder" | "investor"; sectors_json: string; stages_json: string; locations_json: string }>();
  if (!recipient) return Response.json({ error: "That member could not be found." }, { status: 404 });
  if (member.role === recipient.role) return Response.json({ error: "This MVP currently routes founder-to-investor conversations." }, { status: 400 });

  const founderId = member.role === "founder" ? member.id : recipient.id;
  const investorId = member.role === "investor" ? member.id : recipient.id;
  const routing = member.role === "investor"
    ? { tier: "primary" as const, score: 100, reasons: ["Investor-initiated outreach is delivered directly to the founder"], modelVersion: MATCH_MODEL_VERSION }
    : await calculateRouting(founderId, investorId, recipient, d1);
  const tier = routing.tier;
  const now = Date.now();
  if (!conversation) {
    conversation = await d1.prepare("SELECT id, founder_profile_id, investor_profile_id, inbox_tier FROM conversations WHERE founder_profile_id = ? AND investor_profile_id = ?")
      .bind(founderId, investorId).first<{ id: string; founder_profile_id: string; investor_profile_id: string; inbox_tier: string }>();
  }
  if (!conversation && member.role === "founder") {
    const outreach = await d1.prepare("SELECT COUNT(*) AS count FROM conversations WHERE founder_profile_id = ? AND created_at >= ?")
      .bind(member.id, now - 86_400_000).first<{ count: number }>();
    if ((outreach?.count ?? 0) >= 10) return Response.json({ error: "You have reached today’s new-investor outreach limit. Continue existing conversations or return tomorrow." }, { status: 429 });
  }
  const conversationId = conversation?.id ?? `conversation-${crypto.randomUUID()}`;
  if (!conversation) {
    await d1.prepare("INSERT INTO conversations (id, founder_profile_id, investor_profile_id, inbox_tier, routing_score, routing_reason_json, routing_model_version, last_message_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(conversationId, founderId, investorId, tier, routing.score, JSON.stringify(routing.reasons), routing.modelVersion, now, now).run();
  } else {
    await d1.prepare("UPDATE conversations SET inbox_tier = ?, last_message_at = ? WHERE id = ?")
      .bind(member.role === "investor" ? "primary" : conversation.inbox_tier, now, conversationId).run();
  }
  const messageId = `message-${crypto.randomUUID()}`;
  await d1.prepare("INSERT INTO messages (id, conversation_id, sender_profile_id, recipient_profile_id, body, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(messageId, conversationId, member.id, recipientId, body, now).run();
  return Response.json({ message: { id: messageId, conversationId, senderProfileId: member.id, recipientProfileId: recipientId, senderName: member.displayName, body, createdAt: now }, inboxTier: tier, routing }, { status: 201 });
}

async function calculateRouting(founderId: string, investorId: string, investor: { sectors_json: string; stages_json: string; locations_json: string }, d1: ReturnType<typeof getD1>) {
  const modelMatch = matchByProfileIds(founderId, investorId);
  if (modelMatch) return { tier: modelMatch.inboxTier, score: modelMatch.investorProbability, reasons: [...modelMatch.reasons, ...modelMatch.concerns.slice(0, 1)], modelVersion: modelMatch.modelVersion };
  const tier = await calculateTier(founderId, investor, d1);
  return { tier, score: tier === "primary" ? 78 : tier === "secondary" ? 56 : 28, reasons: ["Fallback profile overlap routing was used for this member"], modelVersion: "profile-overlap-v1" };
}

async function calculateTier(founderId: string, investor: { sectors_json: string; stages_json: string; locations_json: string }, d1: ReturnType<typeof getD1>) {
  const startup = await d1.prepare("SELECT sector, stage, location FROM startups WHERE owner_profile_id = ? LIMIT 1")
    .bind(founderId).first<{ sector: string; stage: string; location: string }>();
  const founder = startup ?? await d1.prepare("SELECT sectors_json AS sector, stages_json AS stage, locations_json AS location FROM profiles WHERE id = ?")
    .bind(founderId).first<{ sector: string; stage: string; location: string }>();
  const founderSectors = startup ? [startup.sector] : parseList(founder?.sector);
  const founderStages = startup ? [startup.stage] : parseList(founder?.stage);
  const founderLocations = startup ? [startup.location] : parseList(founder?.location);
  const score = Number(overlaps(founderSectors, parseList(investor.sectors_json))) + Number(overlaps(founderStages, parseList(investor.stages_json))) + Number(overlaps(founderLocations, parseList(investor.locations_json)));
  return score >= 2 ? "primary" : score === 1 ? "secondary" : "request";
}

const overlaps = (left: string[], right: string[]) => left.some((item) => right.includes(item));
function parseList(value?: string | null): string[] {
  try { const parsed = JSON.parse(value ?? "[]"); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
}
function mapContact(row: ProfileRow) {
  return { id: row.id, name: row.display_name, role: row.role, headline: row.headline, company: row.company, color: row.avatar_color, sectors: parseList(row.sectors_json), stages: parseList(row.stages_json), locations: parseList(row.locations_json) };
}
function mapConversation(row: ConversationRow) {
  return { id: row.id, inboxTier: row.inbox_tier, routingScore: Number(row.routing_score ?? 0), routingReasons: parseList(row.routing_reason_json), routingModelVersion: row.routing_model_version, lastMessageAt: row.last_message_at, other: { id: row.other_id, name: row.display_name, role: row.role, headline: row.headline, company: row.company, color: row.avatar_color }, preview: row.preview ?? "Start the conversation", unreadCount: Number(row.unread_count) };
}
