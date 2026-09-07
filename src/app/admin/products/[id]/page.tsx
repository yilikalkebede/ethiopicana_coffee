import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePortalUser } from "@/lib/portalAuth";
import { PortalShell } from "@/components/PortalShell";
import { ProductForm, type ProductFormValues } from "@/components/ProductForm";
import { ProductVariantsPanel } from "@/components/ProductVariantsPanel";
import { ProductImagesPanel } from "@/components/ProductImagesPanel";
import { BoxContentsPanel } from "@/components/BoxContentsPanel";
import { SAMPLER_BOX_CATEGORY_SLUG } from "@/lib/box";

export default async function AdminEditProductPage({ params }: { params: { id: string } }) {
  await requirePortalUser("ADMIN", `/admin/products/${params.id}`);

  const [product, categories, otherProducts] = await Promise.all([
    prisma.product.findUnique({
      where: { id: params.id },
      include: {
        variants: { orderBy: [{ bagSize: "asc" }, { grind: "asc" }] },
        images: { orderBy: { position: "asc" } },
        category: true,
        discoveryBoxItems: { orderBy: { position: "asc" }, select: { includedProductId: true } },
      },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({
      where: { id: { not: params.id } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  if (!product) notFound();

  const initial: ProductFormValues = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    shortDescription: product.shortDescription ?? "",
    sku: product.sku,
    categoryId: product.categoryId ?? "",
    price: product.price.toString(),
    compareAtPrice: product.compareAtPrice?.toString() ?? "",
    cost: product.cost?.toString() ?? "",
    active: product.active,
    featured: product.featured,
    subscriptionEligible: product.subscriptionEligible,
    origin: product.origin ?? "",
    region: product.region ?? "",
    farmOrProducer: product.farmOrProducer ?? "",
    elevationMeters: product.elevationMeters?.toString() ?? "",
    processingMethod: product.processingMethod ?? "",
    roastLevel: product.roastLevel ?? "",
    flavorNotes: product.flavorNotes.join(", "),
    brewMethods: product.brewMethods,
    latitude: product.latitude?.toString() ?? "",
    longitude: product.longitude?.toString() ?? "",
  };

  return (
    <PortalShell basePath="/admin" roleLabel="Admin" active="products">
      <h1 className="text-3xl text-ink">{product.name}</h1>
      <div className="mt-8">
        <ProductForm mode="edit" basePath="/admin" categories={categories} initial={initial} />
        <div className="mt-10">
          <ProductVariantsPanel
            productId={product.id}
            basePath="/admin"
            variants={product.variants.map((v) => ({
              id: v.id,
              sku: v.sku,
              name: v.name,
              price: v.price.toString(),
              inventoryQuantity: v.inventoryQuantity,
              reservedQuantity: v.reservedQuantity,
              active: v.active,
            }))}
          />
        </div>
        <div className="mt-10">
          <ProductImagesPanel productId={product.id} images={product.images} />
        </div>
        {product.category?.slug === SAMPLER_BOX_CATEGORY_SLUG && (
          <div className="mt-10">
            <BoxContentsPanel
              productId={product.id}
              initialIncludedProductIds={product.discoveryBoxItems.map((i) => i.includedProductId)}
              products={otherProducts}
            />
          </div>
        )}
      </div>
    </PortalShell>
  );
}
