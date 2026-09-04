import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/format";
import { DataTable } from "@/components/DataTable";
import { ProductActiveToggle } from "@/components/ProductActiveToggle";
import { StockBadge } from "@/components/StockBadge";
import { getProductStockStatus } from "@/lib/stock";
import { getPrimaryImage } from "@/lib/productImage";
import { ProductImagePlaceholder } from "@/components/ProductImagePlaceholder";

export async function ProductListView({ basePath, q }: { basePath: "/admin" | "/manager"; q?: string }) {
  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { sku: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const products = await prisma.product.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: { category: true, variants: true, images: { orderBy: { position: "asc" }, take: 1 } },
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl text-ink">Products</h1>
        <Link href={`${basePath}/products/new`} className="btn-primary !px-5 !py-2 text-sm">
          + New product
        </Link>
      </div>

      <form action={`${basePath}/products`} method="GET" className="mt-6">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by name or SKU…"
          className="w-full max-w-sm border border-line bg-paper px-3 py-2 font-body text-sm text-ink focus-visible:outline-belt-500"
        />
      </form>

      <div className="mt-6">
        <DataTable
          headers={["Product", "Category", "Price", "Stock", "Status", ""]}
          isEmpty={products.length === 0}
          emptyMessage="No products match."
        >
          {products.map((product) => {
            const primaryImage = getPrimaryImage(product.images);
            return (
            <tr key={product.id} className="border-b border-line last:border-b-0 hover:bg-belt-50/50">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="relative h-10 w-10 shrink-0 border border-line bg-belt-100">
                    {primaryImage ? (
                      <Image src={primaryImage.url} alt={primaryImage.altText} fill className="object-cover" unoptimized />
                    ) : (
                      <ProductImagePlaceholder />
                    )}
                  </div>
                  <div>
                    <Link href={`${basePath}/products/${product.id}`} className="text-ink hover:text-belt-700">
                      {product.name}
                    </Link>
                    <p className="font-mono text-[10px] uppercase tracking-tag text-ink-soft">{product.sku}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-ink-soft">{product.category?.name ?? "—"}</td>
              <td className="px-4 py-3">{formatPrice(product.price)}</td>
              <td className="px-4 py-3">
                <StockBadge status={getProductStockStatus(product.variants)} />
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center border px-2.5 py-1 font-mono text-[10px] uppercase tracking-tag ${
                    product.active ? "border-belt-500/40 text-belt-700" : "border-rust/40 text-rust"
                  }`}
                >
                  {product.active ? "Active" : "Inactive"}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <ProductActiveToggle productId={product.id} active={product.active} />
              </td>
            </tr>
            );
          })}
        </DataTable>
      </div>
    </div>
  );
}
