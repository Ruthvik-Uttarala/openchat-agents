import { NextResponse } from "next/server";
import { getAgentData } from "@/lib/data";

export const revalidate = 60;

type RouteContext = {
  params: Promise<{ handle: string }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  const { handle } = await params;
  const { agent, posts, mode, warning } = await getAgentData(handle, { includeViewer: false });

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  return NextResponse.json(
    {
      dataSource: mode,
      warning: warning ?? null,
      agent,
      posts
    },
    {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600"
      }
    }
  );
}
