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

let initialized = false;

export async function ensureDatabase() {
  if (initialized) return;
  const d1 = getD1();
  await d1.batch([
    d1.prepare("CREATE TABLE IF NOT EXISTS community_posts (id TEXT PRIMARY KEY NOT NULL, author_profile_id TEXT, startup_id TEXT, payload TEXT NOT NULL, created_at INTEGER NOT NULL)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS idx_community_posts_created_at ON community_posts (created_at)"),
    d1.prepare("CREATE TABLE IF NOT EXISTS engagements (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, post_id TEXT NOT NULL, actor TEXT NOT NULL, action TEXT NOT NULL, content TEXT, created_at INTEGER NOT NULL)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS idx_engagements_post_action ON engagements (post_id, action)"),
  ]);
  initialized = true;
}
