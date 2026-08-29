import { prisma } from "@/lib/prisma";

export type DailyRevenuePoint = { day: string; revenue: number; orders: number };
export type SubscriberPoint = { day: string; active: number };
export type ProductRevenue = { productId: string; name: string; revenue: number; units: number };
export type MonthlySummary = {
  thisMonthRevenue: number;
  lastMonthRevenue: number;
  thisMonthOrders: number;
  lastMonthOrders: number;
};

/**
 * Zero-filled daily revenue/order-count series over the trailing `days`
 * days (default 30) — a real read against paid orders only, never
 * fabricated. The LEFT JOIN against generate_series guarantees one row per
 * calendar day even when a day had no orders, so the line chart never
 * silently skips a gap.
 */
export async function getRevenueOverTime(days = 30): Promise<DailyRevenuePoint[]> {
  const rows = await prisma.$queryRaw<{ day: Date; revenue: number; orders: bigint }[]>`
    SELECT gs.day::date as day,
           COALESCE(SUM(o.total), 0)::float as revenue,
           COUNT(o.id)::bigint as orders
    FROM generate_series(NOW() - make_interval(days => ${days - 1}::int), NOW(), interval '1 day') gs(day)
    LEFT JOIN "Order" o
      ON DATE_TRUNC('day', o."createdAt") = DATE_TRUNC('day', gs.day)
      AND o."paymentStatus" = 'PAID'
    GROUP BY gs.day
    ORDER BY gs.day ASC
  `;
  return rows.map((r) => ({
    day: r.day.toISOString().slice(0, 10),
    revenue: r.revenue,
    orders: Number(r.orders),
  }));
}

/**
 * Approximated active-subscriber count per day over the trailing window —
 * "active" meaning created by that day and not yet cancelled as of that
 * day, derived from the real Subscription.createdAt/cancelledAt columns
 * (there's no separate daily-snapshot table, so this reconstructs the
 * trend from the two timestamps that do exist).
 */
export async function getActiveSubscribersOverTime(days = 30): Promise<SubscriberPoint[]> {
  const rows = await prisma.$queryRaw<{ day: Date; active: bigint }[]>`
    SELECT gs.day::date as day,
           (
             SELECT COUNT(*)::bigint FROM "Subscription" s
             WHERE s."createdAt" <= gs.day AND (s."cancelledAt" IS NULL OR s."cancelledAt" > gs.day)
           ) as active
    FROM generate_series(NOW() - make_interval(days => ${days - 1}::int), NOW(), interval '1 day') gs(day)
    ORDER BY gs.day ASC
  `;
  return rows.map((r) => ({ day: r.day.toISOString().slice(0, 10), active: Number(r.active) }));
}

/** Top products by real revenue from paid orders, all-time. */
export async function getTopProductsByRevenue(limit = 8): Promise<ProductRevenue[]> {
  const rows = await prisma.$queryRaw<{ productId: string; name: string; revenue: number; units: bigint }[]>`
    SELECT oi."productId" as "productId", p.name as name,
           COALESCE(SUM(oi.total), 0)::float as revenue,
           COALESCE(SUM(oi.quantity), 0)::bigint as units
    FROM "OrderItem" oi
    JOIN "Order" o ON o.id = oi."orderId"
    JOIN "Product" p ON p.id = oi."productId"
    WHERE o."paymentStatus" = 'PAID'
    GROUP BY oi."productId", p.name
    ORDER BY revenue DESC
    LIMIT ${limit}
  `;
  return rows.map((r) => ({ productId: r.productId, name: r.name, revenue: r.revenue, units: Number(r.units) }));
}

export async function getMonthlySummary(): Promise<MonthlySummary> {
  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [thisMonth, lastMonth] = await Promise.all([
    prisma.order.aggregate({
      where: { paymentStatus: "PAID", createdAt: { gte: startOfThisMonth } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.order.aggregate({
      where: { paymentStatus: "PAID", createdAt: { gte: startOfLastMonth, lt: startOfThisMonth } },
      _sum: { total: true },
      _count: true,
    }),
  ]);

  return {
    thisMonthRevenue: Number(thisMonth._sum.total ?? 0),
    lastMonthRevenue: Number(lastMonth._sum.total ?? 0),
    thisMonthOrders: thisMonth._count,
    lastMonthOrders: lastMonth._count,
  };
}
