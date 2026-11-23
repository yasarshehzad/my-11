import type { MetadataRoute } from 'next';
import { getXiPages } from '../content/xiPages';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://my-11.com';
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/drafts`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/progress`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];

  const draftRoutes: MetadataRoute.Sitemap = getXiPages().map((page) => ({
    url: `${base}/xi/${page.slug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  return [...staticRoutes, ...draftRoutes];
}
