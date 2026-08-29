import { requirePortalUser } from "@/lib/portalAuth";
import { PortalShell } from "@/components/PortalShell";
import { OrdersView } from "@/components/OrdersView";

export default async function ManagerOrdersPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  await requirePortalUser("MANAGER", "/manager/orders");
  const q = typeof searchParams.q === "string" ? searchParams.q : undefined;
  const status = typeof searchParams.status === "string" ? searchParams.status : undefined;

  return (
    <PortalShell basePath="/manager" roleLabel="Manager" active="orders">
      <OrdersView basePath="/manager" q={q} status={status} />
    </PortalShell>
  );
}
