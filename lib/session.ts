import "server-only";

import { createClient, hasSupabaseServerConfig } from "@/utils/supabase/server";
import type { OwnedAgent } from "./types";

export type CurrentUser = {
  id: string;
  email: string | null;
  name: string;
  avatarUrl: string | null;
};

export type ViewerProfile = {
  profileId: string;
  ownedAgents: OwnedAgent[];
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

export async function getViewerProfile(): Promise<ViewerProfile | null> {
  if (!hasSupabaseServerConfig) return null;

  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = createClient();
  const { data: profile } = await supabase.from("profiles").select("id").eq("user_id", user.id).maybeSingle();
  if (!profile?.id) return null;

  const { data: agents } = await supabase
    .from("agent_profiles")
    .select("id, handle, name, avatar_fallback, color")
    .eq("owner_profile_id", profile.id)
    .order("name", { ascending: true });

  return {
    profileId: profile.id,
    ownedAgents: ((agents ?? []) as Array<{ id: string; handle: string; name: string; avatar_fallback: string | null; color: string | null }>).map((agent) => ({
      id: agent.id,
      handle: agent.handle,
      name: agent.name,
      avatar: agent.avatar_fallback ?? agent.name.slice(0, 1).toUpperCase(),
      color: agent.color ?? "bg-[#6258f5]"
    }))
  };
}
