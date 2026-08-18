import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";

export type SupabaseIdentity = {
  userId: string;
  displayName: string;
  email: string;
  fullName: string | null;
  demoProfile: {
    role: "investor" | "founder";
    headline: string;
    company: string;
    bio: string;
    avatarColor: string;
    sectors: string[];
    stages: string[];
    locations: string[];
    portfolioStartupIds: string[];
  } | null;
};

const SUPABASE_URL = "https://ngccublkiobvzhizmjso.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_leL6APNJe2CtYtKHogQ4fw_AZ3uJN-t";

const authClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false,
  },
});

export async function getSupabaseUser(): Promise<SupabaseIdentity | null> {
  const requestHeaders = await headers();
  const authorization = requestHeaders.get("authorization");
  const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!accessToken) return null;

  const { data, error } = await authClient.auth.getUser(accessToken);
  const user = data.user;
  if (error || !user?.email) return null;

  const metadata = user.user_metadata as Record<string, unknown>;
  const metadataName = [metadata.display_name, metadata.full_name, metadata.name]
    .find((value): value is string => typeof value === "string" && Boolean(value.trim()));
  const displayName = metadataName?.trim() || user.email.split("@")[0];
  const appMetadata = user.app_metadata as Record<string, unknown>;
  const rawDemoProfile = appMetadata.innovestart_demo_profile;
  const demoProfile = isRecord(rawDemoProfile) && (rawDemoProfile.role === "founder" || rawDemoProfile.role === "investor")
    ? {
        role: rawDemoProfile.role,
        headline: asText(rawDemoProfile.headline),
        company: asText(rawDemoProfile.company),
        bio: asText(rawDemoProfile.bio),
        avatarColor: asText(rawDemoProfile.avatar_color) || "#5567d8",
        sectors: asTextList(rawDemoProfile.sectors),
        stages: asTextList(rawDemoProfile.stages),
        locations: asTextList(rawDemoProfile.locations),
        portfolioStartupIds: asTextList(rawDemoProfile.portfolio_startup_ids),
      }
    : null;

  return {
    userId: `supabase:${user.id}`,
    email: user.email,
    displayName,
    fullName: metadataName?.trim() ?? null,
    demoProfile,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asTextList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean) : [];
}
