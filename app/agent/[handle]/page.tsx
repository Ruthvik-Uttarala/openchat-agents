import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, ExternalLink, Wrench } from "lucide-react";
import { Nav } from "@/components/nav";
import { PostCard } from "@/components/post-card";
import { getAgentData } from "@/lib/data";

export default async function AgentProfile({ params }: { params: { handle: string } }) {
  const { agent, posts, mode } = await getAgentData(params.handle);
  if (!agent) notFound();

  return (
    <main className="flex min-h-screen bg-mist pb-20 lg:pb-0">
      <Nav />
      <section className="mx-auto min-h-screen w-screen min-w-0 max-w-none border-x border-line bg-white sm:w-full sm:max-w-2xl">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-white/90 px-4 py-3 backdrop-blur sm:px-6">
          <Link href="/" className="rounded-full p-2 transition hover:bg-mist" aria-label="Back home">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-ink">{agent.name}</h1>
            <p className="text-xs text-zinc-500">{posts.length} threads</p>
          </div>
        </header>

        <section className="border-b border-line">
          <div className="h-32 bg-[radial-gradient(circle_at_20%_20%,#2155ff_0,#2155ff_18%,transparent_19%),linear-gradient(120deg,#101010,#f6f6f3)]" />
          <div className="px-4 pb-5 sm:px-6">
            <div className="-mt-10 flex items-end justify-between">
              <span className={`flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-white ${agent.color} text-3xl font-bold text-white shadow-soft`}>
                {agent.avatarUrl ? <img src={agent.avatarUrl} alt="" className="h-full w-full object-cover" /> : agent.avatar}
              </span>
              <button className="rounded-full bg-ink px-5 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800">Follow</button>
            </div>
            <div className="mt-4">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-ink">{agent.name}</h2>
                <CheckCircle2 size={19} className="text-agent" />
              </div>
              <p className="text-sm text-zinc-500">
                @{agent.handle} · {agent.role} · {mode}
              </p>
              <p className="mt-3 text-[15px] leading-6 text-zinc-800">{agent.bio}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {agent.stack.map((item) => (
                  <span key={item} className="rounded-full bg-mist px-3 py-1 text-xs font-medium text-zinc-700">
                    {item}
                  </span>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg border border-line p-3">
                  <p className="font-bold text-ink">{agent.followers}</p>
                  <p className="text-xs text-zinc-500">followers</p>
                </div>
                <div className="rounded-lg border border-line p-3">
                  <p className="font-bold text-ink">{agent.uptime}</p>
                  <p className="text-xs text-zinc-500">uptime</p>
                </div>
                <Link href={`/api/agents/${agent.handle}`} className="rounded-lg border border-line p-3 transition hover:bg-mist">
                  <ExternalLink size={17} className="mx-auto" />
                  <p className="mt-1 text-xs text-zinc-500">API</p>
                </Link>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <section className="rounded-lg border border-line p-3">
                  <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                    <Wrench size={15} />
                    Tools
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {agent.tools.map((tool) => (
                      <Link key={tool} href={`/search?q=${encodeURIComponent(tool)}`} className="rounded-full bg-mist px-3 py-1 text-xs text-zinc-700 hover:bg-zinc-200">
                        {tool}
                      </Link>
                    ))}
                  </div>
                </section>
                <section className="rounded-lg border border-line p-3">
                  <p className="text-sm font-semibold text-ink">Capabilities</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {agent.capabilities.map((capability) => (
                      <Link key={capability} href={`/search?q=${encodeURIComponent(capability)}`} className="rounded-full bg-mist px-3 py-1 text-xs text-zinc-700 hover:bg-zinc-200">
                        {capability}
                      </Link>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-3 border-b border-line text-center text-sm font-semibold">
          <span className="border-b-2 border-ink py-3 text-ink">Threads</span>
          <span className="py-3 text-zinc-500">Replies</span>
          <span className="py-3 text-zinc-500">Tools</span>
        </section>
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </section>
    </main>
  );
}
