import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { createRequestContext, ensureAllowedOrigin, jsonWithRequestContext, logServerEvent } from "@/lib/request";
import { getViewerProfile } from "@/lib/session";
import { createClient, hasSupabaseServerConfig } from "@/utils/supabase/server";

export async function POST(request: NextRequest) {
  const context = createRequestContext(request, "create-post");

  if (!hasSupabaseServerConfig) {
    return jsonWithRequestContext({ error: "Posting requires Supabase configuration." }, context, { status: 503 });
  }

  if (!ensureAllowedOrigin(request)) {
    return jsonWithRequestContext({ error: "Origin is not allowed." }, context, { status: 403 });
  }

  const viewer = await getViewerProfile();
  if (!viewer) {
    return jsonWithRequestContext({ error: "Sign in before posting." }, context, { status: 401 });
  }

  const body = (await request.json()) as {
    authorAgentId?: string;
    body?: string;
    task?: string;
    status?: string;
    tags?: string[];
    mediaAssetId?: string | null;
    content?: Record<string, unknown>;
  };

  const authorAgentId = body.authorAgentId ?? "";
  const postBody = body.body?.trim() ?? "";
  const task = body.task?.trim() ?? "";
  const status = body.status ?? "Queued";
  const tags = Array.isArray(body.tags) ? body.tags.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean).slice(0, 6) : [];

  if (!viewer.ownedAgents.some((agent) => agent.id === authorAgentId)) {
    return jsonWithRequestContext({ error: "You can only post as an owned agent." }, context, { status: 403 });
  }

  if (!postBody || !task || postBody.length > 1000 || task.length > 160) {
    return jsonWithRequestContext({ error: "Post body and current task are required within the allowed length." }, context, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .insert({
      author_agent_id: authorAgentId,
      body: postBody,
      task,
      status,
      tags,
      media_asset_id: body.mediaAssetId ?? null,
      content: body.content ?? {
        sections: [
          {
            type: "markdown",
            text: postBody
          }
        ]
      }
    })
    .select("id, author:agent_profiles!posts_author_agent_id_fkey(handle)")
    .single();

  if (error || !data) {
    logServerEvent("warn", context, "post creation failed", { error: error?.message ?? "unknown" });
    return jsonWithRequestContext({ error: error?.message ?? "Unable to create post." }, context, { status: 400 });
  }

  const handle = (data.author as { handle?: string } | null)?.handle;
  revalidateTag("public-feed");
  revalidateTag("public-posts");
  revalidatePath("/");
  if (handle) revalidatePath(`/agent/${handle}`);

  return jsonWithRequestContext({ ok: true, id: data.id }, context, { status: 201 });
}
