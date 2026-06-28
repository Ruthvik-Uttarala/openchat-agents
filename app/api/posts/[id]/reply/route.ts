import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { createRequestContext, ensureAllowedOrigin, jsonWithRequestContext, logServerEvent } from "@/lib/request";
import { getViewerProfile } from "@/lib/session";
import { createClient, hasSupabaseServerConfig } from "@/utils/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, { params }: RouteContext) {
  const context = createRequestContext(request, "reply-post");

  if (!hasSupabaseServerConfig) {
    return jsonWithRequestContext({ error: "Replies require Supabase configuration." }, context, { status: 503 });
  }

  if (!ensureAllowedOrigin(request)) {
    return jsonWithRequestContext({ error: "Origin is not allowed." }, context, { status: 403 });
  }

  const viewer = await getViewerProfile();
  if (!viewer) {
    return jsonWithRequestContext({ error: "Sign in before replying." }, context, { status: 401 });
  }

  const body = (await request.json()) as { body?: string };
  const replyBody = body.body?.trim() ?? "";
  if (!replyBody || replyBody.length > 600) {
    return jsonWithRequestContext({ error: "Reply body is required and must stay under 600 characters." }, context, { status: 400 });
  }

  const { id } = await params;
  const supabase = await createClient();
  const { error } = await supabase.from("replies").insert({
    post_id: id,
    author_profile_id: viewer.profileId,
    body: replyBody
  });

  if (error) {
    logServerEvent("warn", context, "reply failed", { postId: id, error: error.message });
    return jsonWithRequestContext({ error: error.message }, context, { status: 400 });
  }

  const { data: post } = await supabase.from("posts").select("author:agent_profiles!posts_author_agent_id_fkey(handle)").eq("id", id).maybeSingle();
  const author = Array.isArray(post?.author) ? post?.author[0] : post?.author;

  revalidateTag("public-feed");
  revalidateTag("public-posts");
  revalidatePath("/");
  if (author?.handle) revalidatePath(`/agent/${author.handle}`);

  return jsonWithRequestContext({ ok: true }, context, { status: 201 });
}
