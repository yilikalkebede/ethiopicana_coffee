import {
  getRevenueOverTime,
  getActiveSubscribersOverTime,
  getTopProductsByRevenue,
  getMonthlySummary,
} from "@/lib/analytics";
import { formatPrice } from "@/lib/format";
import { LineChart } from "@/components/analytics/LineChart";
import { BarChart } from "@/components/analytics/BarChart";

function monthOverMonthLabel(current: number, previous: number): string {
  if (previous === 0) return current > 0 ? "New this month" : "No change";
  const pct = ((current - previous) / previous) * 100;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(0)}% vs. last month`;
}

export async function AnalyticsView() {
  const [revenueSeries, subscriberSeries, topProducts, monthly] = await Promise.all([
    getRevenueOverTime(30),
    getActiveSubscribersOverTime(30),
    getTopProductsByRevenue(8),
    getMonthlySummary(),
  ]);

  const windowRevenue = revenueSeries.reduce((sum, d) => sum + d.revenue, 0);
  const windowOrders = revenueSeries.reduce((sum, d) => sum + d.orders, 0);
  const aov = windowOrders > 0 ? windowRevenue / windowOrders : 0;

  const revenuePoints = revenueSeries.map((d) => ({
    label: new Date(d.day).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    value: d.revenue,
  }));
  const orderPoints = revenueSeries.map((d) => ({
    label: new Date(d.day).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    value: d.orders,
  }));
  const subscriberPoints = subscriberSeries.map((d) => ({
    label: new Date(d.day).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    value: d.active,
  }));
  const productBars = topProducts.map((p) => ({ label: p.name, value: p.revenue }));

  return (
    <div>
      <h1 className="text-3xl text-ink">Analytics</h1>
      <p className="mt-2 font-body text-sm text-ink-soft">
        Real figures from paid orders and subscriptions — nothing here is simulated traffic or conversion data.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-4">
        <div className="border border-line p-6">
          <p className="font-body text-xs uppercase tracking-tag text-ink-soft">Revenue this month</p>
          <p className="mt-2 font-display text-2xl text-ink">{formatPrice(monthly.thisMonthRevenue)}</p>
          <p className="mt-1 font-body text-xs text-ink-soft">
            {monthOverMonthLabel(monthly.thisMonthRevenue, monthly.lastMonthRevenue)}
          </p>
        </div>
        <div className="border border-line p-6">
          <p className="font-body text-xs uppercase tracking-tag text-ink-soft">Orders this month</p>
          <p className="mt-2 font-display text-2xl text-ink">{monthly.thisMonthOrders}</p>
          <p className="mt-1 font-body text-xs text-ink-soft">
            {monthOverMonthLabel(monthly.thisMonthOrders, monthly.lastMonthOrders)}
          </p>
        </div>
        <div className="border border-line p-6">
          <p className="font-body text-xs uppercase tracking-tag text-ink-soft">Avg. order value (30d)</p>
          <p className="mt-2 font-display text-2xl text-ink">{formatPrice(aov)}</p>
        </div>
        <div className="border border-line p-6">
          <p className="font-body text-xs uppercase tracking-tag text-ink-soft">Active subscribers</p>
          <p className="mt-2 font-display text-2xl text-ink">
            {subscriberSeries[subscriberSeries.length - 1]?.active ?? 0}
          </p>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div className="border border-line p-6">
          <h2 className="font-display text-lg text-ink">Revenue, last 30 days</h2>
          <div className="mt-4">
            <LineChart data={revenuePoints} formatValue={formatPrice} />
          </div>
        </div>
        <div className="border border-line p-6">
          <h2 className="font-display text-lg text-ink">Orders, last 30 days</h2>
          <div className="mt-4">
            <LineChart data={orderPoints} color="#4a6b4a" />
          </div>
        </div>
        <div className="border border-line p-6">
          <h2 className="font-display text-lg text-ink">Active subscribers, last 30 days</h2>
          <div className="mt-4">
            <LineChart data={subscriberPoints} color="#6b4a8a" />
          </div>
        </div>
        <div className="border border-line p-6">
          <h2 className="font-display text-lg text-ink">Top products by revenue</h2>
          <div className="mt-4">
            <BarChart data={productBars} formatValue={formatPrice} />
          </div>
        </div>
      </div>
    </div>
  );
}
