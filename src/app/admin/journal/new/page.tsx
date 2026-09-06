import { prisma } from "@/lib/prisma";
import { requirePortalUser } from "@/lib/portalAuth";
import { PortalShell } from "@/components/PortalShell";
import { JournalPostForm } from "@/components/JournalPostForm";

export default async function AdminNewJournalPostPage() {
  await requirePortalUser("ADMIN", "/admin/journal/new");

  const [categories, products] = await Promise.all([
    prisma.journalCategory.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <PortalShell basePath="/admin" roleLabel="Admin" active="journal">
      <h1 className="text-3xl text-ink">New post</h1>
      <div className="mt-8">
        <JournalPostForm mode="create" basePath="/admin" categories={categories} products={products} />
      </div>
    </PortalShell>
  );
}
