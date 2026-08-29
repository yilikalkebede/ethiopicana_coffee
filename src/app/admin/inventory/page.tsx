import { requirePortalUser } from "@/lib/portalAuth";
import { PortalShell } from "@/components/PortalShell";
import { InventoryView } from "@/components/InventoryView";

export default async function AdminInventoryPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  await requirePortalUser("ADMIN", "/admin/inventory");
  const q = typeof searchParams.q === "string" ? searchParams.q : undefined;

  return (
    <PortalShell basePath="/admin" roleLabel="Admin" active="inventory">
      <InventoryView basePath="/admin" q={q} />
    </PortalShell>
  );
}
