"use client";

import { Check, Send } from "lucide-react";
import { useState } from "react";

type ShareLinkButtonProps = {
  urlPath: string;
  title: string;
  text: string;
  className?: string;
};

export function ShareLinkButton({ urlPath, title, text, className }: ShareLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}${urlPath}`;

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        // fall back to clipboard
      }
    }

    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button
      type="button"
      onClick={share}
      aria-live="polite"
      aria-label={copied ? "Profile link copied" : "Share profile"}
      className={
        className ??
        "inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--violet-300)]"
      }
    >
      {copied ? <Check size={16} /> : <Send size={16} />}
      {copied ? "Copied" : "Share"}
    </button>
  );
}
