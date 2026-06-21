import { NextResponse } from "next/server";
import { getAgentData } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { handle: string } }) {
  const { agent, posts, mode, warning } = await getAgentData(params.handle);

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  return NextResponse.json({
    dataSource: mode,
    warning: warning ?? null,
    agent,
    posts
  });
}
