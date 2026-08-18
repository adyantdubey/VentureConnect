import { ensureDatabase, getD1 } from "../../db";
import { headers } from "next/headers";
import { DEMO_SESSION_COOKIE, hashDemoToken, readCookie } from "./demo-accounts";

export type MemberProfile = {
  id: string;
  email: string;
  displayName: string;
  role: "investor" | "founder";
  headline: string;
  company: string;
  bio: string;
  avatarColor: string;
  sectors: string[];
  stages: string[];
  locations: string[];
  portfolioStartupIds: string[];
  onboardingComplete: boolean;
};

type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string;
  role: "investor" | "founder";
  headline: string | null;
  company: string | null;
  bio: string | null;
  avatar_color: string | null;
  sectors_json: string | null;
  stages_json: string | null;
  locations_json: string | null;
  portfolio_startup_ids_json: string | null;
  onboarding_complete: number;
};

export async function getCurrentMember(options: { create?: boolean } = {}): Promise<MemberProfile | null> {
  void options;
  await ensureDatabase();
  const d1 = getD1();
  const requestHeaders = await headers();
  const demoToken = readCookie(requestHeaders.get("cookie"), DEMO_SESSION_COOKIE);
  if (demoToken) {
    const tokenHash = await hashDemoToken(demoToken);
    const now = Date.now();
    const demoRow = await d1.prepare(
      "SELECT p.id, p.email, p.display_name, p.role, p.headline, p.company, p.bio, p.avatar_color, p.sectors_json, p.stages_json, p.locations_json, p.portfolio_startup_ids_json, p.onboarding_complete FROM demo_sessions s INNER JOIN profiles p ON p.id = s.profile_id WHERE s.token_hash = ? AND s.expires_at > ?"
    ).bind(tokenHash, now).first<ProfileRow>();
    if (demoRow) return mapProfile(demoRow);
    await d1.prepare("DELETE FROM demo_sessions WHERE token_hash = ?").bind(tokenHash).run();
  }

  return null;
}

export function profileTitle(profile: MemberProfile): string {
  if (profile.headline) return profile.headline;
  if (profile.role === "founder") return profile.company ? `Founder · ${profile.company}` : "Startup founder";
  return profile.company ? `Investor · ${profile.company}` : "Startup investor";
}

function mapProfile(row: ProfileRow): MemberProfile {
  return {
    id: row.id,
    email: row.email ?? "",
    displayName: row.display_name,
    role: row.role,
    headline: row.headline ?? "",
    company: row.company ?? "",
    bio: row.bio ?? "",
    avatarColor: row.avatar_color ?? "#5567d8",
    sectors: parseList(row.sectors_json),
    stages: parseList(row.stages_json),
    locations: parseList(row.locations_json),
    portfolioStartupIds: parseList(row.portfolio_startup_ids_json),
    onboardingComplete: Boolean(row.onboarding_complete),
  };
}

function parseList(value: string | null): string[] {
  try {
    const parsed = JSON.parse(value ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}
