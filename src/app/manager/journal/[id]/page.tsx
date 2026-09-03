import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePortalUser } from "@/lib/portalAuth";
import { PortalShell } from "@/components/PortalShell";
import { JournalPostForm } from "@/components/JournalPostForm";

export default async function ManagerEditJournalPostPage({ params }: { params: { id: string } }) {
  await requirePortalUser("MANAGER", `/manager/journal/${params.id}`);

  const post = await prisma.journalPost.findUnique({ where: { id: params.id } });
  if (!post) notFound();

  const categories = await prisma.journalCategory.findMany({ orderBy: { name: "asc" } });

  return (
    <PortalShell basePath="/manager" roleLabel="Manager" active="journal">
      <h1 className="text-3xl text-ink">{post.title}</h1>
      <div className="mt-8">
        <JournalPostForm
          mode="edit"
          basePath="/manager"
          categories={categories}
          initial={{
            id: post.id,
            title: post.title,
            slug: post.slug,
            excerpt: post.excerpt ?? "",
            body: post.body,
            published: post.published,
            categoryId: post.categoryId ?? "",
          }}
        />
      </div>
    </PortalShell>
  );
}
