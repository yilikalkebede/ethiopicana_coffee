import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePortalUser } from "@/lib/portalAuth";
import { PortalShell } from "@/components/PortalShell";
import { ProductForm, type ProductFormValues } from "@/components/ProductForm";
import { ProductVariantsPanel } from "@/components/ProductVariantsPanel";
import { ProductImagesPanel } from "@/components/ProductImagesPanel";

export default async function AdminEditProductPage({ params }: { params: { id: string } }) {
  await requirePortalUser("ADMIN", `/admin/products/${params.id}`);

  const [product, categories] = await Promise.all([
    prisma.product.findUnique({
      where: { id: params.id },
      include: {
        variants: { orderBy: [{ bagSize: "asc" }, { grind: "asc" }] },
        images: { orderBy: { position: "asc" } },
      },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
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
      </div>
    </PortalShell>
  );
}
