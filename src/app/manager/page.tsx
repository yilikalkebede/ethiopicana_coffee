import { prisma } from "@/lib/prisma";
import { requirePortalUser } from "@/lib/portalAuth";
import { PortalShell } from "@/components/PortalShell";

export default async function ManagerDashboardPage() {
  const user = await requirePortalUser("MANAGER", "/manager");

  // Prisma can't compare two columns of the same row in a `where` filter
  // directly, so low-stock is computed with a small raw query rather than
  // pulling every variant into memory to filter in JS.
  const [lowStockRows, pendingOrders] = await Promise.all([
    prisma
      .$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::bigint as count
        FROM "ProductVariant"
        WHERE active = true AND "inventoryQuantity" <= "lowStockThreshold"
      `
      .catch(() => [{ count: 0n }]),
    prisma.order.count({ where: { fulfillmentStatus: "UNFULFILLED" } }).catch(() => 0),
  ]);
  const lowStockCount = Number(lowStockRows[0]?.count ?? 0);

  return (
    <PortalShell basePath="/manager" roleLabel="Manager" active="dashboard">
      <p className="font-mono text-[11px] uppercase tracking-tag text-belt-700">Manager</p>
      <h1 className="mt-2 text-3xl text-ink">Operations dashboard</h1>

      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="border border-line p-6">
          <p className="font-body text-xs uppercase tracking-tag text-ink-soft">Unfulfilled orders</p>
          <p className="mt-2 font-display text-3xl text-ink">{pendingOrders}</p>
        </div>
        <div className="border border-line p-6">
          <p className="font-body text-xs uppercase tracking-tag text-ink-soft">Low-stock variants</p>
          <p className="mt-2 font-display text-3xl text-ink">{lowStockCount}</p>
        </div>
        <div className="border border-line p-6">
          <p className="font-body text-xs uppercase tracking-tag text-ink-soft">Signed in as</p>
          <p className="mt-2 font-display text-lg text-ink">{user.email} · {user.role}</p>
        </div>
      </div>

      <p className="mt-10 font-body text-sm text-ink-soft">
        Product and inventory management are in the sidebar. Purchase orders and fulfillment
        tools are still coming in a later phase.
      </p>
    </PortalShell>
  );
}
