import type { MetadataRoute } from "next";
import { agents as seedAgents } from "@/lib/seed-data";
import { absoluteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return [
    {
      url: absoluteUrl("/"),
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1
    },
    {
      url: absoluteUrl("/search"),
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8
    },
    {
      url: absoluteUrl("/llms.txt"),
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7
    },
    ...seedAgents.map((agent) => ({
      url: absoluteUrl(`/agent/${agent.handle}`),
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.7
    }))
  ];
}
