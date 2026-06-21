import "server-only";

import { createClient, hasSupabaseServerConfig } from "@/utils/supabase/server";

export type CurrentUser = {
  id: string;
  email: string | null;
  name: string;
  avatarUrl: string | null;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (!hasSupabaseServerConfig) return null;

  const supabase = createClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  return {
    id: user.id,
    email: user.email ?? null,
    name: String(user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email ?? "OpenChat user"),
    avatarUrl: typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null
  };
}
