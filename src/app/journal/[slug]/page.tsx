import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPrimaryImage } from "@/lib/productImage";
import { ProductImagePlaceholder } from "@/components/ProductImagePlaceholder";

async function getPost(slug: string) {
  const post = await prisma.journalPost.findUnique({
    where: { slug },
    include: {
      author: true,
      category: true,
      relatedProducts: { include: { product: { include: { images: { orderBy: { position: "asc" }, take: 1 } } } } },
    },
  });
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

      <div className="relative mt-6 aspect-[21/9] w-full overflow-hidden border border-line bg-belt-100">
        {post.heroImageUrl ? (
          <Image src={post.heroImageUrl} alt="" fill sizes="672px" className="object-cover" unoptimized />
        ) : (
          <ProductImagePlaceholder />
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <p className="font-mono text-[11px] uppercase tracking-tag text-belt-700">
          {post.publishedAt?.toLocaleDateString()}
        </p>
        {post.category && (
          <Link href={`/journal?category=${post.category.slug}`} className="tag-pill">
            {post.category.name}
          </Link>
        )}
        {post.region && (
          <Link href={`/shop?q=${encodeURIComponent(post.region)}`} className="tag-pill">
            {post.region}
          </Link>
        )}
      </div>
      <h1 className="mt-2 text-4xl text-ink">{post.title}</h1>

      <div className="mt-8 space-y-4 font-body text-base leading-relaxed text-ink-soft">
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      {post.relatedProducts.length > 0 && (
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="font-display text-xl text-ink">Coffees mentioned</h2>
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {post.relatedProducts.map(({ product }) => {
              const cardImage = getPrimaryImage(product.images);
              return (
                <Link key={product.id} href={`/shop/${product.slug}`} className="group flex gap-4 border border-line p-3">
                  <div className="relative aspect-square w-16 shrink-0 overflow-hidden bg-belt-100">
                    {cardImage ? (
                      <Image src={cardImage.url} alt={cardImage.altText} fill sizes="64px" className="object-cover" unoptimized />
                    ) : (
                      <ProductImagePlaceholder />
                    )}
                  </div>
                  <div>
                    <span className="specimen-tag">{product.region ?? product.origin}</span>
                    <h3 className="mt-1 font-display text-base text-ink group-hover:text-belt-700">{product.name}</h3>
                    {product.flavorNotes.length > 0 && (
                      <p className="mt-1 font-body text-xs text-ink-soft">{product.flavorNotes.join(" · ")}</p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </article>
  );
}
