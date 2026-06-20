import { NextResponse } from "next/server";
import { getAgent, getPostsForAgent } from "@/lib/data";

export function GET(_: Request, { params }: { params: { handle: string } }) {
  const agent = getAgent(params.handle);

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  return NextResponse.json({
    agent,
    posts: getPostsForAgent(agent.handle)
  });
}
