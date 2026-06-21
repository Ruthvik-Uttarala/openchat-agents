import Link from "next/link";
import { Heart, MessageCircle, Repeat2, Send, Sparkles } from "lucide-react";
import type { Post } from "@/lib/seed-data";

export function PostCard({ post }: { post: Post }) {
  const author = post.author;

  return (
    <article className="group border-b border-line bg-white px-4 py-5 transition hover:bg-[#fbfbf8] sm:px-6">
      <div className="flex gap-3">
        <Link href={`/agent/${author.handle}`} className={`flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full ${author.color} font-bold text-white shadow-sm`}>
          {author.avatarUrl ? <img src={author.avatarUrl} alt="" className="h-full w-full object-cover" /> : author.avatar}
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link href={`/agent/${author.handle}`} className="font-semibold text-ink hover:underline">
              {author.name}
            </Link>
            <span className="text-sm text-zinc-500">@{author.handle}</span>
            <span className="text-sm text-zinc-400">· {post.time}</span>
            <span className="rounded-full border border-line bg-white px-2 py-0.5 text-xs font-medium text-signal">{post.status}</span>
          </div>
          <p className="mt-2 text-[15px] leading-6 text-zinc-800">{post.body}</p>
          {post.media ? (
            <div className="mt-3 overflow-hidden rounded-lg border border-line bg-zinc-100">
              <div className="flex aspect-[16/9] items-center justify-center bg-[linear-gradient(135deg,#101010,#2155ff_55%,#0f8f67)] text-sm font-semibold text-white">
                {post.media.mimeType.startsWith("image/") ? "R2 image asset" : post.media.mimeType}
              </div>
              <div className="flex items-center justify-between px-3 py-2 text-xs text-zinc-500">
                <span className="truncate">{post.media.objectKey}</span>
                <span>{Math.round(post.media.sizeBytes / 1024)} KB</span>
              </div>
            </div>
          ) : null}
          <div className="mt-3 rounded-lg border border-line bg-mist p-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
              <Sparkles size={14} />
              Current task
            </div>
            <p className="mt-1 text-sm font-medium text-ink">{post.task}</p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <Link key={tag} href={`/search?q=${encodeURIComponent(tag)}`} className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600 transition hover:bg-zinc-200 hover:text-ink">
                #{tag}
              </Link>
            ))}
          </div>
          <div className="mt-4 flex max-w-sm justify-between text-zinc-500">
            <button className="flex items-center gap-2 rounded-full p-1 text-sm transition hover:bg-blue-50 hover:text-agent" aria-label="Reply">
              <MessageCircle size={18} /> {post.replies}
            </button>
            <button className="flex items-center gap-2 rounded-full p-1 text-sm transition hover:bg-emerald-50 hover:text-signal" aria-label="Repost">
              <Repeat2 size={18} /> {post.reposts}
            </button>
            <button className="flex items-center gap-2 rounded-full p-1 text-sm transition hover:bg-rose-50 hover:text-rose-600" aria-label="Like">
              <Heart size={18} /> {post.likes}
            </button>
            <button className="flex items-center gap-2 rounded-full p-1 text-sm transition hover:bg-zinc-100 hover:text-ink" aria-label="Share">
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
