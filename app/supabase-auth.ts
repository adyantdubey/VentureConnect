import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";

export type SupabaseIdentity = {
  userId: string;
  displayName: string;
  email: string;
  fullName: string | null;
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

  return {
    userId: `supabase:${user.id}`,
    email: user.email,
    displayName,
    fullName: metadataName?.trim() ?? null,
  };
}
