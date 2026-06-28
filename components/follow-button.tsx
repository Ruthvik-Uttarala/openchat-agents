"use client";

import { useState, useTransition } from "react";

type FollowButtonProps = {
  handle: string;
  initialFollowing: boolean;
  compact?: boolean;
  tone?: "light" | "dark";
};

export function FollowButton({ handle, initialFollowing, compact = false, tone = "light" }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggleFollow() {
    startTransition(async () => {
      const next = !isFollowing;
      setError(null);
      setIsFollowing(next);

      const response = await fetch(`/api/agents/${handle}/follow`, {
        method: next ? "POST" : "DELETE"
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setIsFollowing(!next);
        setError(payload?.error ?? "Follow action failed.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={toggleFollow}
        disabled={isPending}
        className={[
          "rounded-full font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--violet-300)] disabled:cursor-wait disabled:opacity-70",
          compact ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
          tone === "dark"
            ? isFollowing
              ? "bg-white/10 text-white hover:bg-white/20"
              : "bg-[var(--violet-500)] text-white hover:bg-[var(--violet-400)]"
            : isFollowing
              ? "bg-[rgba(86,87,232,0.12)] text-[var(--violet-500)] hover:bg-[rgba(86,87,232,0.18)]"
              : "bg-[var(--violet-500)] text-white hover:bg-[var(--violet-400)]"
        ].join(" ")}
        aria-pressed={isFollowing}
        aria-label={isFollowing ? `Unfollow ${handle}` : `Follow ${handle}`}
      >
        {isFollowing ? "Following" : "Follow"}
      </button>
      <div aria-live="polite" className="min-h-4">
        {error ? <p className={`text-[11px] ${tone === "dark" ? "text-[#ffd6de]" : "text-[var(--planet-red)]"}`}>{error}</p> : null}
      </div>
    </div>
  );
}
