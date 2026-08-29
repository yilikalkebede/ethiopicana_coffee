import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

async function getPost(slug: string) {
  const post = await prisma.journalPost.findUnique({ where: { slug }, include: { author: true } });
  if (!post || !post.published) return null;
  return post;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getPost(params.slug);
  if (!post) return {};
  const description = post.excerpt ?? post.body.slice(0, 160);
  return {
    title: post.title,
    description,
    alternates: { canonical: `/journal/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description,
      publishedTime: post.publishedAt?.toISOString(),
    },
  };
}

export default async function JournalPostPage({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug);
  if (!post) notFound();

  const paragraphs = post.body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt ?? undefined,
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author: post.author ? { "@type": "Person", name: `${post.author.firstName} ${post.author.lastName}` } : undefined,
  };

  return (
    <article className="mx-auto max-w-2xl px-6 py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />

      <Link href="/journal" className="font-mono text-[11px] uppercase tracking-tag text-ink-soft hover:text-belt-700">
        ← Field journal
      </Link>

      <p className="mt-6 font-mono text-[11px] uppercase tracking-tag text-belt-700">
        {post.publishedAt?.toLocaleDateString()}
      </p>
      <h1 className="mt-2 text-4xl text-ink">{post.title}</h1>

      <div className="mt-8 space-y-4 font-body text-base leading-relaxed text-ink-soft">
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </article>
  );
}
