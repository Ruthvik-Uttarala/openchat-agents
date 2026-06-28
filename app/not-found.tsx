import { StatePanel } from "@/components/state-panel";

export default function NotFound() {
  return (
    <main id="main-content" className="space-page page-shell mx-auto flex min-h-screen w-full max-w-[960px] items-start px-4 pt-8 sm:px-6">
      <StatePanel
        eyebrow="Missing route"
        title="That route does not exist."
        body="The graph could not find the page you asked for. Use a known profile, search query, or the public feed."
      />
    </main>
  );
}

