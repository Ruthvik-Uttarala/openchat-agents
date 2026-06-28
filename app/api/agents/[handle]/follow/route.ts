import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { createRequestContext, ensureAllowedOrigin, jsonWithRequestContext, logServerEvent } from "@/lib/request";
import { getViewerProfile } from "@/lib/session";
import { createClient, hasSupabaseServerConfig } from "@/utils/supabase/server";

async function resolveAgent(handle: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("agent_profiles").select("id, handle").eq("handle", handle).maybeSingle();
  return data as { id: string; handle: string } | null;
}

type RouteContext = {
  params: Promise<{ handle: string }>;
};

export async function POST(request: NextRequest, { params }: RouteContext) {
  const context = createRequestContext(request, "follow-agent");

  if (!hasSupabaseServerConfig) {
    return jsonWithRequestContext({ error: "Following requires Supabase configuration." }, context, { status: 503 });
  }

  if (!ensureAllowedOrigin(request)) {
    return jsonWithRequestContext({ error: "Origin is not allowed." }, context, { status: 403 });
  }

  const viewer = await getViewerProfile();
  if (!viewer) {
    return jsonWithRequestContext({ error: "Sign in before following agents." }, context, { status: 401 });
  }

  const { handle } = await params;
  const agent = await resolveAgent(handle);
  if (!agent) {
    return jsonWithRequestContext({ error: "Agent not found." }, context, { status: 404 });
  }

  const supabase = await createClient();
  const { error } = await supabase.from("follows").insert({
    follower_profile_id: viewer.profileId,
    followed_agent_id: agent.id
  });

  if (error && !error.message.toLowerCase().includes("duplicate")) {
    logServerEvent("warn", context, "follow failed", { handle, error: error.message });
    return jsonWithRequestContext({ error: error.message }, context, { status: 400 });
  }

  revalidateTag("public-feed");
  revalidateTag("public-agents");
  revalidatePath("/");
  revalidatePath(`/agent/${agent.handle}`);

  return jsonWithRequestContext({ ok: true }, context);
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const context = createRequestContext(request, "unfollow-agent");

  if (!hasSupabaseServerConfig) {
    return jsonWithRequestContext({ error: "Following requires Supabase configuration." }, context, { status: 503 });
  }

  if (!ensureAllowedOrigin(request)) {
    return jsonWithRequestContext({ error: "Origin is not allowed." }, context, { status: 403 });
  }

  const viewer = await getViewerProfile();
  if (!viewer) {
    return jsonWithRequestContext({ error: "Sign in before following agents." }, context, { status: 401 });
  }

  const { handle } = await params;
  const agent = await resolveAgent(handle);
  if (!agent) {
    return jsonWithRequestContext({ error: "Agent not found." }, context, { status: 404 });
  }

  const supabase = await createClient();
  const { error } = await supabase.from("follows").delete().eq("follower_profile_id", viewer.profileId).eq("followed_agent_id", agent.id);
  if (error) {
    logServerEvent("warn", context, "unfollow failed", { handle, error: error.message });
    return jsonWithRequestContext({ error: error.message }, context, { status: 400 });
  }

  revalidateTag("public-feed");
  revalidateTag("public-agents");
  revalidatePath("/");
  revalidatePath(`/agent/${agent.handle}`);

  return jsonWithRequestContext({ ok: true }, context);
}
