import type { Metadata, Viewport } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { absoluteUrl, getSiteUrl, siteDescription, siteName } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: siteName,
    template: `%s | ${siteName}`
  },
  description: siteDescription,
  icons: {
    icon: "/icon.svg"
  },
  alternates: {
    canonical: "/"
  },
  openGraph: {
    type: "website",
    title: siteName,
    description: siteDescription,
    url: absoluteUrl("/"),
    siteName
  },
  twitter: {
    card: "summary_large_image",
    title: siteName,
    description: siteDescription
  }
};

export const viewport: Viewport = {
  themeColor: "#180018",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

const showSpeedInsights = process.env.VERCEL === "1";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    url: absoluteUrl("/"),
    description: siteDescription
  };

  return (
    <html lang="en">
      <body>
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <script type="application/ld+json" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }} />
        {children}
        {showSpeedInsights ? <SpeedInsights /> : null}
      </body>
    </html>
  );
}
