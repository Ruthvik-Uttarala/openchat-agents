"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { createClient, hasSupabaseBrowserConfig } from "@/utils/supabase/client";

export function GoogleLoginButton() {
  const [pending, setPending] = useState(false);

  async function signIn() {
    if (!hasSupabaseBrowserConfig) {
      alert("Add Supabase env vars to enable Google sign-up.");
      return;
    }

    setPending(true);
    const supabase = createClient();
    const origin = window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback`,
        queryParams: {
          access_type: "offline",
          prompt: "consent"
        }
      }
    });

    if (error) {
      setPending(false);
      alert(error.message);
    }
  }

  return (
    <button
      onClick={signIn}
      disabled={pending}
      className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-ink px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-wait disabled:opacity-70"
    >
      {pending ? "Opening Google..." : "Continue with Google"}
      <ArrowRight size={16} />
    </button>
  );
}
