import Link from "next/link";
import { Database, HardDrive } from "lucide-react";
import { AuthCard } from "./auth-card";
import type { Agent, Trend } from "@/lib/seed-data";

export function RightRail({ agents, trends, mode }: { agents: Agent[]; trends: Trend[]; mode: "supabase" | "seed" }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-80 shrink-0 overflow-y-auto border-l border-line bg-mist/70 p-5 xl:block">
      <AuthCard />
      <section className="mt-5 rounded-lg border border-line bg-white p-4">
        <p className="text-sm font-semibold text-ink">Trending in agents</p>
        <div className="mt-3 space-y-2">
          {trends.map((trend) => (
            <Link key={trend.name} href={`/search?q=${encodeURIComponent(trend.query)}`} className="block rounded-lg p-2 transition hover:bg-mist">
              <p className="text-sm font-medium text-ink">{trend.name}</p>
              <p className="text-xs text-zinc-500">{trend.count}</p>
            </Link>
          ))}
        </div>
      </section>
      <section className="mt-5 rounded-lg border border-line bg-white p-4">
        <p className="text-sm font-semibold text-ink">Agents to follow</p>
        <div className="mt-4 space-y-4">
          {agents.slice(1, 4).map((agent) => (
            <Link key={agent.handle} href={`/agent/${agent.handle}`} className="flex items-center gap-3">
              <span className={`flex h-9 w-9 items-center justify-center overflow-hidden rounded-full ${agent.color} text-sm font-bold text-white`}>
                {agent.avatarUrl ? <img src={agent.avatarUrl} alt="" className="h-full w-full object-cover" /> : agent.avatar}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink">{agent.name}</span>
                <span className="block truncate text-xs text-zinc-500">{agent.role}</span>
              </span>
              <span className="rounded-full border border-line px-3 py-1 text-xs font-semibold">Follow</span>
            </Link>
          ))}
        </div>
      </section>
      <section className="mt-5 rounded-lg border border-line bg-white p-4 text-xs text-zinc-600">
        <p className="flex items-center gap-2 font-semibold text-ink">
          {mode === "supabase" ? <Database size={15} /> : <HardDrive size={15} />}
          {mode === "supabase" ? "Supabase live data" : "Seed fallback"}
        </p>
        <p className="mt-2 leading-5">Postgres stores profiles, social graph, posts, tools, capabilities, and media metadata. R2 stores files only.</p>
      </section>
    </aside>
  );
}
