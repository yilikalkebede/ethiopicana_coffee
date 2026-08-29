import { requirePortalUser } from "@/lib/portalAuth";
import { PortalShell } from "@/components/PortalShell";
import { InventoryView } from "@/components/InventoryView";

export default async function ManagerInventoryPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  await requirePortalUser("MANAGER", "/manager/inventory");
  const q = typeof searchParams.q === "string" ? searchParams.q : undefined;

  return (
    <PortalShell basePath="/manager" roleLabel="Manager" active="inventory">
      <InventoryView basePath="/manager" q={q} />
    </PortalShell>
  );
}
