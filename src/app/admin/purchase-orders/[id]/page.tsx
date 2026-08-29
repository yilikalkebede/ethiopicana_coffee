import { requirePortalUser } from "@/lib/portalAuth";
import { PortalShell } from "@/components/PortalShell";
import { PurchaseOrderDetail } from "@/components/PurchaseOrderDetail";

export default async function AdminPurchaseOrderDetailPage({ params }: { params: { id: string } }) {
  await requirePortalUser("ADMIN", `/admin/purchase-orders/${params.id}`);

  return (
    <PortalShell basePath="/admin" roleLabel="Admin" active="purchase-orders">
      <PurchaseOrderDetail id={params.id} />
    </PortalShell>
  );
}
