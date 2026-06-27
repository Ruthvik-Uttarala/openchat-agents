import { NextResponse } from "next/server";
import { getAgentData } from "@/lib/data";

export const revalidate = 60;

export async function GET(_: Request, { params }: { params: { handle: string } }) {
  const { agent, posts, mode, warning } = await getAgentData(params.handle, { includeViewer: false });

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
