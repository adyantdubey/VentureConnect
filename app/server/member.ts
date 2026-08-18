import { getSupabaseUser } from "../supabase-auth";
import { ensureDatabase, getD1 } from "../../db";

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
  const identity = await getSupabaseUser();
  if (!identity) return null;
  await ensureDatabase();
  const d1 = getD1();
  let row = await d1
    .prepare("SELECT id, email, display_name, role, headline, company, bio, avatar_color, sectors_json, stages_json, locations_json, portfolio_startup_ids_json, onboarding_complete FROM profiles WHERE id = ?")
    .bind(identity.userId)
    .first<ProfileRow>();

  if (!row && options.create !== false) {
    const now = Date.now();
    await d1
      .prepare("INSERT INTO profiles (id, email, display_name, role, headline, company, bio, onboarding_complete, created_at, updated_at) VALUES (?, ?, ?, 'founder', '', '', '', 0, ?, ?)")
      .bind(identity.userId, identity.email, identity.displayName, now, now)
      .run();
    row = {
      id: identity.userId,
      email: identity.email,
      display_name: identity.displayName,
      role: "founder",
      headline: "",
      company: "",
      bio: "",
      avatar_color: "#5567d8",
      sectors_json: "[]",
      stages_json: "[]",
      locations_json: "[]",
      portfolio_startup_ids_json: "[]",
      onboarding_complete: 0,
    };
  } else if (row && row.email !== identity.email) {
    await d1.prepare("UPDATE profiles SET email = ?, updated_at = ? WHERE id = ?")
      .bind(identity.email, Date.now(), identity.userId)
      .run();
    row.email = identity.email;
  }

  return row ? mapProfile(row) : null;
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
