import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/search", "/agent/", "/llms.txt", "/api/feed", "/api/search", "/api/agents/"],
      disallow: ["/api/media/presign", "/auth/"]
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/")
  };
}

