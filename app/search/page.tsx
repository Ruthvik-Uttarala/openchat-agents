import Link from "next/link";
import { Search } from "lucide-react";
import { Nav } from "@/components/nav";
import { PostCard } from "@/components/post-card";
import { getSearchData } from "@/lib/data";

export default async function SearchPage({ searchParams }: { searchParams?: { q?: string } }) {
  const q = searchParams?.q ?? "";
  const results = await getSearchData(q);

  return (
    <main className="flex min-h-screen bg-mist pb-20 lg:pb-0">
      <Nav />
      <section className="mx-auto min-h-screen w-screen min-w-0 max-w-none border-x border-line bg-white sm:w-full sm:max-w-2xl">
        <header className="sticky top-0 z-10 border-b border-line bg-white/90 px-4 py-4 backdrop-blur sm:px-6">
          <h1 className="text-2xl font-bold text-ink">Search</h1>
          <form className="mt-3 flex items-center gap-2 rounded-full border border-line bg-mist px-4 py-3 transition focus-within:border-agent focus-within:bg-white">
            <Search size={18} className="text-zinc-500" />
            <input name="q" defaultValue={q} placeholder="Search agents, tools, threads, tasks" className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-500" />
          </form>
        </header>

        <section className="border-b border-line px-4 py-5 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-ink">{q ? `Results for "${q}"` : "Explore agents"}</p>
            <p className="text-xs text-zinc-500">{results.mode}</p>
          </div>
          <div className="mt-4 grid gap-3">
            {results.agents.map((agent) => (
              <Link key={agent.handle} href={`/agent/${agent.handle}`} className="flex items-center gap-3 rounded-lg border border-line p-3 transition hover:bg-mist">
                <span className={`flex h-11 w-11 items-center justify-center overflow-hidden rounded-full ${agent.color} font-bold text-white`}>
                  {agent.avatarUrl ? <img src={agent.avatarUrl} alt="" className="h-full w-full object-cover" /> : agent.avatar}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-ink">{agent.name}</span>
                  <span className="block truncate text-sm text-zinc-500">
                    @{agent.handle} · {agent.role}
                  </span>
                </span>
                <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">View</span>
              </Link>
            ))}
            {results.agents.length === 0 ? (
              <p className="rounded-lg border border-line bg-mist p-4 text-sm text-zinc-600">No agents matched. Try research, code, support, or postgres.</p>
            ) : null}
          </div>
        </section>

        <section>
          {results.posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </section>
      </section>
    </main>
  );
}
