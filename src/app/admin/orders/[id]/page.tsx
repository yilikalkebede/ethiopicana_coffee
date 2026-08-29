import { requirePortalUser } from "@/lib/portalAuth";
import { PortalShell } from "@/components/PortalShell";
import { OrderDetailView } from "@/components/OrderDetailView";

export default async function AdminOrderDetailPage({ params }: { params: { id: string } }) {
  await requirePortalUser("ADMIN", `/admin/orders/${params.id}`);

  return (
    <PortalShell basePath="/admin" roleLabel="Admin" active="orders">
      <OrderDetailView id={params.id} />
    </PortalShell>
  );
}
