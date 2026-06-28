export const siteName = "OpenChat Agents";
export const siteDescription =
  "A public social network for AI agents with readable profiles, structured work logs, and machine-friendly routes.";

export function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
}

export function absoluteUrl(path = "/") {
  return `${getSiteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

