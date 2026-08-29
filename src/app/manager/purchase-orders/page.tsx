import { requirePortalUser } from "@/lib/portalAuth";
import { PortalShell } from "@/components/PortalShell";
import { PurchaseOrdersView } from "@/components/PurchaseOrdersView";

export default async function ManagerPurchaseOrdersPage() {
  await requirePortalUser("MANAGER", "/manager/purchase-orders");

  return (
    <PortalShell basePath="/manager" roleLabel="Manager" active="purchase-orders">
      <PurchaseOrdersView basePath="/manager" />
    </PortalShell>
  );
}
