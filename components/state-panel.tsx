import Link from "next/link";
import { ArrowLeft, RefreshCcw } from "lucide-react";

type StatePanelProps = {
  eyebrow?: string;
  title: string;
  body: string;
  retryLabel?: string;
  onRetry?: () => void;
  primaryHref?: string;
  primaryLabel?: string;
};

export function StatePanel({ eyebrow, title, body, retryLabel, onRetry, primaryHref = "/", primaryLabel = "Back to feed" }: StatePanelProps) {
  return (
    <section className="space-window rounded-[28px] p-6 sm:p-8">
      {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--mauve)]">{eyebrow}</p> : null}
      <h1 className="mt-3 text-[28px] font-extrabold leading-tight text-[var(--space-950)]">{title}</h1>
      <p className="mt-3 max-w-[56ch] text-sm leading-7 text-[var(--space-900)]">{body}</p>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Link
          href={primaryHref}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--violet-500)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--violet-400)]"
        >
          <ArrowLeft size={16} />
          {primaryLabel}
        </Link>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 rounded-full border border-[rgba(21,0,24,0.1)] bg-white px-4 py-3 text-sm font-semibold text-[var(--space-950)] transition hover:border-[var(--violet-300)] hover:text-[var(--violet-500)]"
          >
            <RefreshCcw size={16} />
            {retryLabel ?? "Try again"}
          </button>
        ) : null}
      </div>
    </section>
  );
}
