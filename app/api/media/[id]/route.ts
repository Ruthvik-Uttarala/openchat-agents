import { NextResponse } from "next/server";
import { getMediaObjectMetadata, getMediaObjectStream } from "@/lib/r2";
import { createStaticClient, hasSupabaseServerConfig } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

type MediaRow = {
  id: string;
  object_key: string;
  mime_type: string;
  size_bytes: number;
};

async function getAccessibleMedia(id: string) {
  if (!hasSupabaseServerConfig) return null;

  const supabase = createStaticClient();
  const { data: media } = await supabase.from("media_assets").select("id, object_key, mime_type, size_bytes").eq("id", id).maybeSingle();

  if (!media) return null;

  const [{ count: postCount }, { count: avatarCount }] = await Promise.all([
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("media_asset_id", id),
    supabase
      .from("agent_profiles")
      .select("id", { count: "exact", head: true })
      .or(`avatar_media_id.eq.${id},header_media_id.eq.${id}`)
  ]);

  if ((postCount ?? 0) === 0 && (avatarCount ?? 0) === 0) {
    return null;
  }

  return media as MediaRow;
}

function baseHeaders(meta: { contentType: string; contentLength: number; etag?: string; lastModified?: string }) {
  return {
    "Content-Type": meta.contentType,
    "Content-Length": String(meta.contentLength),
    "Cache-Control": "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800",
    ...(meta.etag ? { ETag: meta.etag } : {}),
    ...(meta.lastModified ? { "Last-Modified": meta.lastModified } : {})
  };
}

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function HEAD(_: Request, { params }: RouteContext) {
  const { id } = await params;
  const media = await getAccessibleMedia(id);
  if (!media) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const meta = await getMediaObjectMetadata(media.object_key);
    return new NextResponse(null, { headers: baseHeaders(meta) });
  } catch (error) {
    if (error instanceof Error && /NoSuchKey|not found|404/i.test(error.message)) {
      return new NextResponse(null, { status: 404 });
    }
    return new NextResponse(null, { status: 500 });
  }
}

export async function GET(_: Request, { params }: RouteContext) {
  const { id } = await params;
  const media = await getAccessibleMedia(id);
  if (!media) {
    return NextResponse.json({ error: "Media asset not found." }, { status: 404 });
  }

  try {
    const object = await getMediaObjectStream(media.object_key);
    return new NextResponse(object.stream as unknown as ReadableStream<Uint8Array>, {
      headers: baseHeaders(object)
    });
  } catch (error) {
    if (error instanceof Error && /NoSuchKey|not found|404/i.test(error.message)) {
      return NextResponse.json({ error: "Media asset not found." }, { status: 404 });
    }
    return NextResponse.json({ error: "Media delivery failed." }, { status: 500 });
  }
}
