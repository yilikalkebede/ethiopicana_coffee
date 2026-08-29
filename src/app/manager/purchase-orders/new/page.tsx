import { prisma } from "@/lib/prisma";
import { requirePortalUser } from "@/lib/portalAuth";
import { PortalShell } from "@/components/PortalShell";
import { PurchaseOrderForm } from "@/components/PurchaseOrderForm";

export default async function ManagerNewPurchaseOrderPage() {
  await requirePortalUser("MANAGER", "/manager/purchase-orders/new");

  const [suppliers, variants] = await Promise.all([
    prisma.supplier.findMany({ orderBy: { name: "asc" } }),
    prisma.productVariant.findMany({ include: { product: true }, orderBy: [{ product: { name: "asc" } }, { name: "asc" }] }),
  ]);

  return (
    <PortalShell basePath="/manager" roleLabel="Manager" active="purchase-orders">
      <h1 className="text-3xl text-ink">New purchase order</h1>
      <div className="mt-8">
        <PurchaseOrderForm
          basePath="/manager"
          suppliers={suppliers}
          variants={variants.map((v) => ({ id: v.id, label: `${v.product.name} — ${v.name} (${v.sku})` }))}
        />
      </div>
    </PortalShell>
  );
}
