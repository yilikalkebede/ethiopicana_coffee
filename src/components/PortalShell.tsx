import Link from "next/link";

type NavKey =
  | "dashboard"
  | "analytics"
  | "orders"
  | "products"
  | "inventory"
  | "purchase-orders"
  | "suppliers"
  | "monthly-coffee"
  | "journal"
  | "coupons"
  | "reviews"
  | "reward-tiers"
  | "users"
  | "settings";

/** Sidebar-nav shell shared by /admin and /manager so the portal reads as
 * one coherent app rather than disconnected pages. Purely presentational —
 * no interactivity, so it stays a server component. */
export function PortalShell({
  basePath,
  roleLabel,
  active,
  children,
}: {
  basePath: "/admin" | "/manager";
  roleLabel: string;
  active: NavKey;
  children: React.ReactNode;
}) {
  const links: { key: NavKey; label: string; href: string }[] = [
    { key: "dashboard", label: "Dashboard", href: basePath },
    { key: "analytics", label: "Analytics", href: `${basePath}/analytics` },
    { key: "orders", label: "Orders", href: `${basePath}/orders` },
    { key: "products", label: "Products", href: `${basePath}/products` },
    { key: "inventory", label: "Inventory", href: `${basePath}/inventory` },
    { key: "purchase-orders", label: "Purchase Orders", href: `${basePath}/purchase-orders` },
    { key: "suppliers", label: "Suppliers", href: `${basePath}/suppliers` },
    { key: "monthly-coffee", label: "Coffee of the Month", href: `${basePath}/monthly-coffee` },
    { key: "journal", label: "Journal", href: `${basePath}/journal` },
    { key: "coupons", label: "Coupons", href: `${basePath}/coupons` },
    { key: "reviews", label: "Reviews", href: `${basePath}/reviews` },
    { key: "reward-tiers", label: "Reward Tiers", href: `${basePath}/reward-tiers` },
  ];
  // User role management is admin-exclusive per the spec's permission
  // matrix — unlike products/inventory, this link never appears under
  // /manager.
  if (basePath === "/admin") {
    links.push({ key: "users", label: "Users", href: `${basePath}/users` });
    links.push({ key: "settings", label: "Settings", href: `${basePath}/settings` });
  }

  return (
    <div className="mx-auto flex max-w-7xl gap-10 px-6 py-12">
      <aside className="w-48 shrink-0">
        <p className="font-mono text-[11px] uppercase tracking-tag text-belt-700">{roleLabel}</p>
        <nav className="mt-4 space-y-1">
          {links.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              aria-current={active === link.key ? "page" : undefined}
              className={`block px-3 py-2 font-body text-sm transition-colors ${
                active === link.key ? "bg-belt-500 text-paper" : "text-ink hover:bg-belt-50"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
