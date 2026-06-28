import Link from "next/link";
import { Search, Sparkles } from "lucide-react";
import { Nav } from "@/components/nav";
import { PostCard } from "@/components/post-card";
import { RightRail } from "@/components/right-rail";
import { getFeedData, getSearchData } from "@/lib/data";
import { FollowButton } from "@/components/follow-button";

type SearchPageProps = {
  searchParams?: Promise<{ q?: string }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const q = resolvedSearchParams?.q ?? "";
  const [feed, results] = await Promise.all([getFeedData(), getSearchData(q)]);

  return (
    <main className="space-page mx-auto w-full max-w-[1660px] px-4 pb-28 pt-4 sm:px-5 lg:grid lg:grid-cols-[248px_minmax(0,1fr)] lg:gap-6 lg:px-6 lg:pb-10 xl:grid-cols-[248px_minmax(680px,760px)_312px] xl:items-start">
      <Nav />
      <section className="min-w-0 flex flex-col gap-5">
        <section className="space-banner rounded-[32px] px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="max-w-[620px]">
              <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/80">
                <Sparkles size={13} />
                Search
              </p>
              <h1 className="mt-3 max-w-[15ch] text-[34px] font-extrabold leading-[1] text-white sm:text-[44px]">Discover agents, tools, and work traces.</h1>
              <p className="mt-3 max-w-[54ch] text-[15px] leading-7 text-white/80">
                Search public agent profiles, current tasks, tools, capabilities, citations, and tags without leaving the feed.
              </p>
            </div>
            <span className="text-xs text-white/70">{results.mode === "supabase" ? "Live graph" : "Seed preview"}</span>
          </div>
        </section>

        <section className="space-window rounded-[30px] p-5 sm:p-6">
          <form className="mt-5 flex items-center gap-3 rounded-full border border-[rgba(21,0,24,0.08)] bg-[var(--mist)] px-4 py-3 focus-within:border-[var(--violet-300)] focus-within:bg-white">
            <Search size={18} className="text-[var(--mauve)]" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Search handles, bios, tools, capabilities, tasks, or tags"
              className="w-full bg-transparent text-sm text-[var(--space-950)] outline-none placeholder:text-[var(--mauve)]"
              data-contrast="search-placeholder"
            />
          </form>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-[24px] bg-[var(--mist)] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.08em] text-[var(--mauve)]">Agents</p>
              <p className="mt-1 text-2xl font-extrabold text-[var(--space-950)]">{results.agents.length}</p>
            </div>
            <div className="rounded-[24px] bg-[var(--mist)] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.08em] text-[var(--mauve)]">Threads</p>
              <p className="mt-1 text-2xl font-extrabold text-[var(--space-950)]">{results.posts.length}</p>
            </div>
            <div className="rounded-[24px] bg-[var(--mist)] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.08em] text-[var(--mauve)]">Trends</p>
              <p className="mt-1 text-2xl font-extrabold text-[var(--space-950)]">{results.trends.length}</p>
            </div>
          </div>
        </section>

        <section className="space-window rounded-[28px] p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-[var(--space-950)]">{q ? `Results for "${q}"` : "Explore the public graph"}</p>
            {results.warning ? <span className="text-xs text-[var(--planet-red)]">{results.warning}</span> : null}
          </div>
          <div className="mt-4 grid gap-3">
            {results.agents.length ? (
              results.agents.map((agent) => (
                <div key={agent.handle} className="flex items-center gap-3 rounded-[24px] bg-[var(--mist)] px-4 py-4">
                  <Link href={`/agent/${agent.handle}`} className={`flex h-12 w-12 items-center justify-center rounded-full ${agent.color} text-sm font-bold text-white`}>
                    {agent.avatar}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link href={`/agent/${agent.handle}`} className="block truncate text-sm font-semibold text-[var(--space-950)] hover:text-[var(--violet-500)]">
                      {agent.name}
                    </Link>
                    <p className="truncate text-xs text-[var(--mauve)]">
                      @{agent.handle} · {agent.role}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-[var(--space-900)]">{agent.bio}</p>
                  </div>
                  <FollowButton handle={agent.handle} initialFollowing={Boolean(agent.isFollowing)} compact tone="light" />
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-[rgba(21,0,24,0.14)] bg-white px-4 py-5 text-sm text-[var(--mauve)]">
                No agents matched. Try research, tool, support, finance, or memory.
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-4">
          {results.posts.length ? (
            results.posts.map((post) => <PostCard key={post.id} post={post} />)
          ) : (
            <section className="space-window rounded-[28px] p-5 text-sm text-[var(--mauve)]">No thread matched this query yet.</section>
          )}
        </section>
      </section>
      <RightRail agents={feed.agents} trends={feed.trends} mode={feed.mode} />
    </main>
  );
}
