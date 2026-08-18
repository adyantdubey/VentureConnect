import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";
import { demoMembers, investors, startups } from "../app/synthetic-data";
import { demoEmailFor } from "../app/demo-logins";
import { investorIntelligence, marketSources, MATCH_MODEL_METADATA, MATCH_MODEL_VERSION, scoreMatch, startupIntelligence } from "../app/intelligence";

export function getDb() {
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }

  return drizzle(env.DB, { schema });
}

export function getD1() {
  if (!env.DB) throw new Error("Cloudflare D1 binding `DB` is unavailable.");
  return env.DB;
}

type MediaBucket = {
  put: (key: string, value: ReadableStream | ArrayBuffer, options?: { httpMetadata?: { contentType?: string }; customMetadata?: Record<string, string> }) => Promise<unknown>;
  get: (key: string, options?: { range?: Headers | { offset: number; length: number } }) => Promise<null | {
    body: ReadableStream;
    size: number;
    range?: { offset: number; length: number };
    httpEtag?: string;
    writeHttpMetadata?: (headers: Headers) => void;
  }>;
  delete: (key: string) => Promise<void>;
};

export function getMediaBucket(): MediaBucket {
  const bucket = (env as unknown as { MEDIA?: MediaBucket }).MEDIA;
  if (!bucket) throw new Error("Cloudflare R2 binding `MEDIA` is unavailable.");
  return bucket;
}

let initialized = false;

export async function ensureDatabase() {
  if (initialized) return;
  const d1 = getD1();
  await d1.batch([
    d1.prepare("CREATE TABLE IF NOT EXISTS profiles (id TEXT PRIMARY KEY NOT NULL, google_subject TEXT, email TEXT, display_name TEXT NOT NULL, role TEXT NOT NULL, headline TEXT NOT NULL DEFAULT '', company TEXT NOT NULL DEFAULT '', bio TEXT NOT NULL DEFAULT '', onboarding_complete INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, updated_at INTEGER)"),
    d1.prepare("CREATE TABLE IF NOT EXISTS demo_sessions (token_hash TEXT PRIMARY KEY NOT NULL, profile_id TEXT NOT NULL, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS idx_demo_sessions_expires_at ON demo_sessions (expires_at)"),
    d1.prepare("CREATE TABLE IF NOT EXISTS community_posts (id TEXT PRIMARY KEY NOT NULL, author_profile_id TEXT, startup_id TEXT, media_asset_id TEXT, payload TEXT NOT NULL, created_at INTEGER NOT NULL)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS idx_community_posts_created_at ON community_posts (created_at)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS idx_community_posts_author_created ON community_posts (author_profile_id, created_at)"),
    d1.prepare("CREATE TABLE IF NOT EXISTS engagements (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, post_id TEXT NOT NULL, actor_profile_id TEXT, actor TEXT NOT NULL, action TEXT NOT NULL, content TEXT, created_at INTEGER NOT NULL)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS idx_engagements_post_action ON engagements (post_id, action)"),
    d1.prepare("CREATE TABLE IF NOT EXISTS media_assets (id TEXT PRIMARY KEY NOT NULL, owner_profile_id TEXT NOT NULL, r2_key TEXT NOT NULL, file_name TEXT NOT NULL, content_type TEXT NOT NULL, size_bytes INTEGER NOT NULL, uploaded_bytes INTEGER NOT NULL DEFAULT 0, chunk_count INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'uploading', created_at INTEGER NOT NULL)"),
    d1.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_media_assets_r2_key ON media_assets (r2_key)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS idx_media_assets_owner_created ON media_assets (owner_profile_id, created_at)"),
    d1.prepare("CREATE TABLE IF NOT EXISTS media_parts (asset_id TEXT NOT NULL, part_number INTEGER NOT NULL, r2_key TEXT NOT NULL, size_bytes INTEGER NOT NULL, created_at INTEGER NOT NULL)"),
    d1.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_media_parts_asset_part ON media_parts (asset_id, part_number)"),
    d1.prepare("CREATE TABLE IF NOT EXISTS startups (id TEXT PRIMARY KEY NOT NULL, owner_profile_id TEXT, name TEXT NOT NULL, sector TEXT NOT NULL, stage TEXT NOT NULL, location TEXT NOT NULL, description TEXT NOT NULL, created_at INTEGER NOT NULL)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS idx_startups_sector_stage ON startups (sector, stage)"),
    d1.prepare("CREATE TABLE IF NOT EXISTS follows (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, profile_id TEXT NOT NULL, startup_id TEXT NOT NULL, created_at INTEGER NOT NULL)"),
    d1.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_follows_profile_startup ON follows (profile_id, startup_id)"),
    d1.prepare("CREATE TABLE IF NOT EXISTS conversations (id TEXT PRIMARY KEY NOT NULL, founder_profile_id TEXT NOT NULL, investor_profile_id TEXT NOT NULL, inbox_tier TEXT NOT NULL DEFAULT 'request', last_message_at INTEGER NOT NULL, created_at INTEGER NOT NULL)"),
    d1.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_pair ON conversations (founder_profile_id, investor_profile_id)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS idx_conversations_founder_latest ON conversations (founder_profile_id, last_message_at)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS idx_conversations_investor_tier_latest ON conversations (investor_profile_id, inbox_tier, last_message_at)"),
    d1.prepare("CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY NOT NULL, conversation_id TEXT NOT NULL, sender_profile_id TEXT NOT NULL, recipient_profile_id TEXT NOT NULL, body TEXT NOT NULL, created_at INTEGER NOT NULL, read_at INTEGER)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages (conversation_id, created_at)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS idx_messages_recipient_read ON messages (recipient_profile_id, read_at)"),
    d1.prepare("CREATE TABLE IF NOT EXISTS availability_slots (id TEXT PRIMARY KEY NOT NULL, investor_profile_id TEXT NOT NULL, starts_at INTEGER NOT NULL, ends_at INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'open', booked_by_profile_id TEXT)"),
    d1.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_availability_investor_start ON availability_slots (investor_profile_id, starts_at)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS idx_availability_status_start ON availability_slots (status, starts_at)"),
    d1.prepare("CREATE TABLE IF NOT EXISTS meetings (id TEXT PRIMARY KEY NOT NULL, slot_id TEXT NOT NULL, organizer_profile_id TEXT NOT NULL, investor_profile_id TEXT NOT NULL, conversation_id TEXT, notes TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'scheduled', created_at INTEGER NOT NULL)"),
    d1.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_meetings_slot ON meetings (slot_id)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS idx_meetings_organizer_created ON meetings (organizer_profile_id, created_at)"),
    d1.prepare("CREATE TABLE IF NOT EXISTS call_sessions (id TEXT PRIMARY KEY NOT NULL, caller_profile_id TEXT NOT NULL, callee_profile_id TEXT NOT NULL, conversation_id TEXT, mode TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'ringing', offer_json TEXT, answer_json TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS idx_call_sessions_callee_status ON call_sessions (callee_profile_id, status, updated_at)"),
    d1.prepare("CREATE TABLE IF NOT EXISTS call_candidates (id TEXT PRIMARY KEY NOT NULL, call_id TEXT NOT NULL, profile_id TEXT NOT NULL, candidate_json TEXT NOT NULL, created_at INTEGER NOT NULL)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS idx_call_candidates_call_created ON call_candidates (call_id, created_at)"),
    d1.prepare("CREATE TABLE IF NOT EXISTS model_versions (id TEXT PRIMARY KEY NOT NULL, algorithm TEXT NOT NULL, feature_names_json TEXT NOT NULL, weights_json TEXT NOT NULL, metrics_json TEXT NOT NULL, created_at INTEGER NOT NULL)"),
    d1.prepare("CREATE TABLE IF NOT EXISTS match_scores (id TEXT PRIMARY KEY NOT NULL, startup_id TEXT NOT NULL, investor_profile_id TEXT NOT NULL, investor_probability INTEGER NOT NULL, founder_probability INTEGER NOT NULL, reciprocal_score INTEGER NOT NULL, confidence INTEGER NOT NULL, inbox_tier TEXT NOT NULL, feature_json TEXT NOT NULL, explanation_json TEXT NOT NULL, model_version TEXT NOT NULL, calculated_at INTEGER NOT NULL)"),
    d1.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_match_scores_pair_model ON match_scores (startup_id, investor_profile_id, model_version)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS idx_match_scores_investor_rank ON match_scores (investor_profile_id, reciprocal_score)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS idx_match_scores_startup_rank ON match_scores (startup_id, reciprocal_score)"),
    d1.prepare("CREATE TABLE IF NOT EXISTS interaction_events (id TEXT PRIMARY KEY NOT NULL, actor_profile_id TEXT NOT NULL, startup_id TEXT, investor_profile_id TEXT, event_type TEXT NOT NULL, value INTEGER NOT NULL DEFAULT 1, metadata_json TEXT NOT NULL DEFAULT '{}', created_at INTEGER NOT NULL)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS idx_interaction_events_actor_created ON interaction_events (actor_profile_id, created_at)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS idx_interaction_events_startup_type ON interaction_events (startup_id, event_type)"),
    d1.prepare("CREATE TABLE IF NOT EXISTS deal_pipeline (id TEXT PRIMARY KEY NOT NULL, investor_profile_id TEXT NOT NULL, startup_id TEXT NOT NULL, stage TEXT NOT NULL DEFAULT 'saved', notes TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)"),
    d1.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_deal_pipeline_investor_startup ON deal_pipeline (investor_profile_id, startup_id)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS idx_deal_pipeline_investor_stage ON deal_pipeline (investor_profile_id, stage)"),
    d1.prepare("CREATE TABLE IF NOT EXISTS market_research_sources (id TEXT PRIMARY KEY NOT NULL, sector TEXT NOT NULL, publisher TEXT NOT NULL, title TEXT NOT NULL, url TEXT NOT NULL, as_of TEXT NOT NULL, source_metric TEXT NOT NULL, data_json TEXT NOT NULL, accessed_at INTEGER NOT NULL)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS idx_market_sources_sector ON market_research_sources (sector)"),
    d1.prepare("CREATE TABLE IF NOT EXISTS tam_analyses (id TEXT PRIMARY KEY NOT NULL, owner_profile_id TEXT NOT NULL, startup_id TEXT, sector TEXT NOT NULL, scenario TEXT NOT NULL, tam_cr INTEGER NOT NULL, sam_cr INTEGER NOT NULL, som_cr INTEGER NOT NULL, assumptions_json TEXT NOT NULL, source_ids_json TEXT NOT NULL, created_at INTEGER NOT NULL)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS idx_tam_analyses_owner_created ON tam_analyses (owner_profile_id, created_at)"),
  ]);
  await ensureColumns(d1, "profiles", [
    ["headline", "ALTER TABLE profiles ADD COLUMN headline TEXT NOT NULL DEFAULT ''"],
    ["company", "ALTER TABLE profiles ADD COLUMN company TEXT NOT NULL DEFAULT ''"],
    ["bio", "ALTER TABLE profiles ADD COLUMN bio TEXT NOT NULL DEFAULT ''"],
    ["onboarding_complete", "ALTER TABLE profiles ADD COLUMN onboarding_complete INTEGER NOT NULL DEFAULT 0"],
    ["updated_at", "ALTER TABLE profiles ADD COLUMN updated_at INTEGER"],
    ["avatar_color", "ALTER TABLE profiles ADD COLUMN avatar_color TEXT NOT NULL DEFAULT '#5567d8'"],
    ["sectors_json", "ALTER TABLE profiles ADD COLUMN sectors_json TEXT NOT NULL DEFAULT '[]'"],
    ["stages_json", "ALTER TABLE profiles ADD COLUMN stages_json TEXT NOT NULL DEFAULT '[]'"],
    ["locations_json", "ALTER TABLE profiles ADD COLUMN locations_json TEXT NOT NULL DEFAULT '[]'"],
    ["portfolio_startup_ids_json", "ALTER TABLE profiles ADD COLUMN portfolio_startup_ids_json TEXT NOT NULL DEFAULT '[]'"],
    ["profile_data_json", "ALTER TABLE profiles ADD COLUMN profile_data_json TEXT NOT NULL DEFAULT '{}'"],
  ]);
  await ensureColumns(d1, "conversations", [
    ["routing_score", "ALTER TABLE conversations ADD COLUMN routing_score INTEGER NOT NULL DEFAULT 0"],
    ["routing_reason_json", "ALTER TABLE conversations ADD COLUMN routing_reason_json TEXT NOT NULL DEFAULT '[]'"],
    ["routing_model_version", "ALTER TABLE conversations ADD COLUMN routing_model_version TEXT NOT NULL DEFAULT ''"],
  ]);
  await ensureColumns(d1, "community_posts", [
    ["media_asset_id", "ALTER TABLE community_posts ADD COLUMN media_asset_id TEXT"],
  ]);
  await ensureColumns(d1, "engagements", [
    ["actor_profile_id", "ALTER TABLE engagements ADD COLUMN actor_profile_id TEXT"],
  ]);
  await d1.prepare("CREATE INDEX IF NOT EXISTS idx_engagements_actor_action ON engagements (actor_profile_id, action)").run();
  await ensureColumns(d1, "media_assets", [
    ["uploaded_bytes", "ALTER TABLE media_assets ADD COLUMN uploaded_bytes INTEGER NOT NULL DEFAULT 0"],
    ["chunk_count", "ALTER TABLE media_assets ADD COLUMN chunk_count INTEGER NOT NULL DEFAULT 0"],
  ]);
  await seedDemoNetwork(d1);
  await d1.prepare("PRAGMA optimize").run();
  initialized = true;
}

async function ensureColumns(d1: ReturnType<typeof getD1>, table: string, columns: Array<[string, string]>) {
  const info = await d1.prepare(`PRAGMA table_info(${table})`).all<{ name: string }>();
  const existing = new Set(info.results.map((column) => column.name));
  for (const [name, statement] of columns) {
    if (!existing.has(name)) await d1.prepare(statement).run();
  }
}

async function seedDemoNetwork(d1: ReturnType<typeof getD1>) {
  let founderIndex = 0;
  let investorIndex = 0;
  const seededAt = Date.now();
  const statements = demoMembers.map((member) => {
    const roleIndex = member.role === "founder" ? founderIndex++ : investorIndex++;
    const intelligence = member.role === "founder"
      ? startupIntelligence.find((item) => item.founderProfileId === member.id)
      : investorIntelligence.find((item) => item.profileId === member.id);
    return d1.prepare("INSERT INTO profiles (id, email, display_name, role, headline, company, bio, avatar_color, sectors_json, stages_json, locations_json, portfolio_startup_ids_json, profile_data_json, onboarding_complete, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?) ON CONFLICT(id) DO UPDATE SET email = excluded.email, display_name = excluded.display_name, role = excluded.role, headline = excluded.headline, company = excluded.company, bio = excluded.bio, avatar_color = excluded.avatar_color, sectors_json = excluded.sectors_json, stages_json = excluded.stages_json, locations_json = excluded.locations_json, portfolio_startup_ids_json = excluded.portfolio_startup_ids_json, profile_data_json = excluded.profile_data_json, onboarding_complete = 1, updated_at = excluded.updated_at")
      .bind(member.id, demoEmailFor(member.role, roleIndex), member.name, member.role, member.headline, member.company, member.bio, member.color, JSON.stringify(member.sectors), JSON.stringify(member.stages), JSON.stringify(member.locations), JSON.stringify(member.portfolioStartupIds), JSON.stringify(intelligence ?? {}), seededAt, seededAt);
  });

  statements.push(...startups.map((startup) => d1.prepare("INSERT OR IGNORE INTO startups (id, owner_profile_id, name, sector, stage, location, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(startup.id, startup.founderProfileId, startup.name, startup.sector, startup.stage, startup.location, startup.description, startup.createdAt)));

  const firstSlot = nextWeekdayAt(3, 16);
  investors.forEach((investor, investorIndex) => {
    [0, 2, 7].forEach((dayOffset, slotIndex) => {
      const startsAt = firstSlot + (investorIndex % 4 + dayOffset) * 86_400_000 + slotIndex * 3_600_000;
      statements.push(d1.prepare("INSERT OR IGNORE INTO availability_slots (id, investor_profile_id, starts_at, ends_at, status) VALUES (?, ?, ?, ?, 'open')")
        .bind(`demo-slot-${investor.id}-${slotIndex}`, investor.profileId, startsAt, startsAt + 30 * 60_000));
    });
  });

  const modelExists = await d1.prepare("SELECT id FROM model_versions WHERE id = ?").bind(MATCH_MODEL_VERSION).first<{ id: string }>();
  if (!modelExists) {
    statements.push(d1.prepare("INSERT INTO model_versions (id, algorithm, feature_names_json, weights_json, metrics_json, created_at) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(MATCH_MODEL_VERSION, MATCH_MODEL_METADATA.algorithm, JSON.stringify(MATCH_MODEL_METADATA.featureNames), JSON.stringify({ intercept: MATCH_MODEL_METADATA.intercept, ...MATCH_MODEL_METADATA.weights }), JSON.stringify({ ...MATCH_MODEL_METADATA.metrics, coldStart: true, explainable: true }), seededAt));

    marketSources.forEach((source) => {
      statements.push(d1.prepare("INSERT OR REPLACE INTO market_research_sources (id, sector, publisher, title, url, as_of, source_metric, data_json, accessed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(source.id, source.sector, source.publisher, source.title, source.url, source.asOf, source.sourceMetric, JSON.stringify({ addressableUnits: source.addressableUnits, annualValueInr: source.annualValueInr, cagr: source.cagr, confidence: source.confidence }), seededAt));
    });

    startupIntelligence.forEach((startup) => {
      investorIntelligence.forEach((investor) => {
        const match = scoreMatch(startup, investor);
        statements.push(d1.prepare("INSERT INTO match_scores (id, startup_id, investor_profile_id, investor_probability, founder_probability, reciprocal_score, confidence, inbox_tier, feature_json, explanation_json, model_version, calculated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
          .bind(`match-${startup.startupId}-${investor.profileId}-${MATCH_MODEL_VERSION}`, startup.startupId, investor.profileId, match.investorProbability, match.founderProbability, match.reciprocalScore, match.confidence, match.inboxTier, JSON.stringify(match.features), JSON.stringify({ reasons: match.reasons, concerns: match.concerns }), MATCH_MODEL_VERSION, seededAt));
      });
    });
  }

  for (let index = 0; index < statements.length; index += 80) {
    await d1.batch(statements.slice(index, index + 80));
  }
}

function nextWeekdayAt(daysAhead: number, hour: number) {
  const value = new Date();
  value.setUTCDate(value.getUTCDate() + daysAhead);
  value.setUTCHours(hour, 0, 0, 0);
  return value.getTime();
}
