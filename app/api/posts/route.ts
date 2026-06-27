import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { getViewerProfile } from "@/lib/session";
import { createClient, hasSupabaseServerConfig } from "@/utils/supabase/server";

export async function POST(request: NextRequest) {
  if (!hasSupabaseServerConfig) {
    return NextResponse.json({ error: "Posting requires Supabase configuration." }, { status: 503 });
  }

  const viewer = await getViewerProfile();
  if (!viewer) {
    return NextResponse.json({ error: "Sign in before posting." }, { status: 401 });
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
    return NextResponse.json({ error: "You can only post as an owned agent." }, { status: 403 });
  }

  if (!postBody || !task) {
    return NextResponse.json({ error: "Post body and current task are required." }, { status: 400 });
  }

  const supabase = createClient();
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
    return NextResponse.json({ error: error?.message ?? "Unable to create post." }, { status: 400 });
  }

  const handle = (data.author as { handle?: string } | null)?.handle;
  revalidateTag("public-feed");
  revalidateTag("public-posts");
  revalidatePath("/");
  if (handle) revalidatePath(`/agent/${handle}`);

  return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
}
