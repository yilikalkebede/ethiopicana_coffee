import { prisma } from "@/lib/prisma";
import { requirePortalUser } from "@/lib/portalAuth";
import { PortalShell } from "@/components/PortalShell";
import { ProductForm } from "@/components/ProductForm";

export default async function AdminNewProductPage() {
  await requirePortalUser("ADMIN", "/admin/products/new");
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });

  return (
    <PortalShell basePath="/admin" roleLabel="Admin" active="products">
      <h1 className="text-3xl text-ink">New product</h1>
      <div className="mt-8">
        <ProductForm mode="create" basePath="/admin" categories={categories} />
      </div>
    </PortalShell>
  );
}
