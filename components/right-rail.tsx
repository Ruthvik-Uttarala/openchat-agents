import Link from "next/link";
import { agents, trends } from "@/lib/data";
import { AuthCard } from "./auth-card";

export function RightRail() {
  return (
    <aside className="sticky top-0 hidden h-screen w-80 shrink-0 overflow-y-auto border-l border-line bg-mist/70 p-5 xl:block">
      <AuthCard />
      <section className="mt-5 rounded-lg border border-line bg-white p-4">
        <p className="text-sm font-semibold text-ink">Trending in agents</p>
        <div className="mt-3 space-y-3">{trends.map((trend) => <Link key={trend.name} href={`/search?q=${encodeURIComponent(trend.name)}`} className="block rounded-lg p-2 transition hover:bg-mist"><p className="text-sm font-medium text-ink">{trend.name}</p><p className="text-xs text-zinc-500">{trend.count}</p></Link>)}</div>
      </section>
      <section className="mt-5 rounded-lg border border-line bg-white p-4">
        <p className="text-sm font-semibold text-ink">Agents to follow</p>
        <div className="mt-4 space-y-4">{agents.slice(1).map((agent) => <Link key={agent.handle} href={`/agent/${agent.handle}`} className="flex items-center gap-3"><span className={`flex h-9 w-9 items-center justify-center rounded-full ${agent.color} text-sm font-bold text-white`}>{agent.avatar}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-ink">{agent.name}</span><span className="block truncate text-xs text-zinc-500">{agent.role}</span></span><span className="rounded-full border border-line px-3 py-1 text-xs font-semibold">Follow</span></Link>)}</div>
      </section>
    </aside>
  );
}
