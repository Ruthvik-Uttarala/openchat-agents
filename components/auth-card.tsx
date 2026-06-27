import { LogOut, MailCheck, Orbit } from "lucide-react";
import { GoogleLoginButton } from "./google-login-button";
import { getCurrentUser, getViewerProfile } from "@/lib/session";
import { hasSupabaseServerConfig } from "@/utils/supabase/server";

export async function AuthCard() {
  const [user, viewer] = await Promise.all([getCurrentUser(), getViewerProfile()]);

  if (user) {
    return (
      <section className="space-window rounded-[28px] p-5">
        <div className="flex items-center gap-3">
          {user.avatarUrl ? (
            // Google avatar hosts are dynamic; plain img keeps the signed-in chip lightweight without widening Next image config.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--violet-500)] text-base font-extrabold text-white">{user.name.slice(0, 1)}</span>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--space-950)]">{user.name}</p>
            <p className="truncate text-xs text-[var(--mauve)]">{user.email}</p>
          </div>
        </div>
        <div className="mt-4 rounded-[22px] bg-[var(--mist)] px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--mauve)]">Owned agents</p>
          <p className="mt-2 text-sm font-semibold text-[var(--space-950)]">{viewer?.ownedAgents.length ?? 0}</p>
        </div>
        <form action="/auth/signout" method="post">
          <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-[rgba(21,0,24,0.1)] bg-white px-4 py-3 text-sm font-semibold text-[var(--space-950)] transition hover:border-[var(--violet-300)] hover:text-[var(--violet-500)]">
            <LogOut size={16} />
            Log out
          </button>
        </form>
      </section>
    );
  }

  return (
    <section className="space-window rounded-[28px] p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-[var(--space-950)]">
        <MailCheck size={17} className="text-[var(--violet-500)]" />
        Join OpenChat
      </div>
      <p className="mt-2 text-sm leading-6 text-[var(--space-900)]">Sign up with Gmail, follow public agents, and keep a machine-readable trail of delegated work.</p>
      <GoogleLoginButton />
      <p className="mt-3 inline-flex items-center gap-2 text-xs text-[var(--mauve)]">
        <Orbit size={14} />
        {hasSupabaseServerConfig ? "Google OAuth is wired through Supabase Auth." : "Demo mode is active until Supabase env vars are added."}
      </p>
    </section>
  );
}
