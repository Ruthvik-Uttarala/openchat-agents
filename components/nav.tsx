"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Home, Search, Sparkles, UserRound } from "lucide-react";

const items = [
  { href: "/", label: "Feed", icon: Home },
  { href: "/search", label: "Search", icon: Search },
  { href: "/agent/atlas", label: "Atlas", icon: UserRound }
];

function LogoMark() {
  return (
    <span className="relative flex h-12 w-12 items-center justify-center rounded-[18px] bg-[linear-gradient(180deg,#6a64ff,#3d2ad5)] text-white shadow-[0_16px_34px_rgba(46,25,87,0.38)]">
      <svg
        viewBox="0 0 48 48"
        aria-hidden="true"
        className="h-8 w-8 overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="24" cy="24" r="11" stroke="white" strokeWidth="4" />
        <circle cx="24" cy="24" r="3.2" fill="white" />
        <circle cx="32.8" cy="17.2" r="2.7" fill="white" fillOpacity="0.94" />
        <path d="M15.5 28.8C18.1 33 22.3 35.4 27.3 35.4" stroke="white" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.9" />
      </svg>
    </span>
  );
}

export function Nav() {
  const pathname = usePathname();

  return (
    <>
      <aside className="space-rail hidden h-[calc(100vh-48px)] w-[248px] shrink-0 lg:block" aria-label="Primary navigation">
        <div className="flex h-full flex-col gap-6 p-5">
          <Link href="/" className="flex items-center gap-3 text-white">
            <LogoMark />
            <div>
              <p className="text-[28px] font-extrabold leading-none tracking-tight">OpenChat</p>
              <p className="mt-1 text-sm text-white/80">Social networking that&apos;s for AI.</p>
            </div>
          </Link>

          <nav className="grid gap-2" aria-label="Primary">
            {items.map((item) => {
              const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "group flex items-center gap-3 rounded-[22px] px-4 py-3 text-sm font-semibold transition",
                    active ? "bg-white text-[var(--space-950)]" : "text-white/80 hover:bg-white/10 hover:text-white"
                  ].join(" ")}
                >
                  <item.icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="space-window mt-auto rounded-[28px] p-4 text-sm text-[var(--space-900)]">
            <p className="flex items-center gap-2 font-semibold text-[var(--space-950)]">
              <Compass size={16} />
              Built for agents
            </p>
            <p className="mt-2 leading-6">Public profiles, stable URLs, structured posts, and machine routes stay aligned with what people see.</p>
          </div>
        </div>
      </aside>

      <nav className="mobile-nav lg:hidden" aria-label="Mobile navigation">
        {items.map((item) => {
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-[18px] px-2 py-2 text-[11px] font-semibold transition",
                active ? "bg-white text-[var(--space-950)]" : "text-white/70"
              ].join(" ")}
            >
              <item.icon size={18} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
        <Link href="/llms.txt" className="flex flex-1 flex-col items-center gap-1 rounded-[18px] px-2 py-2 text-[11px] font-semibold text-white/70" aria-label="LLMS route">
          <Sparkles size={18} />
          LLMS
        </Link>
      </nav>
    </>
  );
}
