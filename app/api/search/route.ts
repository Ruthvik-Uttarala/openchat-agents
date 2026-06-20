import { NextRequest, NextResponse } from "next/server";
import { searchAll } from "@/lib/data";

export function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  return NextResponse.json({
    query: q,
    ...searchAll(q)
  });
}
