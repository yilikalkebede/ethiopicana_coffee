import { requirePortalUser } from "@/lib/portalAuth";
import { PortalShell } from "@/components/PortalShell";
import { ProductListView } from "@/components/ProductListView";

export default async function ManagerProductsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  await requirePortalUser("MANAGER", "/manager/products");
  const q = typeof searchParams.q === "string" ? searchParams.q : undefined;

  return (
    <PortalShell basePath="/manager" roleLabel="Manager" active="products">
      <ProductListView basePath="/manager" q={q} />
    </PortalShell>
  );
}
