import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PERMISSIONS = [
  { key: "users.manage", description: "Create, deactivate, and view users" },
  { key: "users.role.change", description: "Change a user's role" },
  { key: "products.manage", description: "Create/update products and variants" },
  { key: "inventory.adjust", description: "Adjust inventory and receive stock" },
  { key: "orders.manage", description: "View and process orders" },
  { key: "subscriptions.manage", description: "View and modify any customer's subscription" },
  { key: "coupons.manage", description: "Create/update coupons and promotions" },
  { key: "reviews.moderate", description: "Approve/reject/hide reviews" },
  { key: "content.manage", description: "Manage homepage, blog, and monthly coffee content" },
  { key: "settings.manage", description: "Change store-wide configuration" },
  { key: "analytics.view", description: "View revenue and operational analytics" },
];

// Coarse role -> permission map for the seed; RolePermission rows are what
// the app actually reads, so this can be edited later without touching code.
const ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: PERMISSIONS.map((p) => p.key),
  MANAGER: [
    "products.manage",
    "inventory.adjust",
    "orders.manage",
    "subscriptions.manage",
    "analytics.view",
  ],
  CUSTOMER: [],
};

async function main() {
  console.log("Seeding permissions…");
  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      update: {},
      create: perm,
    });
  }

  for (const [role, keys] of Object.entries(ROLE_PERMISSIONS)) {
    for (const key of keys) {
      const permission = await prisma.permission.findUniqueOrThrow({ where: { key } });
      await prisma.rolePermission.upsert({
        where: { role_permissionId: { role: role as any, permissionId: permission.id } },
        update: {},
        create: { role: role as any, permissionId: permission.id },
      });
    }
  }

  console.log("Seeding users…");
  const passwordHash = await bcrypt.hash("ChangeMe123!", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@latitudecoffee.example" },
    update: {},
    create: {
      email: "admin@latitudecoffee.example",
      passwordHash,
      firstName: "Ada",
      lastName: "Ríos",
      role: "ADMIN",
      status: "ACTIVE",
      emailVerified: new Date(),
      notificationPrefs: { create: {} },
      rewardBalance: { create: { points: 0 } },
    },
  });

  await prisma.user.upsert({
    where: { email: "manager@latitudecoffee.example" },
    update: {},
    create: {
      email: "manager@latitudecoffee.example",
      passwordHash,
      firstName: "Marco",
      lastName: "Diallo",
      role: "MANAGER",
      status: "ACTIVE",
      emailVerified: new Date(),
      notificationPrefs: { create: {} },
      rewardBalance: { create: { points: 0 } },
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: "customer@latitudecoffee.example" },
    update: {},
    create: {
      email: "customer@latitudecoffee.example",
      passwordHash,
      firstName: "Priya",
      lastName: "Chen",
      role: "CUSTOMER",
      status: "ACTIVE",
      emailVerified: new Date(),
      notificationPrefs: { create: {} },
      rewardBalance: { create: { points: 120 } },
    },
  });

  console.log("Seeding catalog…");
  const categoryDefs = [
    { name: "Single Origin", slug: "single-origin" },
    { name: "Blends", slug: "blends" },
    { name: "Decaf", slug: "decaf" },
    { name: "Cold Brew", slug: "cold-brew" },
  ];
  const categories = await Promise.all(
    categoryDefs.map((c) => prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: c }))
  );
  const categoryBySlug = Object.fromEntries(categories.map((c) => [c.slug, c]));

  type SeedVariant = {
    suffix: string;
    name: string;
    bagSize: string;
    grind: string;
    inventoryQuantity: number;
    lowStockThreshold: number;
  };

  const twoVariants = (wb: number, gr: number, lowStockThreshold = 15): SeedVariant[] => [
    { suffix: "12WB", name: "12oz / Whole Bean", bagSize: "12oz", grind: "whole-bean", inventoryQuantity: wb, lowStockThreshold },
    { suffix: "12GR", name: "12oz / Ground", bagSize: "12oz", grind: "ground", inventoryQuantity: gr, lowStockThreshold },
  ];

  // Latitude Coffee Co. is a single-country specialist: every lot is
  // Ethiopian, sourced from a named region/washing station. At least 10
  // coffees across every category, with deliberately varied stock levels
  // (in stock / low stock / out of stock) so the inventory dashboard in a
  // later phase has real states to render, not just zeros.
  const FLAGSHIP_SLUG = "yirgacheffe-ethiopia";

  const coffees = [
    {
      name: "Yirgacheffe, Ethiopia",
      slug: "yirgacheffe-ethiopia",
      sku: "LAT-ETH-YIR",
      categorySlug: "single-origin",
      price: 19,
      origin: "Ethiopia",
      region: "Yirgacheffe, Gedeo Zone",
      latitude: 6.2,
      longitude: 38.2,
      roastLevel: "light",
      flavorNotes: ["jasmine", "bergamot", "peach"],
      brewMethods: ["pour-over", "aeropress"],
      processingMethod: "washed",
      elevationMeters: 1950,
      description: "A washed lot from the Gedeo Zone in Yirgacheffe — the region most people picture when they think of Ethiopian coffee.",
      variants: twoVariants(95, 60),
    },
    {
      name: "Sidama, Ethiopia",
      slug: "sidama-ethiopia",
      sku: "LAT-ETH-SID",
      categorySlug: "single-origin",
      price: 19,
      origin: "Ethiopia",
      region: "Sidama",
      latitude: 6.8,
      longitude: 38.5,
      roastLevel: "medium",
      flavorNotes: ["blueberry", "strawberry", "red wine"],
      brewMethods: ["pour-over", "drip"],
      processingMethod: "natural",
      elevationMeters: 1900,
      description: "Sun-dried on raised beds until the cherry's berry sweetness works its way into the bean — a natural-process Sidama lot.",
      variants: twoVariants(85, 55),
    },
    {
      name: "Guji, Ethiopia",
      slug: "guji-ethiopia",
      sku: "LAT-ETH-GUJ",
      categorySlug: "single-origin",
      price: 20,
      origin: "Ethiopia",
      region: "Guji",
      latitude: 5.6,
      longitude: 38.9,
      roastLevel: "light",
      flavorNotes: ["stone fruit", "black tea", "floral"],
      brewMethods: ["pour-over", "aeropress"],
      processingMethod: "washed",
      elevationMeters: 2000,
      description: "High-elevation Guji, washed for a delicate, tea-like cup with more florals than its Yirgacheffe neighbor.",
      variants: twoVariants(65, 40),
    },
    {
      name: "Harrar, Ethiopia",
      slug: "harrar-ethiopia",
      sku: "LAT-ETH-HAR",
      categorySlug: "single-origin",
      price: 19,
      origin: "Ethiopia",
      region: "Harrar",
      latitude: 9.3,
      longitude: 42.1,
      roastLevel: "medium-dark",
      flavorNotes: ["blueberry", "dried fruit", "warm spice"],
      brewMethods: ["drip", "french-press"],
      processingMethod: "natural",
      elevationMeters: 1700,
      description: "Dry-processed the traditional way in Ethiopia's oldest coffee-growing region — heavy body, wine-like fruit, a signature blueberry note.",
      variants: twoVariants(60, 40),
    },
    {
      name: "Limu, Ethiopia",
      slug: "limu-ethiopia",
      sku: "LAT-ETH-LIM",
      categorySlug: "single-origin",
      price: 18,
      origin: "Ethiopia",
      region: "Limu",
      latitude: 8.1,
      longitude: 36.4,
      roastLevel: "medium",
      flavorNotes: ["winey", "warm spice", "balanced sweetness"],
      brewMethods: ["drip", "espresso"],
      processingMethod: "washed",
      elevationMeters: 1700,
      description: "A washed Limu lot — even-keeled and balanced, the everyday drinker among our single origins.",
      variants: twoVariants(90, 65),
    },
    {
      name: "Jimma, Ethiopia",
      slug: "jimma-ethiopia",
      sku: "LAT-ETH-JIM",
      categorySlug: "single-origin",
      price: 18,
      origin: "Ethiopia",
      region: "Jimma, Kaffa Zone",
      latitude: 7.7,
      longitude: 36.8,
      roastLevel: "medium",
      flavorNotes: ["herbal", "earthy", "mild acidity"],
      brewMethods: ["drip", "french-press"],
      processingMethod: "washed",
      elevationMeters: 1600,
      description: "Grown in Kaffa — the forest region coffee is named after, and where the plant is native. Earthy, herbal, mellow.",
      variants: twoVariants(55, 35),
    },
    {
      name: "Chelchele, Guji — Limited Lot",
      slug: "chelchele-guji-limited",
      sku: "LAT-ETH-CHE",
      categorySlug: "single-origin",
      price: 30,
      origin: "Ethiopia",
      region: "Chelchele, Guji",
      latitude: 5.5,
      longitude: 39.0,
      roastLevel: "light",
      flavorNotes: ["tropical fruit", "floral", "funky natural"],
      brewMethods: ["pour-over"],
      processingMethod: "natural",
      elevationMeters: 2100,
      description: "A single washing station, single harvest microlot from Chelchele — intensely fruited, limited while it lasts.",
      variants: twoVariants(25, 15),
    },
    {
      name: "House Blend",
      slug: "house-blend",
      sku: "LAT-BLD-HOU",
      categorySlug: "blends",
      price: 17,
      origin: "Ethiopia",
      region: "Yirgacheffe & Sidama",
      latitude: null,
      longitude: null,
      roastLevel: "medium",
      flavorNotes: ["florals", "stone fruit", "balanced"],
      brewMethods: ["drip", "pour-over", "french-press"],
      processingMethod: "washed & natural",
      elevationMeters: null,
      description: "Our everyday blend — washed Yirgacheffe for lift, natural Sidama for body. Still 100% Ethiopian, every bag.",
      variants: twoVariants(150, 110),
    },
    {
      name: "Espresso Blend",
      slug: "espresso-blend",
      sku: "LAT-BLD-ESP",
      categorySlug: "blends",
      price: 18,
      origin: "Ethiopia",
      region: "Harrar & Limu",
      latitude: null,
      longitude: null,
      roastLevel: "dark",
      flavorNotes: ["dark chocolate", "dried fig", "syrupy body"],
      brewMethods: ["espresso"],
      processingMethod: "natural & washed",
      elevationMeters: null,
      description: "Harrar's dried-fruit weight and Limu's balance, roasted dark and syrupy on purpose — built for pulling shots.",
      variants: twoVariants(130, 90),
    },
    {
      name: "Sidama Decaf",
      slug: "sidama-decaf",
      sku: "LAT-DEC-SID",
      categorySlug: "decaf",
      price: 19,
      origin: "Ethiopia",
      region: "Sidama",
      latitude: 6.8,
      longitude: 38.5,
      roastLevel: "medium",
      flavorNotes: ["blueberry", "brown sugar", "clean finish"],
      brewMethods: ["drip", "pour-over"],
      processingMethod: "Swiss Water decaffeinated, natural",
      elevationMeters: 1900,
      description: "All the berry-forward character of our natural Sidama lot, decaffeinated chemical-free via the Swiss Water process.",
      variants: twoVariants(8, 5), // deliberately low stock to exercise the low-stock threshold
    },
    {
      name: "Cold Brew Blend",
      slug: "cold-brew-blend",
      sku: "LAT-CLD-BLD",
      categorySlug: "cold-brew",
      price: 18,
      origin: "Ethiopia",
      region: "Guji & Sidama",
      latitude: null,
      longitude: null,
      roastLevel: "medium-dark",
      flavorNotes: ["chocolate", "dark cherry", "low acid"],
      brewMethods: ["cold-brew"],
      processingMethod: "natural",
      elevationMeters: null,
      description: "Coarse-cut natural Guji and Sidama, roasted specifically for a 12-hour steep — bold without the bite of a hot dark roast.",
      variants: twoVariants(0, 0), // deliberately out of stock
    },
  ];

  for (const coffee of coffees) {
    const product = await prisma.product.upsert({
      where: { slug: coffee.slug },
      update: {},
      create: {
        name: coffee.name,
        slug: coffee.slug,
        description: coffee.description,
        shortDescription: coffee.flavorNotes.join(" · "),
        sku: coffee.sku,
        categoryId: categoryBySlug[coffee.categorySlug].id,
        price: coffee.price,
        active: true,
        featured: coffee.slug === FLAGSHIP_SLUG,
        origin: coffee.origin,
        region: coffee.region,
        latitude: coffee.latitude,
        longitude: coffee.longitude,
        roastLevel: coffee.roastLevel,
        flavorNotes: coffee.flavorNotes,
        brewMethods: coffee.brewMethods,
        processingMethod: coffee.processingMethod,
        elevationMeters: coffee.elevationMeters,
      },
    });

    for (const v of coffee.variants) {
      const sku = `${coffee.sku}-${v.suffix}`;
      const variant = await prisma.productVariant.upsert({
        where: { sku },
        update: {},
        create: {
          productId: product.id,
          sku,
          name: v.name,
          bagSize: v.bagSize,
          grind: v.grind,
          price: coffee.price,
          // Net coffee weight — real, needed for real EasyPost rate/label
          // calls (Phase 6). Every current variant is a 12oz bag.
          weightGrams: v.bagSize === "12oz" ? 340 : undefined,
          inventoryQuantity: v.inventoryQuantity,
          lowStockThreshold: v.lowStockThreshold,
        },
      });

      // Initial stock is recorded as a real InventoryTransaction rather than
      // just set on the variant — "never silently modify inventory" applies
      // to seed data too, and reseeding must not duplicate this row.
      const alreadyLogged = await prisma.inventoryTransaction.findFirst({
        where: { productVariantId: variant.id, reason: "Initial seed stock" },
      });
      if (!alreadyLogged) {
        await prisma.inventoryTransaction.create({
          data: {
            productVariantId: variant.id,
            type: "RESTOCK",
            quantity: v.inventoryQuantity,
            previousQuantity: 0,
            newQuantity: v.inventoryQuantity,
            reason: "Initial seed stock",
            userId: admin.id,
          },
        });
      }
    }

    if (coffee.slug === FLAGSHIP_SLUG) {
      await prisma.monthlyCoffee.upsert({
        where: { id: `${product.id}-monthly` },
        update: {},
        create: {
          id: `${product.id}-monthly`,
          productId: product.id,
          story:
            "This lot comes from smallholder farms in the Gedeo Zone above 1,900m, picked at peak ripeness and washed within hours of harvest — classic Yirgacheffe.",
          availableFrom: new Date(),
          featured: true,
        },
      });
    }
  }

  console.log("Seed complete.");
  console.log("  Admin login:    admin@latitudecoffee.example / ChangeMe123!");
  console.log("  Manager login:  manager@latitudecoffee.example / ChangeMe123!");
  console.log("  Customer login: customer@latitudecoffee.example / ChangeMe123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
