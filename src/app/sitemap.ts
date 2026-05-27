import type { MetadataRoute } from "next";

const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

const staticRoutes = [
  "",
  "/games",
  "/players",
  "/rankings",
  "/standings",
  "/statistics",
  "/teams",
  "/tournaments",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return staticRoutes.map((route) => ({
    url: `${appUrl}${route}`,
    lastModified: now,
    changeFrequency: route === "" ? "daily" : "weekly",
    priority: route === "" ? 1 : 0.8,
  }));
}
