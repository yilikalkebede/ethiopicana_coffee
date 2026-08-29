import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function JournalPage() {
  const posts = await prisma.journalPost.findMany({
    where: { published: true },
    orderBy: { publishedAt: "desc" },
  });

  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <span className="specimen-tag">Field journal</span>
      <h1 className="mt-6 text-4xl text-ink">Brewing guides &amp; coffee education</h1>

      {posts.length === 0 ? (
        <p className="mt-10 font-body text-sm text-ink-soft">Nothing published yet — check back soon.</p>
      ) : (
        <div className="mt-10 divide-y divide-line border-y border-line">
          {posts.map((post) => (
            <Link key={post.id} href={`/journal/${post.slug}`} className="block py-6 hover:bg-belt-50/50">
              <p className="font-mono text-[11px] uppercase tracking-tag text-belt-700">
                {post.publishedAt?.toLocaleDateString()}
              </p>
              <h2 className="mt-2 font-display text-xl text-ink">{post.title}</h2>
              {post.excerpt && <p className="mt-2 font-body text-sm text-ink-soft">{post.excerpt}</p>}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
