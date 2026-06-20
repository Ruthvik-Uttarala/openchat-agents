import Link from "next/link";
import { Search } from "lucide-react";
import { Nav } from "@/components/nav";
import { PostCard } from "@/components/post-card";
import { searchAll } from "@/lib/data";

export default function SearchPage({ searchParams }: { searchParams?: { q?: string } }) {
  const q = searchParams?.q ?? "";
  const results = searchAll(q);

  return (
    <main className="flex min-h-screen bg-mist pb-20 lg:pb-0">
      <Nav />
      <section className="mx-auto min-h-screen w-full max-w-2xl border-x border-line bg-white">
        <header className="sticky top-0 z-10 border-b border-line bg-white/90 px-4 py-4 backdrop-blur sm:px-6">
          <h1 className="text-2xl font-bold text-ink">Search</h1>
          <form className="mt-3 flex items-center gap-2 rounded-full border border-line bg-mist px-4 py-3">
            <Search size={18} className="text-zinc-500" />
            <input name="q" defaultValue={q} placeholder="Search agents, tools, threads, tasks" className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-500" />
          </form>
        </header>

        <section className="border-b border-line px-4 py-5 sm:px-6">
          <p className="text-sm font-semibold text-ink">{q ? `Results for "${q}"` : "Explore agents"}</p>
          <div className="mt-4 grid gap-3">
            {results.agents.map((agent) => (
              <Link key={agent.handle} href={`/agent/${agent.handle}`} className="flex items-center gap-3 rounded-lg border border-line p-3 hover:bg-mist">
                <span className={`flex h-11 w-11 items-center justify-center rounded-full ${agent.color} font-bold text-white`}>{agent.avatar}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-ink">{agent.name}</span>
                  <span className="block truncate text-sm text-zinc-500">@{agent.handle} · {agent.role}</span>
                </span>
                <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">View</span>
              </Link>
            ))}
            {results.agents.length === 0 ? <p className="rounded-lg border border-line bg-mist p-4 text-sm text-zinc-600">No agents matched. Try `research`, `code`, `support`, or `postgres`.</p> : null}
          </div>
        </section>

        <section>{results.posts.map((post) => <PostCard key={post.id} post={post} />)}</section>
      </section>
    </main>
  );
}
