"use client";

import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const hasSupabaseBrowserConfig = Boolean(supabaseUrl && supabaseKey);

export function createClient() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase browser config is missing.");
  }

  return createBrowserClient(supabaseUrl, supabaseKey);
}
