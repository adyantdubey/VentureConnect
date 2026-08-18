import { demoEmailFor, demoPasswordFor } from "../demo-logins";
import { ensureDatabase, getD1 } from "../../db";
import { demoMembers } from "../synthetic-data";
import { investorIntelligence, startupIntelligence } from "../intelligence";

export const DEMO_SESSION_COOKIE = "innovestart_demo_session";
export const DEMO_SESSION_SECONDS = 12 * 60 * 60;

type DemoRole = "founder" | "investor";

export type DemoAccount = {
  id: string;
  email: string;
  password: string;
  displayName: string;
  role: DemoRole;
  headline: string;
  company: string;
  bio: string;
  avatarColor: string;
  sectors: string[];
  stages: string[];
  locations: string[];
  portfolioStartupIds: string[];
  scenario: string;
  featured: boolean;
};

const scenarios = [
  "Perfect sector, stage, cheque and geography match",
  "Strong sector fit with a geography mismatch",
  "Adjacent-sector opportunity",
  "Cheque range mismatch",
  "Stage mismatch",
  "Portfolio adjacency and conflict check",
  "Broad-thesis cold start",
  "High-traction recommendation",
  "Low-confidence incomplete profile",
  "Direct investor outreach",
] as const;

export const DEMO_ACCOUNTS: readonly DemoAccount[] = demoMembers.map((member, index) => {
  const roleIndex = member.role === "founder"
    ? startupIntelligence.findIndex((item) => item.founderProfileId === member.id)
    : investorIntelligence.findIndex((item) => item.profileId === member.id);
  const position = Math.max(0, roleIndex);
  return {
    id: member.id,
    email: demoEmailFor(member.role, position),
    password: demoPasswordFor(member.role),
    displayName: member.name,
    role: member.role,
    headline: member.headline,
    company: member.company,
    bio: member.bio,
    avatarColor: member.color,
    sectors: member.sectors,
    stages: member.stages,
    locations: member.locations,
    portfolioStartupIds: member.portfolioStartupIds,
    scenario: scenarios[index % scenarios.length],
    featured: position < 6,
  };
});

export function findDemoAccount(email: string) {
  const normalized = email.trim().toLowerCase();
  return DEMO_ACCOUNTS.find((account) => account.email === normalized) ?? null;
}

export async function createDemoSession(account: DemoAccount) {
  await ensureDatabase();
  const d1 = getD1();
  const now = Date.now();

  await d1.prepare(
    "INSERT INTO profiles (id, email, display_name, role, headline, company, bio, avatar_color, sectors_json, stages_json, locations_json, portfolio_startup_ids_json, profile_data_json, onboarding_complete, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?) ON CONFLICT(id) DO UPDATE SET email = excluded.email, display_name = excluded.display_name, role = excluded.role, headline = excluded.headline, company = excluded.company, bio = excluded.bio, avatar_color = excluded.avatar_color, sectors_json = excluded.sectors_json, stages_json = excluded.stages_json, locations_json = excluded.locations_json, portfolio_startup_ids_json = excluded.portfolio_startup_ids_json, profile_data_json = excluded.profile_data_json, onboarding_complete = 1, updated_at = excluded.updated_at"
  ).bind(
    account.id,
    account.email,
    account.displayName,
    account.role,
    account.headline,
    account.company,
    account.bio,
    account.avatarColor,
    JSON.stringify(account.sectors),
    JSON.stringify(account.stages),
    JSON.stringify(account.locations),
    JSON.stringify(account.portfolioStartupIds),
    JSON.stringify(account.role === "founder" ? startupIntelligence.find((item) => item.founderProfileId === account.id) : investorIntelligence.find((item) => item.profileId === account.id)),
    now,
    now,
  ).run();

  if (account.role === "founder") {
    const startup = startupIntelligence.find((item) => item.founderProfileId === account.id);
    await d1.prepare(
      "INSERT INTO startups (id, owner_profile_id, name, sector, stage, location, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET owner_profile_id = excluded.owner_profile_id, name = excluded.name, sector = excluded.sector, stage = excluded.stage, location = excluded.location, description = excluded.description"
    ).bind(
      startup?.startupId ?? `member-${account.id}`,
      account.id,
      startup?.name ?? account.company,
      startup?.sector ?? account.sectors[0] ?? "Other",
      startup?.stage ?? account.stages[0] ?? "Pre-seed",
      startup?.location ?? account.locations[0] ?? "India",
      account.bio,
      now,
    ).run();
  } else {
    const firstSlot = nextAvailabilityAt();
    await d1.batch([0, 2, 7].map((dayOffset, index) => {
      const startsAt = firstSlot + dayOffset * 86_400_000 + index * 3_600_000;
      return d1.prepare("INSERT OR IGNORE INTO availability_slots (id, investor_profile_id, starts_at, ends_at, status) VALUES (?, ?, ?, ?, 'open')")
        .bind(`demo-account-slot-${startsAt}-${account.id}`, account.id, startsAt, startsAt + 30 * 60_000);
    }));
  }

  const token = `${crypto.randomUUID().replaceAll("-", "")}${crypto.randomUUID().replaceAll("-", "")}`;
  const tokenHash = await hashDemoToken(token);
  const expiresAt = now + DEMO_SESSION_SECONDS * 1000;
  await d1.prepare("DELETE FROM demo_sessions WHERE expires_at <= ?").bind(now).run();
  await d1.prepare("INSERT INTO demo_sessions (token_hash, profile_id, expires_at, created_at) VALUES (?, ?, ?, ?)")
    .bind(tokenHash, account.id, expiresAt, now)
    .run();

  return { token, expiresAt };
}

export async function deleteDemoSession(token: string | null) {
  if (!token) return;
  await ensureDatabase();
  await getD1().prepare("DELETE FROM demo_sessions WHERE token_hash = ?")
    .bind(await hashDemoToken(token))
    .run();
}

export async function hashDemoToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function readCookie(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return null;
  for (const pair of cookieHeader.split(";")) {
    const [rawName, ...rest] = pair.trim().split("=");
    if (rawName === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export function demoSessionCookie(token: string, secure: boolean) {
  return `${DEMO_SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${DEMO_SESSION_SECONDS}${secure ? "; Secure" : ""}`;
}

export function clearDemoSessionCookie(secure: boolean) {
  return `${DEMO_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`;
}

function nextAvailabilityAt() {
  const value = new Date();
  value.setUTCDate(value.getUTCDate() + 3);
  value.setUTCHours(10, 30, 0, 0);
  return value.getTime();
}
