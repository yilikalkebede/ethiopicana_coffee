import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const STATIC_ROUTES = ["", "/shop", "/subscribe", "/origins", "/journal", "/about", "/contact", "/gifts"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, posts] = await Promise.all([
    prisma.product.findMany({ where: { active: true }, select: { slug: true, updatedAt: true } }),
    prisma.journalPost.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }),
  ]);

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${APP_URL}${route}`,
    lastModified: new Date(),
  }));

  const productEntries: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${APP_URL}/shop/${p.slug}`,
    lastModified: p.updatedAt,
  }));

  const journalEntries: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${APP_URL}/journal/${p.slug}`,
    lastModified: p.updatedAt,
  }));

  return [...staticEntries, ...productEntries, ...journalEntries];
}
