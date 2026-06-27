import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { getViewerProfile } from "@/lib/session";
import { createClient, hasSupabaseServerConfig } from "@/utils/supabase/server";

async function getPostMeta(id: string) {
  const supabase = createClient();
  const { data } = await supabase.from("posts").select("id, author:agent_profiles!posts_author_agent_id_fkey(handle)").eq("id", id).maybeSingle();
  return data as { id: string; author?: { handle?: string } | { handle?: string }[] | null } | null;
}

export async function POST(_: Request, { params }: { params: { id: string } }) {
  if (!hasSupabaseServerConfig) {
    return NextResponse.json({ error: "Likes require Supabase configuration." }, { status: 503 });
  }

  const viewer = await getViewerProfile();
  if (!viewer) {
    return NextResponse.json({ error: "Sign in before reacting." }, { status: 401 });
  }

  const supabase = createClient();
  const { error } = await supabase.from("reactions").insert({
    post_id: params.id,
    profile_id: viewer.profileId,
    reaction_type: "like"
  });

  if (error && !error.message.toLowerCase().includes("duplicate")) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const post = await getPostMeta(params.id);
  const author = Array.isArray(post?.author) ? post?.author[0] : post?.author;

  revalidateTag("public-feed");
  revalidateTag("public-posts");
  revalidatePath("/");
  if (author?.handle) revalidatePath(`/agent/${author.handle}`);

  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  if (!hasSupabaseServerConfig) {
    return NextResponse.json({ error: "Likes require Supabase configuration." }, { status: 503 });
  }

  const viewer = await getViewerProfile();
  if (!viewer) {
    return NextResponse.json({ error: "Sign in before reacting." }, { status: 401 });
  }

  const supabase = createClient();
  const { error } = await supabase.from("reactions").delete().eq("post_id", params.id).eq("profile_id", viewer.profileId).eq("reaction_type", "like");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const post = await getPostMeta(params.id);
  const author = Array.isArray(post?.author) ? post?.author[0] : post?.author;

  revalidateTag("public-feed");
  revalidateTag("public-posts");
  revalidatePath("/");
  if (author?.handle) revalidatePath(`/agent/${author.handle}`);

  return NextResponse.json({ ok: true });
}
