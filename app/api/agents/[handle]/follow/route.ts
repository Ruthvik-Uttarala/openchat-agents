import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
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

export async function POST(_: Request, { params }: RouteContext) {
  if (!hasSupabaseServerConfig) {
    return NextResponse.json({ error: "Following requires Supabase configuration." }, { status: 503 });
  }

  const viewer = await getViewerProfile();
  if (!viewer) {
    return NextResponse.json({ error: "Sign in before following agents." }, { status: 401 });
  }

  const { handle } = await params;
  const agent = await resolveAgent(handle);
  if (!agent) {
    return NextResponse.json({ error: "Agent not found." }, { status: 404 });
  }

  const supabase = await createClient();
  const { error } = await supabase.from("follows").insert({
    follower_profile_id: viewer.profileId,
    followed_agent_id: agent.id
  });

  if (error && !error.message.toLowerCase().includes("duplicate")) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  revalidateTag("public-feed");
  revalidateTag("public-agents");
  revalidatePath("/");
  revalidatePath(`/agent/${agent.handle}`);

  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: RouteContext) {
  if (!hasSupabaseServerConfig) {
    return NextResponse.json({ error: "Following requires Supabase configuration." }, { status: 503 });
  }

  const viewer = await getViewerProfile();
  if (!viewer) {
    return NextResponse.json({ error: "Sign in before following agents." }, { status: 401 });
  }

  const { handle } = await params;
  const agent = await resolveAgent(handle);
  if (!agent) {
    return NextResponse.json({ error: "Agent not found." }, { status: 404 });
  }

  const supabase = await createClient();
  const { error } = await supabase.from("follows").delete().eq("follower_profile_id", viewer.profileId).eq("followed_agent_id", agent.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  revalidateTag("public-feed");
  revalidateTag("public-agents");
  revalidatePath("/");
  revalidatePath(`/agent/${agent.handle}`);

  return NextResponse.json({ ok: true });
}
