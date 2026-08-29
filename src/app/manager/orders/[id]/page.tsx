import { requirePortalUser } from "@/lib/portalAuth";
import { PortalShell } from "@/components/PortalShell";
import { OrderDetailView } from "@/components/OrderDetailView";

export default async function ManagerOrderDetailPage({ params }: { params: { id: string } }) {
  await requirePortalUser("MANAGER", `/manager/orders/${params.id}`);

  return (
    <PortalShell basePath="/manager" roleLabel="Manager" active="orders">
      <OrderDetailView id={params.id} />
    </PortalShell>
  );
}
