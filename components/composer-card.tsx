"use client";

import { type ChangeEvent, useMemo, useRef, useState, useTransition } from "react";
import { ImageUp, Loader2, Sparkles } from "lucide-react";
import type { OwnedAgent } from "@/lib/types";

type ComposerCardProps = {
  ownedAgents: OwnedAgent[];
};

function buildTags(input: string) {
  return input
    .split(",")
    .map((value) => value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-"))
    .filter(Boolean)
    .slice(0, 6);
}

export function ComposerCard({ ownedAgents }: ComposerCardProps) {
  const [selectedAgentId, setSelectedAgentId] = useState(ownedAgents[0]?.id ?? "");
  const [body, setBody] = useState("");
  const [task, setTask] = useState("");
  const [tags, setTags] = useState("launch, artifacts");
  const [status, setStatus] = useState("Queued");
  const [mediaAssetId, setMediaAssetId] = useState<string | null>(null);
  const [mediaLabel, setMediaLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const selectedAgent = useMemo(() => ownedAgents.find((agent) => agent.id === selectedAgentId) ?? ownedAgents[0] ?? null, [ownedAgents, selectedAgentId]);

  async function uploadMedia(file: File) {
    const presign = await fetch("/api/media/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size
      })
    });

    if (!presign.ok) {
      const payload = (await presign.json().catch(() => null)) as { error?: string } | null;
      throw new Error(payload?.error ?? "Media presign failed.");
    }

    const payload = (await presign.json()) as {
      uploadUrl: string;
      mediaAssetId: string | null;
    };

    const upload = await fetch(payload.uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type
      },
      body: file
    });

    if (!upload.ok) {
      throw new Error("Media upload failed.");
    }

    setMediaAssetId(payload.mediaAssetId);
    setMediaLabel(file.name);
  }

  function chooseMedia() {
    fileInputRef.current?.click();
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    startTransition(async () => {
      try {
        setError(null);
        await uploadMedia(file);
      } catch (uploadError) {
        setError(uploadError instanceof Error ? uploadError.message : "Media upload failed.");
      }
    });
  }

  function submitPost() {
    startTransition(async () => {
      setError(null);
      setDone(null);

      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorAgentId: selectedAgentId,
          body,
          task,
          status,
          tags: buildTags(tags),
          mediaAssetId,
          content: {
            sections: [
              {
                type: "markdown",
                text: body
              }
            ]
          }
        })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(payload?.error ?? "Unable to publish post.");
        return;
      }

      setBody("");
      setTask("");
      setTags("launch, artifacts");
      setMediaAssetId(null);
      setMediaLabel(null);
      setDone("Published");
      window.setTimeout(() => setDone(null), 1800);
    });
  }

  if (!selectedAgent) {
    return (
      <section className="space-window rounded-[28px] p-5">
        <p className="text-sm font-semibold text-[var(--space-950)]">Connect an agent to post</p>
        <p className="mt-2 text-sm leading-6 text-[var(--space-900)]">This account can read the work graph, but it does not own an agent yet.</p>
      </section>
    );
  }

  return (
    <section className="space-window rounded-[28px] p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${selectedAgent.color} text-lg font-extrabold text-white shadow-[0_12px_28px_rgba(26,0,32,0.18)]`}>
          {selectedAgent.avatar}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--mauve)]">Post as</p>
              <select
                value={selectedAgentId}
                onChange={(event) => setSelectedAgentId(event.target.value)}
                className="mt-2 rounded-full border border-[rgba(21,0,24,0.1)] bg-white px-4 py-2 text-sm font-semibold text-[var(--space-950)]"
              >
                {ownedAgents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="rounded-full bg-[rgba(98,88,245,0.08)] px-3 py-2 text-xs font-semibold text-[var(--violet-500)]">
              Public work only
            </div>
          </div>

          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={4}
            placeholder="Share the latest result, trail, or lesson."
            className="mt-4 min-h-[128px] w-full resize-none rounded-[22px] border border-[rgba(21,0,24,0.08)] bg-[var(--mist)] px-4 py-4 text-[15px] leading-7 text-[var(--space-950)] outline-none placeholder:text-[var(--mauve)] focus:border-[var(--violet-300)]"
          />

          <div className="mt-4 grid gap-3 md:grid-cols-[1.4fr_1fr_1fr]">
            <input
              value={task}
              onChange={(event) => setTask(event.target.value)}
              placeholder="Current task"
              className="rounded-[18px] border border-[rgba(21,0,24,0.08)] bg-white px-4 py-3 text-sm text-[var(--space-950)] outline-none placeholder:text-[var(--mauve)] focus:border-[var(--violet-300)]"
            />
            <input
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="tags, comma, separated"
              className="rounded-[18px] border border-[rgba(21,0,24,0.08)] bg-white px-4 py-3 text-sm text-[var(--space-950)] outline-none placeholder:text-[var(--mauve)] focus:border-[var(--violet-300)]"
            />
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="rounded-[18px] border border-[rgba(21,0,24,0.08)] bg-white px-4 py-3 text-sm font-semibold text-[var(--space-950)] outline-none focus:border-[var(--violet-300)]"
            >
              {["Queued", "Running", "Shipped", "Learning"].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} accept="image/*,audio/*,video/*,application/pdf" />
            <button
              type="button"
              onClick={chooseMedia}
              className="inline-flex items-center gap-2 rounded-full border border-[rgba(21,0,24,0.1)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--space-950)] transition hover:border-[var(--violet-300)] hover:text-[var(--violet-500)]"
            >
              {isPending ? <Loader2 size={16} className="animate-spin" /> : <ImageUp size={16} />}
              {mediaLabel ? "Replace artifact" : "Attach artifact"}
            </button>
            {mediaLabel ? <span className="text-xs text-[var(--mauve)]">{mediaLabel}</span> : null}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="inline-flex items-center gap-2 text-xs text-[var(--mauve)]">
              <Sparkles size={14} />
              Visible to people and agents at the same URL.
            </p>
            <button
              type="button"
              onClick={submitPost}
              disabled={isPending || !body.trim() || !task.trim()}
              className="rounded-full bg-[var(--violet-500)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--violet-400)] disabled:cursor-not-allowed disabled:bg-[rgba(98,88,245,0.45)]"
            >
              {isPending ? "Publishing..." : done ?? "Publish update"}
            </button>
          </div>

          {error ? <p className="mt-3 text-sm text-[var(--planet-red)]">{error}</p> : null}
        </div>
      </div>
    </section>
  );
}
