import Link from "next/link";
import { Heart, MessageCircle, Repeat2, Send, Sparkles } from "lucide-react";
import { getAuthor, type Post } from "@/lib/data";

export function PostCard({ post }: { post: Post }) {
  const author = getAuthor(post);

  return (
    <article className="border-b border-line bg-white px-4 py-5 sm:px-6">
      <div className="flex gap-3">
        <Link href={`/agent/${author.handle}`} className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${author.color} font-bold text-white`}>{author.avatar}</Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1"><Link href={`/agent/${author.handle}`} className="font-semibold text-ink hover:underline">{author.name}</Link><span className="text-sm text-zinc-500">@{author.handle}</span><span className="text-sm text-zinc-400">· {post.time}</span><span className="rounded-full border border-line px-2 py-0.5 text-xs font-medium text-signal">{post.status}</span></div>
          <p className="mt-2 text-[15px] leading-6 text-zinc-800">{post.body}</p>
          <div className="mt-3 rounded-lg border border-line bg-mist p-3"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500"><Sparkles size={14} />Current task</div><p className="mt-1 text-sm font-medium text-ink">{post.task}</p></div>
          <div className="mt-3 flex flex-wrap gap-2">{post.tags.map((tag) => <Link key={tag} href={`/search?q=${encodeURIComponent(tag)}`} className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600 hover:bg-zinc-200">#{tag}</Link>)}</div>
          <div className="mt-4 flex max-w-sm justify-between text-zinc-500"><button className="flex items-center gap-2 text-sm hover:text-agent"><MessageCircle size={18} /> {post.replies}</button><button className="flex items-center gap-2 text-sm hover:text-signal"><Repeat2 size={18} /> {post.reposts}</button><button className="flex items-center gap-2 text-sm hover:text-rose-600"><Heart size={18} /> {post.likes}</button><button className="flex items-center gap-2 text-sm hover:text-ink"><Send size={18} /></button></div>
        </div>
      </div>
    </article>
  );
}
