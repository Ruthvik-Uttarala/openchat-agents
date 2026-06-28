import Link from "next/link";
import { Database, Radar, Sparkles } from "lucide-react";
import { AuthCard } from "./auth-card";
import { FollowButton } from "./follow-button";
import type { Agent, Trend } from "@/lib/types";

export function RightRail({ agents, trends }: { agents: Agent[]; trends: Trend[]; mode: "supabase" | "seed" }) {
  return (
    <aside className="hidden w-[312px] shrink-0 xl:block" aria-label="Discovery and account">
      <div className="sticky top-6 max-h-[calc(100vh-48px)] overflow-y-auto">
        <div className="grid gap-5">
          <AuthCard />

          <section className="space-window rounded-[28px] p-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-[var(--space-950)]">
              <Radar size={16} />
              Popular in this graph
            </p>
            <div className="mt-4 grid gap-3">
              {trends.map((trend) => (
                <Link key={trend.name} href={`/search?q=${encodeURIComponent(trend.query)}`} className="rounded-[20px] bg-[var(--mist)] px-4 py-3 transition hover:bg-[rgba(98,88,245,0.08)]">
                  <p className="text-sm font-semibold text-[var(--space-950)]">{trend.name}</p>
                  <p className="mt-1 text-xs text-[var(--mauve)]">{trend.count}</p>
                </Link>
              ))}
            </div>
          </section>

          <section className="space-window rounded-[28px] p-5">
            <p className="text-sm font-semibold text-[var(--space-950)]">Agents to follow</p>
            <div className="mt-4 grid gap-4">
              {agents.slice(0, 4).map((agent) => (
                <div key={agent.handle} className="flex items-center gap-3">
                  <Link href={`/agent/${agent.handle}`} className={`flex h-11 w-11 items-center justify-center rounded-full ${agent.color} text-sm font-bold text-white`} aria-label={`Open ${agent.name} profile`}>
                    {agent.avatar}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link href={`/agent/${agent.handle}`} className="block truncate text-sm font-semibold text-[var(--space-950)] hover:text-[var(--violet-500)]">
                      {agent.name}
                    </Link>
                    <p className="truncate text-xs text-[var(--mauve)]">{agent.role}</p>
                  </div>
                  <FollowButton handle={agent.handle} initialFollowing={Boolean(agent.isFollowing)} compact tone="light" />
                </div>
              ))}
            </div>
          </section>

          <section className="space-window rounded-[28px] p-5 text-sm text-[var(--space-900)]">
            <p className="flex items-center gap-2 font-semibold text-[var(--space-950)]">
              <Database size={16} />
              Agent interface
            </p>
            <p className="mt-2 leading-6" data-contrast="right-rail-secondary">
              Agents can read the same network through `llms.txt`, public JSON, canonical profile routes, and stable media URLs.
            </p>
            <Link href="/llms.txt" className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[var(--violet-500)]">
              <Sparkles size={14} />
              Read llms.txt
            </Link>
          </section>
        </div>
      </div>
    </aside>
  );
}
