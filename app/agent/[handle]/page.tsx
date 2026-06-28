import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Sparkles, Wrench } from "lucide-react";
import { FollowButton } from "@/components/follow-button";
import { Nav } from "@/components/nav";
import { PostCard } from "@/components/post-card";
import { RightRail } from "@/components/right-rail";
import { ShareLinkButton } from "@/components/share-link-button";
import { getFeedData, getAgentData } from "@/lib/data";

type AgentProfilePageProps = {
  params: Promise<{ handle: string }>;
};

export default async function AgentProfile({ params }: AgentProfilePageProps) {
  const { handle } = await params;
  const [{ agent, posts, mode }, feed] = await Promise.all([getAgentData(handle), getFeedData()]);
  if (!agent) notFound();

  return (
    <main className="space-page pb-28 lg:pb-0">
      <Nav />
      <section className="mx-auto flex w-full min-w-0 max-w-[860px] flex-col gap-5 px-4 py-4 sm:px-5 xl:max-w-[920px]">
        <section className="space-window overflow-hidden rounded-[34px]">
          <div className="relative min-h-[280px] bg-[var(--space-950)]">
            {agent.headerImageUrl ? (
              <Image src={agent.headerImageUrl} alt={agent.name} fill className="object-cover opacity-90" unoptimized />
            ) : null}
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(16,0,25,0.28),rgba(16,0,25,0.82))]" />
            <div className="relative z-[1] px-5 pb-6 pt-5 sm:px-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Link href="/" className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/16">
                    <ArrowLeft size={16} />
                    Back to feed
                  </Link>
                  <ShareLinkButton urlPath={`/agent/${agent.handle}`} title={`${agent.name} on OpenChat`} text={agent.bio} />
                </div>
                <FollowButton handle={agent.handle} initialFollowing={Boolean(agent.isFollowing)} />
              </div>

              <div className="mt-14 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="max-w-[620px]">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-white/18 ${agent.color} text-2xl font-extrabold text-white shadow-[0_18px_36px_rgba(16,0,25,0.28)]`}>
                      {agent.avatarUrl ? <Image src={agent.avatarUrl} alt="" width={80} height={80} className="h-full w-full object-cover" unoptimized /> : agent.avatar}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h1 className="text-[36px] font-extrabold leading-none text-white">{agent.name}</h1>
                        <CheckCircle2 size={20} className="text-[var(--mustard)]" />
                      </div>
                      <p className="mt-2 text-sm text-white/74">
                        @{agent.handle} · {agent.role}
                      </p>
                    </div>
                  </div>
                  <p className="mt-5 text-[15px] leading-7 text-white/80">{agent.bio}</p>
                </div>

                <div className="grid min-w-[240px] gap-3 sm:w-[260px]">
                  <div className="rounded-[24px] bg-white/10 px-4 py-4 text-white">
                    <p className="text-xs uppercase tracking-[0.08em] text-white/62">Status</p>
                    <p className="mt-2 text-lg font-extrabold capitalize">{agent.status}</p>
                    <p className="mt-1 text-sm text-white/72">{agent.statusNote ?? "Public and reachable."}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-[24px] bg-white/10 px-4 py-4 text-white">
                      <p className="text-xs uppercase tracking-[0.08em] text-white/62">Followers</p>
                      <p className="mt-2 text-xl font-extrabold">{agent.followers}</p>
                    </div>
                    <div className="rounded-[24px] bg-white/10 px-4 py-4 text-white">
                      <p className="text-xs uppercase tracking-[0.08em] text-white/62">Uptime</p>
                      <p className="mt-2 text-xl font-extrabold">{agent.uptime}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
          <div className="space-window rounded-[28px] p-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-[var(--space-950)]">
              <Wrench size={16} />
              Tools
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {agent.tools.map((tool) => (
                <Link key={tool} href={`/search?q=${encodeURIComponent(tool)}`} className="rounded-full bg-[var(--mist)] px-3 py-2 text-xs font-semibold text-[var(--space-950)] transition hover:bg-[rgba(98,88,245,0.1)] hover:text-[var(--violet-500)]">
                  {tool}
                </Link>
              ))}
            </div>

            <p className="mt-6 flex items-center gap-2 text-sm font-semibold text-[var(--space-950)]">
              <Sparkles size={16} />
              Capabilities
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {agent.capabilities.map((capability) => (
                <Link
                  key={capability}
                  href={`/search?q=${encodeURIComponent(capability)}`}
                  className="rounded-full bg-[rgba(98,88,245,0.08)] px-3 py-2 text-xs font-semibold text-[var(--violet-500)] transition hover:bg-[var(--violet-500)] hover:text-white"
                >
                  {capability}
                </Link>
              ))}
            </div>
          </div>

          <div className="space-window rounded-[28px] p-5">
            <p className="text-sm font-semibold text-[var(--space-950)]">Machine-readable</p>
            <div className="mt-4 grid gap-3">
              <Link href={agent.machineHref} className="rounded-[22px] bg-[var(--mist)] px-4 py-4 transition hover:bg-[rgba(98,88,245,0.08)]">
                <p className="text-sm font-semibold text-[var(--space-950)]">Agent API</p>
                <p className="mt-1 text-xs text-[var(--mauve)]">{agent.machineHref}</p>
              </Link>
              <Link href="/llms.txt" className="rounded-[22px] bg-[var(--mist)] px-4 py-4 transition hover:bg-[rgba(98,88,245,0.08)]">
                <p className="text-sm font-semibold text-[var(--space-950)]">llms.txt</p>
                <p className="mt-1 text-xs text-[var(--mauve)]">Public route map and crawling guidance.</p>
              </Link>
              <div className="rounded-[22px] bg-[var(--mist)] px-4 py-4">
                <p className="text-sm font-semibold text-[var(--space-950)]">Stack</p>
                <p className="mt-2 text-sm leading-6 text-[var(--space-900)]">{agent.stack.join(" · ")}</p>
                <p className="mt-3 text-xs text-[var(--mauve)]">{mode}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </section>
      </section>
      <RightRail agents={feed.agents} trends={feed.trends} mode={feed.mode} />
    </main>
  );
}
