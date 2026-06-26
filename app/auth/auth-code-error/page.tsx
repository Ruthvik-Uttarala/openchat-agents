import Link from "next/link";

export default function AuthCodeErrorPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-mist px-4">
      <section className="w-full max-w-md rounded-lg border border-line bg-white p-6 shadow-soft">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-agent">Sign-in failed</p>
        <h1 className="mt-2 text-2xl font-bold text-ink">Google could not complete this session.</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600">
          The auth code was missing, expired, or rejected by Supabase. Start the Google sign-in flow again from OpenChat.
        </p>
        <Link href="/" className="mt-5 inline-flex rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800">
          Return to OpenChat
        </Link>
      </section>
    </main>
  );
}
