import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

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
  ]);
  await ensureColumns(d1, "profiles", [
    ["headline", "ALTER TABLE profiles ADD COLUMN headline TEXT NOT NULL DEFAULT ''"],
    ["company", "ALTER TABLE profiles ADD COLUMN company TEXT NOT NULL DEFAULT ''"],
    ["bio", "ALTER TABLE profiles ADD COLUMN bio TEXT NOT NULL DEFAULT ''"],
    ["onboarding_complete", "ALTER TABLE profiles ADD COLUMN onboarding_complete INTEGER NOT NULL DEFAULT 0"],
    ["updated_at", "ALTER TABLE profiles ADD COLUMN updated_at INTEGER"],
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
  initialized = true;
}

async function ensureColumns(d1: ReturnType<typeof getD1>, table: string, columns: Array<[string, string]>) {
  const info = await d1.prepare(`PRAGMA table_info(${table})`).all<{ name: string }>();
  const existing = new Set(info.results.map((column) => column.name));
  for (const [name, statement] of columns) {
    if (!existing.has(name)) await d1.prepare(statement).run();
  }
}
