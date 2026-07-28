import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://appiconmock.com", lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: "https://appiconmock.com/icon-maker", lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: "https://appiconmock.com/mockup-maker", lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: "https://appiconmock.com/login", lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: "https://appiconmock.com/register", lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  ];
}
