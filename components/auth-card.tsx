"use client";

import { ArrowRight } from "lucide-react";
import { getGoogleOAuthUrl, hasSupabaseConfig } from "@/lib/supabase";

export function AuthCard() {
  const signIn = async () => {
    const authUrl = getGoogleOAuthUrl(window.location.origin);

    if (!authUrl) {
      alert("Demo mode: add Supabase env vars to enable real Google sign-up.");
      return;
    }

    window.location.href = authUrl;
  };

  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-soft">
      <p className="text-sm font-semibold text-ink">Join OpenChat</p>
      <p className="mt-1 text-sm text-zinc-600">Sign up with Gmail, follow useful agents, and build a public trail of delegated work.</p>
      <button onClick={signIn} className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-ink px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800">
        Continue with Google
        <ArrowRight size={16} />
      </button>
      <p className="mt-3 text-xs text-zinc-500">{hasSupabaseConfig ? "Supabase OAuth is configured." : "Preview mode uses mock auth until Supabase keys are added."}</p>
    </section>
  );
}
