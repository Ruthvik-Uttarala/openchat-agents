import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { createRequestContext, ensureAllowedOrigin, jsonWithRequestContext, logServerEvent } from "@/lib/request";
import { getViewerProfile } from "@/lib/session";
import { createClient, hasSupabaseServerConfig } from "@/utils/supabase/server";

async function getPostMeta(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("posts").select("id, author:agent_profiles!posts_author_agent_id_fkey(handle)").eq("id", id).maybeSingle();
  return data as { id: string; author?: { handle?: string } | { handle?: string }[] | null } | null;
}

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, { params }: RouteContext) {
  const context = createRequestContext(request, "repost-post");

  if (!hasSupabaseServerConfig) {
    return jsonWithRequestContext({ error: "Reposts require Supabase configuration." }, context, { status: 503 });
  }

  if (!ensureAllowedOrigin(request)) {
    return jsonWithRequestContext({ error: "Origin is not allowed." }, context, { status: 403 });
  }

  const viewer = await getViewerProfile();
  if (!viewer) {
    return jsonWithRequestContext({ error: "Sign in before reposting." }, context, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createClient();
  const { error } = await supabase.from("reactions").insert({
    post_id: id,
    profile_id: viewer.profileId,
    reaction_type: "repost"
  });

  if (error && !error.message.toLowerCase().includes("duplicate")) {
    logServerEvent("warn", context, "repost failed", { postId: id, error: error.message });
    return jsonWithRequestContext({ error: error.message }, context, { status: 400 });
  }

  const post = await getPostMeta(id);
  const author = Array.isArray(post?.author) ? post?.author[0] : post?.author;
  revalidateTag("public-feed");
  revalidateTag("public-posts");
  revalidatePath("/");
  if (author?.handle) revalidatePath(`/agent/${author.handle}`);

  return jsonWithRequestContext({ ok: true }, context);
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const context = createRequestContext(request, "unrepost-post");

  if (!hasSupabaseServerConfig) {
    return jsonWithRequestContext({ error: "Reposts require Supabase configuration." }, context, { status: 503 });
  }

  if (!ensureAllowedOrigin(request)) {
    return jsonWithRequestContext({ error: "Origin is not allowed." }, context, { status: 403 });
  }

  const viewer = await getViewerProfile();
  if (!viewer) {
    return jsonWithRequestContext({ error: "Sign in before reposting." }, context, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createClient();
  const { error } = await supabase.from("reactions").delete().eq("post_id", id).eq("profile_id", viewer.profileId).eq("reaction_type", "repost");
  if (error) {
    logServerEvent("warn", context, "unrepost failed", { postId: id, error: error.message });
    return jsonWithRequestContext({ error: error.message }, context, { status: 400 });
  }

  const post = await getPostMeta(id);
  const author = Array.isArray(post?.author) ? post?.author[0] : post?.author;
  revalidateTag("public-feed");
  revalidateTag("public-posts");
  revalidatePath("/");
  if (author?.handle) revalidatePath(`/agent/${author.handle}`);

  return jsonWithRequestContext({ ok: true }, context);
}
