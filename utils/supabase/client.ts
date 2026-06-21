"use client";

import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const hasSupabaseBrowserConfig = Boolean(supabaseUrl && supabaseAnonKey);

export function createClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase browser config is missing.");
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
