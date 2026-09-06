import { NextResponse } from "next/server";
import { getCartWithTotals } from "@/lib/cart";
import { getSimilarProducts } from "@/lib/similarProducts";

export async function GET() {
  const { items } = await getCartWithTotals();
  if (items.length === 0) {
    return NextResponse.json({ products: [] });
  }

  const cartProductIds = Array.from(new Set(items.map((i) => i.productVariant.product.id)));
  const regions = items.map((i) => i.productVariant.product.region);
  const flavorNotes = Array.from(new Set(items.flatMap((i) => i.productVariant.product.flavorNotes)));

  const products = await getSimilarProducts({ excludeProductIds: cartProductIds, regions, flavorNotes, limit: 3 });

  return NextResponse.json({
    products: products.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      price: p.price.toString(),
      region: p.region,
      roastLevel: p.roastLevel,
      flavorNotes: p.flavorNotes,
      latitude: p.latitude,
      longitude: p.longitude,
      variants: p.variants,
      images: p.images,
    })),
  });
}
