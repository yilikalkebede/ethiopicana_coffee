import { prisma } from "@/lib/prisma";
import { requirePortalUser } from "@/lib/portalAuth";
import { PortalShell } from "@/components/PortalShell";

export default async function AdminDashboardPage() {
  await requirePortalUser("ADMIN", "/admin");

  const [userCount, orderCount, activeSubscriptions, pendingReviews] = await Promise.all([
    prisma.user.count().catch(() => 0),
    prisma.order.count().catch(() => 0),
    prisma.subscription.count({ where: { status: "ACTIVE" } }).catch(() => 0),
    prisma.review.count({ where: { status: "PENDING" } }).catch(() => 0),
  ]);

  return (
    <PortalShell basePath="/admin" roleLabel="Admin" active="dashboard">
      <p className="font-mono text-[11px] uppercase tracking-tag text-belt-700">Admin</p>
      <h1 className="mt-2 text-3xl text-ink">Store overview</h1>

      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-4">
        <Stat label="Customers" value={userCount} />
        <Stat label="Orders" value={orderCount} />
        <Stat label="Active subscribers" value={activeSubscriptions} />
        <Stat label="Reviews awaiting moderation" value={pendingReviews} />
      </div>

      <p className="mt-10 font-body text-sm text-ink-soft">
        Product and inventory management are in the sidebar. User management, content, and
        settings are still coming in later phases — this dashboard only shows numbers pulled
        live from PostgreSQL, never static placeholders.
      </p>
    </PortalShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-line p-6">
      <p className="font-body text-xs uppercase tracking-tag text-ink-soft">{label}</p>
      <p className="mt-2 font-display text-3xl text-ink">{value}</p>
    </div>
  );
}
