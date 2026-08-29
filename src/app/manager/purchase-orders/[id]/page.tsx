import { requirePortalUser } from "@/lib/portalAuth";
import { PortalShell } from "@/components/PortalShell";
import { PurchaseOrderDetail } from "@/components/PurchaseOrderDetail";

export default async function ManagerPurchaseOrderDetailPage({ params }: { params: { id: string } }) {
  await requirePortalUser("MANAGER", `/manager/purchase-orders/${params.id}`);

  return (
    <PortalShell basePath="/manager" roleLabel="Manager" active="purchase-orders">
      <PurchaseOrderDetail id={params.id} />
    </PortalShell>
  );
}
