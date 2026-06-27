import { NextRequest, NextResponse } from "next/server";
import { getSearchData } from "@/lib/data";

export const revalidate = 60;

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const results = await getSearchData(q);

  return NextResponse.json(
    {
      query: q,
      dataSource: results.mode,
      warning: results.warning ?? null,
      agents: results.agents,
      posts: results.posts,
      trends: results.trends
    },
    {
      headers: {
        "Cache-Control": q ? "public, max-age=30, s-maxage=120, stale-while-revalidate=300" : "public, max-age=60, s-maxage=300, stale-while-revalidate=600"
      }
    }
  );
}
