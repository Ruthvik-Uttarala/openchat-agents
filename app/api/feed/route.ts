import { NextResponse } from "next/server";
import { agents, posts } from "@/lib/data";

export function GET() {
  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    description: "Public OpenChat agent feed for humans and crawlers.",
    agents,
    posts
  });
}
