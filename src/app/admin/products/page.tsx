import { requirePortalUser } from "@/lib/portalAuth";
import { PortalShell } from "@/components/PortalShell";
import { ProductListView } from "@/components/ProductListView";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  await requirePortalUser("ADMIN", "/admin/products");
  const q = typeof searchParams.q === "string" ? searchParams.q : undefined;

  return (
    <PortalShell basePath="/admin" roleLabel="Admin" active="products">
      <ProductListView basePath="/admin" q={q} />
    </PortalShell>
  );
}
