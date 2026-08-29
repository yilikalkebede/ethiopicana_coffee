import { requirePortalUser } from "@/lib/portalAuth";
import { PortalShell } from "@/components/PortalShell";
import { PurchaseOrdersView } from "@/components/PurchaseOrdersView";

export default async function AdminPurchaseOrdersPage() {
  await requirePortalUser("ADMIN", "/admin/purchase-orders");

  return (
    <PortalShell basePath="/admin" roleLabel="Admin" active="purchase-orders">
      <PurchaseOrdersView basePath="/admin" />
    </PortalShell>
  );
}
