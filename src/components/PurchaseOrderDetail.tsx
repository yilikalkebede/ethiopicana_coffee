import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/format";
import { PurchaseOrderActions } from "@/components/PurchaseOrderActions";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  PARTIALLY_RECEIVED: "Partially received",
  RECEIVED: "Received",
  CANCELLED: "Cancelled",
};

export async function PurchaseOrderDetail({ id }: { id: string }) {
  const purchaseOrder = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      supplier: true,
      items: { include: { productVariant: { include: { product: true } } } },
    },
  });
  if (!purchaseOrder) notFound();

  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-tag text-belt-700">
        PO {purchaseOrder.id.slice(-8).toUpperCase()}
      </p>
      <h1 className="mt-2 text-3xl text-ink">{purchaseOrder.supplier.name}</h1>

      <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-4">
        <div>
          <p className="font-body text-xs uppercase tracking-tag text-ink-soft">Status</p>
          <p className="mt-1 font-body text-sm text-ink">{STATUS_LABEL[purchaseOrder.status] ?? purchaseOrder.status}</p>
        </div>
        <div>
          <p className="font-body text-xs uppercase tracking-tag text-ink-soft">Created</p>
          <p className="mt-1 font-body text-sm text-ink">{purchaseOrder.createdAt.toLocaleDateString()}</p>
        </div>
        <div>
          <p className="font-body text-xs uppercase tracking-tag text-ink-soft">Submitted</p>
          <p className="mt-1 font-body text-sm text-ink">{purchaseOrder.submittedAt?.toLocaleDateString() ?? "—"}</p>
        </div>
        <div>
          <p className="font-body text-xs uppercase tracking-tag text-ink-soft">Received</p>
          <p className="mt-1 font-body text-sm text-ink">{purchaseOrder.receivedAt?.toLocaleDateString() ?? "—"}</p>
        </div>
      </div>

      <div className="mt-8 divide-y divide-line border-y border-line">
        {purchaseOrder.items.map((item) => (
          <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div>
              <p className="font-body text-sm text-ink">{item.productVariant.product.name}</p>
              <p className="font-mono text-[10px] uppercase tracking-tag text-ink-soft">
                {item.productVariant.name} · {item.productVariant.sku}
              </p>
            </div>
            <div className="flex items-center gap-6 font-body text-sm text-ink-soft">
              <span>{formatPrice(item.unitCost)} / unit</span>
              <span>{item.quantityReceived} / {item.quantityExpected} received</span>
              <span className="text-ink">{formatPrice(Number(item.unitCost) * item.quantityExpected)}</span>
            </div>
          </div>
        ))}
      </div>

      <PurchaseOrderActions
        purchaseOrderId={purchaseOrder.id}
        status={purchaseOrder.status}
        items={purchaseOrder.items.map((item) => ({
          id: item.id,
          quantityExpected: item.quantityExpected,
          quantityReceived: item.quantityReceived,
          productName: item.productVariant.product.name,
          variantName: item.productVariant.name,
        }))}
      />
    </div>
  );
}
