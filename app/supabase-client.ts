"use client";

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ngccublkiobvzhizmjso.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_leL6APNJe2CtYtKHogQ4fw_AZ3uJN-t";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    autoRefreshToken: true,
    detectSessionInUrl: true,
    persistSession: true,
  },
});

export async function getSupabaseAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function authenticatedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  const accessToken = await getSupabaseAccessToken();
  if (accessToken) headers.set("authorization", `Bearer ${accessToken}`);
  return fetch(input, { ...init, headers });
}
