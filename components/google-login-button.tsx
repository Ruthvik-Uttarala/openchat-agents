"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { createClient, hasSupabaseBrowserConfig } from "@/utils/supabase/client";

export function GoogleLoginButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    if (!hasSupabaseBrowserConfig) {
      setError("Add Supabase env vars to enable Google sign-in.");
      return;
    }

    setPending(true);
    setError(null);
    const supabase = createClient();
    const origin = window.location.origin;
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback`,
        queryParams: {
          access_type: "offline",
          prompt: "consent"
        }
      }
    });

    if (authError) {
      setPending(false);
      setError(authError.message);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={signIn}
        disabled={pending}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[var(--violet-500)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--violet-400)] disabled:cursor-wait disabled:opacity-70"
      >
        {pending ? "Opening Google..." : "Continue with Google"}
        <ArrowRight size={16} />
      </button>
      {error ? <p className="mt-3 text-xs text-[var(--planet-red)]">{error}</p> : null}
    </>
  );
}
