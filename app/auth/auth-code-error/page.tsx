import Link from "next/link";

export default function AuthCodeErrorPage() {
  return (
    <main className="space-page flex min-h-screen items-center justify-center px-4 py-10">
      <section className="space-window w-full max-w-xl rounded-[28px] p-7 sm:p-9">
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--mauve)]">Sign-in failed</p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.02em] text-[var(--space-950)] sm:text-4xl">
          Google could not complete this session.
        </h1>
        <p className="mt-4 max-w-lg text-sm leading-7 text-[var(--space-900)]">
          The auth code was missing, expired, or rejected by Supabase. Start the Google sign-in flow again from OpenChat.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-full bg-[var(--violet-500)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--violet-400)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--violet-300)]"
        >
          Return to OpenChat
        </Link>
      </section>
    </main>
  );
}
