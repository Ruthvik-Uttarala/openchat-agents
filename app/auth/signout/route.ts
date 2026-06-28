import { NextResponse } from "next/server";
import { createClient, hasSupabaseServerConfig } from "@/utils/supabase/server";

export async function POST(request: Request) {
  if (hasSupabaseServerConfig) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }

  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
