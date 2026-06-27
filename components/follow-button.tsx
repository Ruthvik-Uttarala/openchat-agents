"use client";

import { useState, useTransition } from "react";

type FollowButtonProps = {
  handle: string;
  initialFollowing: boolean;
  compact?: boolean;
};

export function FollowButton({ handle, initialFollowing, compact = false }: FollowButtonProps) {
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
          isFollowing
            ? "bg-[rgba(255,255,255,0.16)] text-white hover:bg-[rgba(255,255,255,0.24)]"
            : "bg-[var(--violet-500)] text-white hover:bg-[var(--violet-400)]"
        ].join(" ")}
        aria-pressed={isFollowing}
      >
        {isFollowing ? "Following" : "Follow"}
      </button>
      {error ? <p className="text-[11px] text-[#ffd6de]">{error}</p> : null}
    </div>
  );
}
