import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { BoxBuilder } from "@/components/BoxBuilder";
import { getPrimaryImage } from "@/lib/productImage";
import { BOX_ITEM_COUNT, BOX_PRICE, BOX_CATEGORY_SLUG } from "@/lib/box";

export const metadata: Metadata = {
  title: "Build Your Own Box",
  description: `Pick any ${BOX_ITEM_COUNT} single-origin Ethiopian coffees for a flat $${BOX_PRICE}.`,
};

export default async function BuildABoxPage() {
  const products = await prisma.product.findMany({
    where: { active: true, category: { slug: BOX_CATEGORY_SLUG } },
    include: {
      variants: { where: { active: true }, orderBy: [{ bagSize: "asc" }, { grind: "asc" }] },
      images: { orderBy: { position: "asc" }, take: 1 },
    },
    orderBy: { name: "asc" },
  });

  const catalog = products
    .filter((p) => p.variants.length > 0)
    .map((p) => ({
      id: p.id,
      name: p.name,
      image: getPrimaryImage(p.images),
      variants: p.variants.map((v) => ({
        id: v.id,
        name: v.name,
        grind: v.grind,
        bagSize: v.bagSize,
        price: v.price.toString(),
        inventoryQuantity: v.inventoryQuantity,
        reservedQuantity: v.reservedQuantity,
        lowStockThreshold: v.lowStockThreshold,
      })),
    }));

  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <p className="font-mono text-[11px] uppercase tracking-tag text-belt-700">Build Your Own Box</p>
      <h1 className="mt-2 text-4xl text-ink">
        Any {BOX_ITEM_COUNT} single-origin bags, ${BOX_PRICE} flat
      </h1>
      <p className="mt-3 max-w-2xl font-body text-sm text-ink-soft">
        Mix roasts, regions, whatever you like — pick {BOX_ITEM_COUNT} single-origin coffees and we&apos;ll bundle
        them at one flat price.
      </p>
      <div className="mt-10">
        <BoxBuilder catalog={catalog} />
      </div>
    </section>
  );
}
