import Link from "next/link";
import { prisma } from "@/lib/prisma";

// Only ever shows a category with at least one real published post -- same
// "never show a dead filter" rule as the homepage/shop flavor filters
// (src/app/page.tsx's getFlavorCategories).
async function getCategoriesWithCounts() {
  const categories = await prisma.journalCategory.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { posts: { where: { published: true } } } } },
  });
  return categories
    .map((c) => ({ slug: c.slug, name: c.name, count: c._count.posts }))
    .filter((c) => c.count > 0);
}

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const categorySlug = typeof searchParams.category === "string" ? searchParams.category : undefined;

  const [posts, categories] = await Promise.all([
    prisma.journalPost.findMany({
      where: { published: true, ...(categorySlug ? { category: { slug: categorySlug } } : {}) },
      orderBy: { publishedAt: "desc" },
      include: { category: true },
    }),
    getCategoriesWithCounts(),
  ]);

  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <span className="specimen-tag">Field journal</span>
      <h1 className="mt-6 text-4xl text-ink">Brewing guides &amp; coffee education</h1>

      {categories.length > 0 && (
        <div className="mt-8 flex flex-wrap gap-2">
          <Link href="/journal" className={`tag-pill ${!categorySlug ? "border-belt-500 text-belt-700" : ""}`}>
            All posts
          </Link>
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/journal?category=${c.slug}`}
              className={`tag-pill ${categorySlug === c.slug ? "border-belt-500 text-belt-700" : ""}`}
            >
              {c.name} ({c.count})
            </Link>
          ))}
        </div>
      )}

      {posts.length === 0 ? (
        <p className="mt-10 font-body text-sm text-ink-soft">Nothing published yet — check back soon.</p>
      ) : (
        <div className="mt-10 divide-y divide-line border-y border-line">
          {posts.map((post) => (
            <Link key={post.id} href={`/journal/${post.slug}`} className="block py-6 hover:bg-belt-50/50">
              <div className="flex flex-wrap items-center gap-3">
                <p className="font-mono text-[11px] uppercase tracking-tag text-belt-700">
                  {post.publishedAt?.toLocaleDateString()}
                </p>
                {post.category && <span className="tag-pill">{post.category.name}</span>}
              </div>
              <h2 className="mt-2 font-display text-xl text-ink">{post.title}</h2>
              {post.excerpt && <p className="mt-2 font-body text-sm text-ink-soft">{post.excerpt}</p>}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
