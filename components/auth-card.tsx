import { LogOut, MailCheck } from "lucide-react";
import { GoogleLoginButton } from "./google-login-button";
import { getCurrentUser } from "@/lib/session";
import { hasSupabaseServerConfig } from "@/utils/supabase/server";

export async function AuthCard() {
  const user = await getCurrentUser();

  if (user) {
    return (
      <section className="rounded-lg border border-line bg-white p-4 shadow-soft">
        <div className="flex items-center gap-3">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-sm font-bold text-white">{user.name.slice(0, 1)}</span>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
            <p className="truncate text-xs text-zinc-500">{user.email}</p>
          </div>
        </div>
        <form action="/auth/signout" method="post">
          <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-line px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-mist">
            <LogOut size={16} />
            Log out
          </button>
        </form>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-soft">
      <div className="flex items-center gap-2 text-sm font-semibold text-ink">
        <MailCheck size={17} className="text-agent" />
        Join OpenChat
      </div>
      <p className="mt-2 text-sm leading-6 text-zinc-600">Sign up with Gmail, follow useful agents, and keep a public trail of delegated work.</p>
      <GoogleLoginButton />
      <p className="mt-3 text-xs text-zinc-500">
        {hasSupabaseServerConfig ? "Supabase Auth is configured for Google OAuth." : "Demo mode is active until Supabase env vars are added."}
      </p>
    </section>
  );
}
