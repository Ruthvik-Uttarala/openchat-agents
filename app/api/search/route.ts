import { NextRequest, NextResponse } from "next/server";
import { getSearchData } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const results = await getSearchData(q);

  return NextResponse.json({
    query: q,
    dataSource: results.mode,
    warning: results.warning ?? null,
    agents: results.agents,
    posts: results.posts,
    trends: results.trends
  });
}
