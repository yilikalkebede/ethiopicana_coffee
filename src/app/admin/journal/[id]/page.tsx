import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePortalUser } from "@/lib/portalAuth";
import { PortalShell } from "@/components/PortalShell";
import { JournalPostForm } from "@/components/JournalPostForm";
import { JournalHeroImagePanel } from "@/components/JournalHeroImagePanel";

export default async function AdminEditJournalPostPage({ params }: { params: { id: string } }) {
  await requirePortalUser("ADMIN", `/admin/journal/${params.id}`);

  const post = await prisma.journalPost.findUnique({
    where: { id: params.id },
    include: { relatedProducts: true },
  });
  if (!post) notFound();

  const [categories, products] = await Promise.all([
    prisma.journalCategory.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <PortalShell basePath="/admin" roleLabel="Admin" active="journal">
      <h1 className="text-3xl text-ink">{post.title}</h1>
      <div className="mt-8">
        <JournalPostForm
          mode="edit"
          basePath="/admin"
          categories={categories}
          products={products}
          initial={{
            id: post.id,
            title: post.title,
            slug: post.slug,
            excerpt: post.excerpt ?? "",
            body: post.body,
            published: post.published,
            categoryId: post.categoryId ?? "",
            region: post.region ?? "",
            relatedProductIds: post.relatedProducts.map((r) => r.productId),
          }}
        />
      </div>
      <div className="mt-8">
        <JournalHeroImagePanel postId={post.id} heroImageUrl={post.heroImageUrl} />
      </div>
    </PortalShell>
  );
}
