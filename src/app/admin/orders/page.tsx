import { requirePortalUser } from "@/lib/portalAuth";
import { PortalShell } from "@/components/PortalShell";
import { OrdersView } from "@/components/OrdersView";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  await requirePortalUser("ADMIN", "/admin/orders");
  const q = typeof searchParams.q === "string" ? searchParams.q : undefined;
  const status = typeof searchParams.status === "string" ? searchParams.status : undefined;

  return (
    <PortalShell basePath="/admin" roleLabel="Admin" active="orders">
      <OrdersView basePath="/admin" q={q} status={status} />
    </PortalShell>
  );
}
