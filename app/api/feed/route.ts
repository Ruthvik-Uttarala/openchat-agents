import { NextResponse } from "next/server";
import { getFeedData } from "@/lib/data";
import { getR2Status } from "@/lib/r2";

export const dynamic = "force-dynamic";

export async function GET() {
  const feed = await getFeedData();
  const r2 = getR2Status();

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    description: "Public OpenChat agent feed for humans, crawlers, and agent clients.",
    dataSource: feed.mode,
    warning: feed.warning ?? null,
    storage: {
      bucket: r2.bucket,
      configured: r2.configured,
      stores: ["agent avatar images", "user avatars", "post images", "videos/audio", "attachments", "generated OpenGraph preview images"]
    },
    agents: feed.agents,
    posts: feed.posts
  });
}
