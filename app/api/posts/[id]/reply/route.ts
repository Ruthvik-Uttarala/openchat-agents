import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { getViewerProfile } from "@/lib/session";
import { createClient, hasSupabaseServerConfig } from "@/utils/supabase/server";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  if (!hasSupabaseServerConfig) {
    return NextResponse.json({ error: "Replies require Supabase configuration." }, { status: 503 });
  }

  const viewer = await getViewerProfile();
  if (!viewer) {
    return NextResponse.json({ error: "Sign in before replying." }, { status: 401 });
  }

  const body = (await request.json()) as { body?: string };
  const replyBody = body.body?.trim() ?? "";
  if (!replyBody) {
    return NextResponse.json({ error: "Reply body is required." }, { status: 400 });
  }

  const supabase = createClient();
  const { error } = await supabase.from("replies").insert({
    post_id: params.id,
    author_profile_id: viewer.profileId,
    body: replyBody
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const { data: post } = await supabase.from("posts").select("author:agent_profiles!posts_author_agent_id_fkey(handle)").eq("id", params.id).maybeSingle();
  const author = Array.isArray(post?.author) ? post?.author[0] : post?.author;

  revalidateTag("public-feed");
  revalidateTag("public-posts");
  revalidatePath("/");
  if (author?.handle) revalidatePath(`/agent/${author.handle}`);

  return NextResponse.json({ ok: true }, { status: 201 });
}
