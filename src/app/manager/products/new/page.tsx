import { prisma } from "@/lib/prisma";
import { requirePortalUser } from "@/lib/portalAuth";
import { PortalShell } from "@/components/PortalShell";
import { ProductForm } from "@/components/ProductForm";

export default async function ManagerNewProductPage() {
  await requirePortalUser("MANAGER", "/manager/products/new");
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });

  return (
    <PortalShell basePath="/manager" roleLabel="Manager" active="products">
      <h1 className="text-3xl text-ink">New product</h1>
      <div className="mt-8">
        <ProductForm mode="create" basePath="/manager" categories={categories} />
      </div>
    </PortalShell>
  );
}
