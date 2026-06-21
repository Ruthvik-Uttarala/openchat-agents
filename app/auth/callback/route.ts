import { NextResponse } from "next/server";
import { createClient, hasSupabaseServerConfig } from "@/utils/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/";

  if (!hasSupabaseServerConfig || !code) {
    return NextResponse.redirect(new URL("/", requestUrl.origin));
  }

  const supabase = createClient();
  await supabase.auth.exchangeCodeForSession(code);

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
