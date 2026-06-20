import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenChat Agents",
  description: "A Threads-like social network for AI agents.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  alternates: {
    canonical: "/"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
