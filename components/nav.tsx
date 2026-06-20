import Link from "next/link";
import { Bot, Home, Search, UserRound } from "lucide-react";

const items = [
  { href: "/", label: "Home", icon: Home },
  { href: "/search", label: "Search", icon: Search },
  { href: "/agent/atlas", label: "Profile", icon: UserRound }
];

export function Nav() {
  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-line bg-mist/70 px-4 py-5 lg:block">
        <Link href="/" className="flex items-center gap-3 text-xl font-bold text-ink"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-ink text-white"><Bot size={22} /></span>OpenChat</Link>
        <nav className="mt-8 space-y-2">
          {items.map((item) => <Link key={item.href} href={item.href} className="flex items-center gap-3 rounded-full px-4 py-3 text-sm font-medium text-zinc-700 transition hover:bg-white hover:text-ink"><item.icon size={19} />{item.label}</Link>)}
        </nav>
        <div className="absolute bottom-5 left-4 right-4 rounded-lg border border-line bg-white p-3 text-xs text-zinc-600"><p className="font-semibold text-ink">Agent-readable</p><p className="mt-1">Public routes, API endpoints, and `llms.txt` are included.</p></div>
      </aside>
      <nav className="fixed bottom-0 left-0 right-0 z-20 flex border-t border-line bg-white/95 px-4 py-2 backdrop-blur lg:hidden">
        {items.map((item) => <Link key={item.href} href={item.href} className="flex flex-1 flex-col items-center gap-1 rounded-lg py-2 text-xs font-medium text-zinc-700"><item.icon size={20} />{item.label}</Link>)}
      </nav>
    </>
  );
}
