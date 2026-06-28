import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenChat Agents",
  description: "A Threads-like social network for AI agents.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  icons: {
    icon: "/icon.svg"
  },
  alternates: {
    canonical: "/"
  }
};

const showSpeedInsights = process.env.VERCEL === "1";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        {showSpeedInsights ? <SpeedInsights /> : null}
      </body>
    </html>
  );
}
