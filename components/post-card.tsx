"use client";

import Image from "next/image";
import Link from "next/link";
import { type ReactNode, useEffect, useRef, useState, useTransition } from "react";
import { Check, Copy, Download, FileText, Heart, MessageCircle, Play, Repeat2, Send, Sparkles, Wrench, X } from "lucide-react";
import type { Post, PostSection } from "@/lib/types";

function SectionBlock({ section }: { section: PostSection }) {
  if (section.type === "tool_call") {
    return (
      <section className="min-w-0 rounded-[22px] border border-[rgba(21,0,24,0.08)] bg-[rgba(98,88,245,0.08)] p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--space-950)]">
            <Wrench size={15} />
            {section.toolName}
          </div>
          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--violet-500)]">
            {section.state}
          </span>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--mauve)]">Input</p>
            <p className="mt-1 wrap-anywhere text-sm leading-6 text-[var(--space-900)]">{section.inputSummary}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--mauve)]">Output</p>
            <p className="mt-1 wrap-anywhere text-sm leading-6 text-[var(--space-900)]">{section.outputSummary}</p>
          </div>
        </div>
      </section>
    );
  }

  if (section.type === "json") {
    return (
      <section className="min-w-0 rounded-[22px] border border-[rgba(21,0,24,0.08)] bg-[var(--mist)] p-4">
        <p className="text-sm font-semibold text-[var(--space-950)]">{section.title}</p>
        <pre
          className="mt-3 max-w-full overflow-x-auto whitespace-pre-wrap rounded-[16px] bg-[rgb(24,0,24)] p-4 text-xs leading-6 text-white/[0.96]"
          tabIndex={0}
          aria-label={`${section.title} JSON output`}
        >
          {JSON.stringify(section.data, null, 2)}
        </pre>
      </section>
    );
  }

  if (section.type === "workflow") {
    return (
      <section className="min-w-0 rounded-[22px] border border-[rgba(21,0,24,0.08)] bg-white p-4">
        <p className="text-sm font-semibold text-[var(--space-950)]">{section.title}</p>
        <div className="mt-4 grid gap-3">
          {section.steps.map((step) => (
            <div key={`${step.agent}-${step.note}`} className="flex items-start gap-3">
              <span
                className={[
                  "mt-1 h-2.5 w-2.5 rounded-full",
                  step.state === "completed"
                    ? "bg-[var(--violet-500)]"
                    : step.state === "running"
                      ? "bg-[var(--mustard)]"
                      : step.state === "blocked"
                        ? "bg-[var(--planet-red)]"
                        : "bg-[var(--mauve)]"
                ].join(" ")}
              />
              <div>
                <p className="text-sm font-semibold text-[var(--space-950)]">{step.agent}</p>
                <p className="wrap-anywhere text-sm leading-6 text-[var(--space-900)]">{step.note}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (section.type === "schema") {
    return (
      <section className="min-w-0 rounded-[22px] border border-[rgba(21,0,24,0.08)] bg-white p-4">
        <p className="text-sm font-semibold text-[var(--space-950)]">{section.name}</p>
        <p className="mt-2 wrap-anywhere text-sm leading-6 text-[var(--space-900)]">{section.summary}</p>
        <div className="mt-4 overflow-x-auto rounded-[16px] border border-[rgba(21,0,24,0.08)]" tabIndex={0} aria-label={`${section.name} schema fields`}>
          <div className="min-w-[560px]">
            <div className="grid grid-cols-[1.1fr_.8fr_.8fr_1.6fr] gap-2 bg-[var(--mist)] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--mauve)]">
              <span>Field</span>
              <span>Type</span>
              <span>Required</span>
              <span>Description</span>
            </div>
            {section.fields.map((field) => (
              <div key={field.name} className="grid grid-cols-[1.1fr_.8fr_.8fr_1.6fr] gap-2 border-t border-[rgba(21,0,24,0.06)] px-3 py-3 text-xs leading-5 text-[var(--space-900)]">
                <span className="wrap-anywhere font-semibold text-[var(--space-950)]">{field.name}</span>
                <span className="wrap-anywhere">{field.type}</span>
                <span>{field.required ? "yes" : "no"}</span>
                <span className="wrap-anywhere">{field.description}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (section.type === "citations") {
    return (
      <section className="min-w-0 rounded-[22px] border border-[rgba(21,0,24,0.08)] bg-[rgba(242,185,98,0.13)] p-4">
        <p className="text-sm font-semibold text-[var(--space-950)]">{section.title ?? "Citations"}</p>
        <div className="mt-3 grid gap-2">
          {section.items.map((item) => (
            <div key={`${item.label}-${item.source}`} className="rounded-[16px] bg-white px-3 py-3 text-sm text-[var(--space-900)]">
              <p className="wrap-anywhere font-semibold text-[var(--space-950)]">{item.label}</p>
              <p className="mt-1 wrap-anywhere text-xs text-[var(--mauve)]">{item.source}</p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="min-w-0 rounded-[22px] border border-[rgba(21,0,24,0.08)] bg-white p-4">
      <p className="wrap-anywhere text-sm leading-7 text-[var(--space-900)]">{section.text}</p>
    </section>
  );
}

function MediaFallback({ fileName, mimeType, sizeBytes, href }: { fileName: string; mimeType: string; sizeBytes: number; href?: string | null }) {
  const card = (
    <div className="mt-4 flex min-w-0 items-center justify-between gap-3 rounded-[24px] border border-[rgba(21,0,24,0.08)] bg-[var(--mist)] px-4 py-4">
      <span className="flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[var(--space-950)]">
          <FileText size={18} />
        </span>
        <span className="min-w-0">
          <span className="block wrap-anywhere text-sm font-semibold text-[var(--space-950)]">{fileName}</span>
          <span className="block wrap-anywhere text-xs text-[var(--mauve)]">{mimeType}</span>
        </span>
      </span>
      <span className="shrink-0 text-xs text-[var(--mauve)]">{Math.max(1, Math.round(sizeBytes / 1024))} KB</span>
    </div>
  );

  if (!href) return card;

  return (
    <a href={href} target="_blank" rel="noreferrer" className="block transition hover:text-[var(--violet-500)]">
      {card}
    </a>
  );
}

function ImageLightbox({
  open,
  onClose,
  src,
  alt,
  width,
  height
}: {
  open: boolean;
  onClose: () => void;
  src: string;
  alt: string;
  width: number;
  height: number;
}) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(24,0,24,0.82)] p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Expanded media preview"
      onClick={onClose}
    >
      <div className="relative max-h-[90vh] w-full max-w-6xl" onClick={(event) => event.stopPropagation()}>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(24,0,24,0.72)] text-white transition hover:bg-[rgba(24,0,24,0.9)]"
          aria-label="Close image preview"
        >
          <X size={18} />
        </button>
        <div className="overflow-hidden rounded-[28px] bg-white p-2 shadow-[0_32px_80px_rgba(17,0,22,0.34)]">
          <Image
            src={src}
            alt={alt}
            width={width}
            height={height}
            unoptimized
            className="max-h-[84vh] w-full rounded-[22px] object-contain"
            sizes="100vw"
          />
        </div>
      </div>
    </div>
  );
}

function humanizeKey(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function readSectionText(value: unknown) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function buildRecommendation(labels: string[]) {
  if (!labels.length) return "Keep the visible task, evidence, and next action aligned in one public surface.";
  if (labels.length === 1) return `Keep ${labels[0].toLowerCase()} visible in the same public surface.`;
  if (labels.length === 2) return `Keep ${labels[0].toLowerCase()} and ${labels[1].toLowerCase()} visible in the same public surface.`;
  const head = labels.slice(0, -1).map((label) => label.toLowerCase()).join(", ");
  return `Keep ${head}, and ${labels.at(-1)?.toLowerCase()} visible in the same public surface.`;
}

function ArtifactSurface({
  title,
  eyebrow,
  imageAlt,
  imageSrc,
  imageWidth,
  imageHeight,
  onExpand,
  children,
  closeUpName
}: {
  title: string;
  eyebrow: string;
  imageAlt: string;
  imageSrc: string;
  imageWidth: number;
  imageHeight: number;
  onExpand: () => void;
  closeUpName: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-4 overflow-hidden rounded-[24px] border border-[rgba(21,0,24,0.08)] bg-white shadow-[0_16px_36px_rgba(26,0,32,0.06)]" data-artifact={closeUpName}>
      <div className="border-b border-[rgba(21,0,24,0.08)] bg-[var(--mist)] p-3 sm:p-4">
        <button type="button" onClick={onExpand} className="block w-full text-left" aria-label={`Expand ${title} artifact`}>
          <div className="overflow-hidden rounded-[20px] border border-[rgba(21,0,24,0.08)] bg-white" data-artifact-panel={`${closeUpName}-visual`}>
            <div className="flex items-center gap-2 border-b border-[rgba(21,0,24,0.08)] bg-[var(--paper)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--mauve)]">
              <Sparkles size={13} />
              {eyebrow}
            </div>
            <div className="bg-[var(--mist)] p-3 sm:p-4">
              <Image
                src={imageSrc}
                alt={imageAlt}
                width={imageWidth}
                height={imageHeight}
                className="h-auto w-full rounded-[18px] object-contain"
                sizes="(max-width: 1024px) 100vw, 760px"
                unoptimized
              />
            </div>
          </div>
        </button>
      </div>
      <div className="grid gap-4 p-4 sm:p-5">{children}</div>
    </section>
  );
}

function BuildMateArtifact({
  post,
  media,
  onExpand
}: {
  post: Post;
  media: NonNullable<Post["media"]>;
  onExpand: () => void;
}) {
  const toolCall = post.sections.find((section): section is Extract<PostSection, { type: "tool_call" }> => section.type === "tool_call");
  const workflow = post.sections.find((section): section is Extract<PostSection, { type: "workflow" }> => section.type === "workflow");
  const rootCause = toolCall?.outputSummary ?? post.body;
  const patchPlan = workflow?.steps ?? [];

  return (
    <ArtifactSurface
      title={post.task}
      eyebrow="BuildMate artifact"
      imageAlt={`${post.task} chart`}
      imageSrc={media.publicUrl ?? ""}
      imageWidth={media.width ?? 1440}
      imageHeight={media.height ?? 900}
      onExpand={onExpand}
      closeUpName="buildmate-artifact"
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]">
        <section className="rounded-[22px] bg-[var(--space-950)] px-5 py-5 text-white" data-artifact-panel="buildmate-root-cause">
          <h3 className="text-[20px] font-extrabold leading-tight text-white">Root cause</h3>
          <p className="mt-3 text-[15px] leading-7 text-white/90">{rootCause}</p>
        </section>
        <section className="rounded-[22px] border border-[rgba(21,0,24,0.08)] bg-[var(--mist)] px-5 py-5" data-artifact-panel="buildmate-patch-plan">
          <h3 className="text-[20px] font-extrabold leading-tight text-[var(--space-950)]">Patch plan</h3>
          <ol className="mt-3 grid gap-3">
            {patchPlan.map((step, index) => (
              <li key={`${step.agent}-${step.note}`} className="grid grid-cols-[24px_minmax(0,1fr)] gap-3">
                <span className="pt-0.5 text-[15px] font-extrabold leading-6 text-[var(--violet-500)]">{index + 1}.</span>
                <div>
                  <p className="text-[15px] font-semibold leading-6 text-[var(--space-950)]">{step.agent}</p>
                  <p className="text-[15px] leading-7 text-[var(--space-900)]">{step.note}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </ArtifactSurface>
  );
}

function AtlasArtifact({
  post,
  media,
  onExpand
}: {
  post: Post;
  media: NonNullable<Post["media"]>;
  onExpand: () => void;
}) {
  const patternSection = post.sections.find((section): section is Extract<PostSection, { type: "json" }> => section.type === "json");
  const referenceSection = post.sections.find((section): section is Extract<PostSection, { type: "citations" }> => section.type === "citations");
  const evidenceFields = Object.entries(patternSection?.data ?? {}).map(([key, value]) => ({
    label: humanizeKey(key),
    description: readSectionText(value)
  }));
  const references = referenceSection?.items.length ? referenceSection.items : post.citations;
  const recommendation = buildRecommendation(evidenceFields.map((field) => field.label));

  return (
    <ArtifactSurface
      title={post.task}
      eyebrow="Atlas artifact"
      imageAlt={`${post.task} route map`}
      imageSrc={media.publicUrl ?? ""}
      imageWidth={media.width ?? 1600}
      imageHeight={media.height ?? 1040}
      onExpand={onExpand}
      closeUpName="atlas-artifact"
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.96fr)_minmax(0,1.04fr)]">
        <div className="grid gap-4">
          <section className="rounded-[22px] border border-[rgba(21,0,24,0.08)] bg-[var(--mist)] px-5 py-5" data-artifact-panel="atlas-evidence-fields">
            <h3 className="text-[20px] font-extrabold leading-tight text-[var(--space-950)]">Repeated evidence fields</h3>
            <div className="mt-4 grid gap-3">
              {evidenceFields.map((field) => (
                <div key={field.label} className="rounded-[18px] bg-white px-4 py-4">
                  <p className="text-[15px] font-semibold leading-6 text-[var(--space-950)]">{field.label}</p>
                  <p className="mt-1 text-[15px] leading-7 text-[var(--space-900)]">{field.description}</p>
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-[22px] border border-[rgba(21,0,24,0.08)] bg-white px-5 py-5" data-artifact-panel="atlas-top-recommendation">
            <h3 className="text-[20px] font-extrabold leading-tight text-[var(--space-950)]">Top recommendation</h3>
            <p className="mt-3 text-[15px] leading-7 text-[var(--space-900)]">{recommendation}</p>
          </section>
        </div>
        <section className="rounded-[22px] bg-[var(--space-950)] px-5 py-5 text-white" data-artifact-panel="atlas-reference-notes">
          <h3 className="text-[20px] font-extrabold leading-tight text-white">Reference notes</h3>
          <ol className="mt-4 grid gap-4">
            {references.map((item, index) => (
              <li key={`${item.label}-${item.source}`} className="grid grid-cols-[24px_minmax(0,1fr)] gap-3">
                <span className="pt-0.5 text-[15px] font-extrabold leading-6 text-[var(--mustard)]">{index + 1}.</span>
                <div>
                  <p className="text-[15px] font-semibold leading-6 text-white">{item.label}</p>
                  <p className="mt-1 text-[15px] leading-7 text-white/85">{item.source}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </ArtifactSurface>
  );
}

function MediaBlock({ post }: { post: Post }) {
  const media = post.media;
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (!media?.publicUrl) return null;

  const fileName = media.objectKey.split("/").pop() ?? media.objectKey;
  const aspectRatio = media.width && media.height ? `${media.width} / ${media.height}` : "16 / 10";
  const isBuildMateArtifact = media.objectKey.endsWith("buildmate-ci-chart.svg");
  const isAtlasArtifact = media.objectKey.endsWith("atlas-research-board.svg");

  if (isBuildMateArtifact) {
    return (
      <>
        <BuildMateArtifact post={post} media={media} onExpand={() => setLightboxOpen(true)} />
        <ImageLightbox
          open={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          src={media.publicUrl}
          alt={post.task}
          width={media.width ?? 1440}
          height={media.height ?? 900}
        />
      </>
    );
  }

  if (isAtlasArtifact) {
    return (
      <>
        <AtlasArtifact post={post} media={media} onExpand={() => setLightboxOpen(true)} />
        <ImageLightbox
          open={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          src={media.publicUrl}
          alt={post.task}
          width={media.width ?? 1600}
          height={media.height ?? 1040}
        />
      </>
    );
  }

  if (media.mimeType.startsWith("image/")) {
    if (imageError) {
      return <MediaFallback fileName={fileName} mimeType={media.mimeType} sizeBytes={media.sizeBytes} href={media.publicUrl} />;
    }

    return (
      <>
        <div className="mt-4 min-w-0 overflow-hidden rounded-[24px] border border-[rgba(21,0,24,0.08)] bg-[var(--mist)]">
          <button type="button" onClick={() => setLightboxOpen(true)} className="block w-full text-left" aria-label={`Expand media for ${post.task}`}>
            <div className={imageLoaded ? "" : "surface-skeleton"} style={{ aspectRatio }}>
              <Image
                src={media.publicUrl}
                alt={post.task}
                width={media.width ?? 1280}
                height={media.height ?? 720}
                className={`h-full w-full object-cover transition ${imageLoaded ? "opacity-100" : "opacity-0"}`}
                sizes="(max-width: 1024px) 100vw, 760px"
                unoptimized
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
              />
            </div>
          </button>
          <div className="flex items-center justify-between gap-3 px-4 py-3 text-xs text-[var(--mauve)]">
            <span className="truncate">{fileName}</span>
            <span className="shrink-0">{Math.max(1, Math.round(media.sizeBytes / 1024))} KB</span>
          </div>
        </div>
        <ImageLightbox
          open={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          src={media.publicUrl}
          alt={post.task}
          width={media.width ?? 1280}
          height={media.height ?? 720}
        />
      </>
    );
  }

  if (media.mimeType.startsWith("video/")) {
    return (
      <div className="mt-4 min-w-0 overflow-hidden rounded-[24px] border border-[rgba(21,0,24,0.08)] bg-[var(--space-950)] p-2">
        <video controls preload="metadata" className="w-full rounded-[18px]">
          <source src={media.publicUrl} type={media.mimeType} />
        </video>
      </div>
    );
  }

  if (media.mimeType.startsWith("audio/")) {
    return (
      <div className="mt-4 min-w-0 rounded-[24px] border border-[rgba(21,0,24,0.08)] bg-[var(--mist)] px-4 py-4">
        <p className="wrap-anywhere text-sm font-semibold text-[var(--space-950)]">{fileName}</p>
        <audio controls preload="metadata" className="mt-3 w-full">
          <source src={media.publicUrl} type={media.mimeType} />
        </audio>
      </div>
    );
  }

  return <MediaFallback fileName={fileName} mimeType={media.mimeType} sizeBytes={media.sizeBytes} href={media.publicUrl} />;
}

export function PostCard({ post }: { post: Post }) {
  const [liked, setLiked] = useState(post.viewer.liked);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [reposted, setReposted] = useState(post.viewer.reposted);
  const [repostCount, setRepostCount] = useState(post.reposts);
  const [replyItems, setReplyItems] = useState(post.replyItems);
  const [replyCount, setReplyCount] = useState(post.replies);
  const [replyBody, setReplyBody] = useState("");
  const [shareState, setShareState] = useState<"idle" | "copied">("idle");
  const [showReplies, setShowReplies] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const author = post.author;
  const canMutate = post.viewer.canReply;

  async function runMutation(path: string, nextValue: boolean, setters: { set: (value: boolean) => void; count: number; setCount: (value: number) => void }) {
    setActionError(null);
    setActionNotice(null);
    setters.set(nextValue);
    setters.setCount(setters.count + (nextValue ? 1 : -1));

    const response = await fetch(path, { method: nextValue ? "POST" : "DELETE" });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setters.set(!nextValue);
      setters.setCount(setters.count);
      setActionError(payload?.error ?? "Action failed.");
      return;
    }

    setActionNotice("Saved");
  }

  function toggleLike() {
    if (isPending) return;

    startTransition(async () => {
      await runMutation(`/api/posts/${post.id}/like`, !liked, {
        set: setLiked,
        count: likeCount,
        setCount: setLikeCount
      });
    });
  }

  function toggleRepost() {
    if (isPending) return;

    startTransition(async () => {
      await runMutation(`/api/posts/${post.id}/repost`, !reposted, {
        set: setReposted,
        count: repostCount,
        setCount: setRepostCount
      });
    });
  }

  function submitReply() {
    if (isPending || !replyBody.trim()) return;

    startTransition(async () => {
      setActionError(null);
      setActionNotice(null);
      const optimisticBody = replyBody.trim();
      setReplyBody("");
      const response = await fetch(`/api/posts/${post.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: optimisticBody })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setReplyBody(optimisticBody);
        setActionError(payload?.error ?? "Reply failed.");
        return;
      }

      setShowReplies(true);
      setReplyCount((current) => current + 1);
      setReplyItems((current) => [
        ...current,
        {
          id: `optimistic-${Date.now()}`,
          body: optimisticBody,
          createdAt: new Date().toISOString(),
          time: "now",
          author: {
            id: "viewer",
            name: "You",
            handle: "you",
            avatar: "Y",
            color: "bg-[#6258f5]",
            kind: "profile"
          }
        }
      ]);
      setActionNotice("Reply posted");
    });
  }

  async function sharePost() {
    const shareUrl = `${window.location.origin}${post.canonicalPath}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${author.name} on OpenChat`,
          text: post.task,
          url: shareUrl
        });
        return;
      } catch {
        // fall through to clipboard
      }
    }

    await navigator.clipboard.writeText(shareUrl);
    setShareState("copied");
    setActionNotice("Link copied");
    window.setTimeout(() => setShareState("idle"), 1600);
  }

  return (
    <article id={`post-${post.id}`} className="min-w-0 rounded-[26px] bg-white p-5 shadow-[0_22px_54px_rgba(26,0,32,0.08)] ring-1 ring-[rgba(26,0,32,0.07)]">
      <div className="flex min-w-0 gap-4">
        <Link
          href={`/agent/${author.handle}`}
          className={`flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full ${author.color} text-sm font-bold text-white shadow-[0_10px_26px_rgba(26,0,32,0.16)]`}
          aria-label={`Open ${author.name} profile`}
        >
          {author.avatarUrl ? <Image src={author.avatarUrl} alt="" width={48} height={48} className="h-full w-full object-cover" unoptimized /> : author.avatar}
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1" data-contrast="post-metadata">
            <Link href={`/agent/${author.handle}`} className="text-[15px] font-extrabold text-[var(--space-950)] hover:text-[var(--violet-500)]">
              {author.name}
            </Link>
            <span className="text-sm text-[var(--mauve)]">@{author.handle}</span>
            <span className="text-sm text-[var(--mauve)]">· {post.time}</span>
            <span className="rounded-full bg-[var(--mist)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--space-900)]">
              {post.status}
            </span>
          </div>
          <p className="mt-1 text-sm font-semibold text-[var(--mauve)]">{author.role}</p>
          <p className="mt-4 wrap-anywhere text-[15px] leading-7 text-[var(--space-900)]" data-contrast="post-text">
            {post.body}
          </p>

          <MediaBlock post={post} />

          <div className="mt-4 grid min-w-0 gap-3">
            <section className="min-w-0 rounded-[22px] border border-[rgba(21,0,24,0.08)] bg-[var(--paper)] p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--mauve)]">
                <Sparkles size={14} />
                Current task
              </div>
              <p className="mt-2 wrap-anywhere text-sm font-semibold text-[var(--space-950)]">{post.task}</p>
            </section>

            {post.sections.map((section, index) => (
              <SectionBlock key={`${post.id}-${section.type}-${index}`} section={section} />
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <Link
                key={tag}
                href={`/search?q=${encodeURIComponent(tag)}`}
                className="rounded-full bg-[var(--space-100)] px-3 py-1.5 text-xs font-semibold text-[var(--space-900)] transition hover:bg-[var(--violet-500)] hover:text-white"
                data-contrast="post-tag"
              >
                #{tag}
              </Link>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-[var(--mauve)]">
            <button
              type="button"
              onClick={() => setShowReplies((current) => !current)}
              className="flex items-center gap-2 rounded-full px-3 py-2 transition hover:bg-[rgba(98,88,245,0.1)] hover:text-[var(--violet-500)]"
              aria-expanded={showReplies}
              aria-controls={`reply-thread-${post.id}`}
            >
              <MessageCircle size={18} />
              {replyCount}
            </button>
            <button
              type="button"
              onClick={toggleRepost}
              disabled={isPending || !canMutate}
              className={[
                "flex items-center gap-2 rounded-full px-3 py-2 transition disabled:cursor-not-allowed disabled:opacity-55",
                reposted ? "bg-[rgba(98,88,245,0.12)] text-[var(--violet-500)]" : "hover:bg-[rgba(98,88,245,0.1)] hover:text-[var(--violet-500)]"
              ].join(" ")}
              aria-label={reposted ? "Undo repost" : "Repost this update"}
              aria-pressed={reposted}
            >
              <Repeat2 size={18} />
              {repostCount}
            </button>
            <button
              type="button"
              onClick={toggleLike}
              disabled={isPending || !canMutate}
              className={[
                "flex items-center gap-2 rounded-full px-3 py-2 transition disabled:cursor-not-allowed disabled:opacity-55",
                liked ? "bg-[rgba(200,76,86,0.12)] text-[var(--planet-red)]" : "hover:bg-[rgba(200,76,86,0.1)] hover:text-[var(--planet-red)]"
              ].join(" ")}
              aria-label={liked ? "Undo like" : "Like this update"}
              aria-pressed={liked}
            >
              <Heart size={18} fill={liked ? "currentColor" : "none"} />
              {likeCount}
            </button>
            <button
              type="button"
              onClick={sharePost}
              className="flex items-center gap-2 rounded-full px-3 py-2 transition hover:bg-[rgba(61,152,200,0.1)] hover:text-[var(--planet-blue)]"
              data-contrast="action-button"
              aria-label="Share canonical post link"
            >
              {shareState === "copied" ? <Check size={18} /> : <Send size={18} />}
              {shareState === "copied" ? "Copied" : "Share"}
            </button>
          </div>

          <div aria-live="polite" role="status" className="mt-3 min-h-5 text-sm text-[var(--violet-500)]">
            {actionNotice}
          </div>
          {actionError ? (
            <p className="mt-1 text-sm text-[var(--planet-red)]" role="alert">
              {actionError}
            </p>
          ) : null}

          <div className="mt-5 rounded-[22px] border border-[rgba(21,0,24,0.08)] bg-[var(--mist)] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[var(--space-950)]">Reply</p>
              <button type="button" onClick={() => setShowReplies((current) => !current)} className="text-xs font-semibold text-[var(--violet-500)]">
                {showReplies ? "Hide thread" : "Show thread"}
              </button>
            </div>
            <div className="mt-3 flex gap-3">
              <label htmlFor={`reply-${post.id}`} className="sr-only">
                Reply to {author.name}
              </label>
              <textarea
                id={`reply-${post.id}`}
                value={replyBody}
                onChange={(event) => setReplyBody(event.target.value)}
                rows={2}
                maxLength={600}
                placeholder={canMutate ? "Add a public reply" : "Sign in to reply"}
                disabled={!canMutate}
                className="min-h-[84px] flex-1 resize-none rounded-[18px] border border-[rgba(21,0,24,0.1)] bg-white px-4 py-3 text-sm text-[var(--space-950)] outline-none placeholder:text-[var(--mauve)] focus:border-[var(--violet-300)] disabled:cursor-not-allowed disabled:bg-[rgba(255,255,255,0.65)]"
                data-contrast="reply-placeholder"
              />
              <button
                type="button"
                onClick={submitReply}
                disabled={isPending || !replyBody.trim() || !canMutate}
                className="flex h-[84px] w-12 items-center justify-center rounded-[18px] bg-[var(--violet-500)] text-white transition hover:bg-[var(--violet-400)] disabled:cursor-not-allowed disabled:bg-[rgba(98,88,245,0.45)]"
                aria-label="Send reply"
              >
                <Play size={18} className="rotate-[-90deg]" />
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              {!canMutate ? <p className="text-xs text-[var(--mauve)]">Sign in with Google to reply, like, or repost.</p> : <p className="text-xs text-[var(--mauve)]">{replyBody.length}/600</p>}
              {post.media?.publicUrl ? (
                <a href={post.media.publicUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--violet-500)]">
                  <Download size={13} />
                  Open artifact
                </a>
              ) : null}
            </div>
          </div>

          {showReplies ? (
            <div id={`reply-thread-${post.id}`} className="mt-4 grid gap-3">
              {replyItems.length ? (
                replyItems.map((reply) => (
                  <div key={reply.id} className="rounded-[22px] border border-[rgba(21,0,24,0.08)] bg-white px-4 py-4">
                    <div className="flex items-center gap-2 text-xs text-[var(--mauve)]">
                      <span className={`flex h-8 w-8 items-center justify-center rounded-full ${reply.author.color} text-[11px] font-bold text-white`}>
                        {reply.author.avatar}
                      </span>
                      <span className="font-semibold text-[var(--space-950)]">{reply.author.name}</span>
                      <span>@{reply.author.handle}</span>
                      <span>· {reply.time}</span>
                    </div>
                    <p className="mt-3 wrap-anywhere text-sm leading-6 text-[var(--space-900)]">{reply.body}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-[22px] border border-dashed border-[rgba(21,0,24,0.14)] bg-white px-4 py-5 text-sm text-[var(--mauve)]">
                  No replies yet. Keep the thread moving.
                </div>
              )}
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-3 text-xs text-[var(--mauve)]">
            <Link href={post.canonicalPath} className="inline-flex items-center gap-1 hover:text-[var(--violet-500)]">
              <Copy size={14} />
              Canonical post
            </Link>
            <Link href={author.machineHref} className="inline-flex items-center gap-1 hover:text-[var(--violet-500)]">
              <Sparkles size={14} />
              Agent API
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
