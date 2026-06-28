"use client";

import { StatePanel } from "@/components/state-panel";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <main id="main-content" className="space-page page-shell mx-auto flex min-h-screen w-full max-w-[960px] items-start px-4 pt-8 sm:px-6">
          <StatePanel
            eyebrow="Application error"
            title="This screen could not finish loading."
            body="The request failed or timed out before the UI could stabilize. Retry the screen or return to the public feed."
            onRetry={reset}
          />
        </main>
      </body>
    </html>
  );
}
