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
    where: { email: "admin@ethiopicana.example" },
    update: {},
    create: {
      email: "admin@ethiopicana.example",
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
    where: { email: "manager@ethiopicana.example" },
    update: {},
    create: {
      email: "manager@ethiopicana.example",
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
    where: { email: "customer@ethiopicana.example" },
    update: {},
    create: {
      email: "customer@ethiopicana.example",
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

  // Ethiopicana Coffee is a single-country specialist: every lot is
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
          // Net coffee weight — real, needed for real Shippo rate/label
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

  console.log("Seeding journal…");
  const journalCategoryDefs = [
    { name: "Origins & Regions", slug: "origins-regions" },
    { name: "Brewing Guides", slug: "brewing-guides" },
    { name: "Processing & Craft", slug: "processing-craft" },
    { name: "Sustainability", slug: "sustainability" },
  ];
  const journalCategories = await Promise.all(
    journalCategoryDefs.map((c) => prisma.journalCategory.upsert({ where: { slug: c.slug }, update: {}, create: c }))
  );
  const journalCategoryBySlug = Object.fromEntries(journalCategories.map((c) => [c.slug, c]));

  const journalPostDefs = [
    {
      slug: "what-makes-yirgacheffe-taste-like-yirgacheffe",
      title: "What Makes Yirgacheffe Taste Like Yirgacheffe",
      excerpt: "Elevation, heirloom varieties, and a washing tradition that's been refined for generations.",
      category: "origins-regions",
      body: `Yirgacheffe sits in the Gedeo Zone of southern Ethiopia, most of it above 1,900 meters. That altitude alone does a lot of work: coffee cherries ripen more slowly at elevation, which gives the plant more time to develop sugars and aromatic compounds before harvest.

The region also grows almost entirely heirloom varieties — genetically diverse coffee plants that predate the modern, disease-resistant cultivars grown in most of the world. Nobody bred them for yield or uniformity, which is part of why cup quality can vary lot to lot, but also why the best lots taste unlike anything grown elsewhere.

Then there's processing. Yirgacheffe built its reputation on washed coffee: ripe cherries are pulped the same day they're picked, fermented for around 24 to 48 hours to loosen the remaining fruit, washed clean, and dried slowly on raised beds. That process strips away almost all the fruit pulp before drying, which is exactly why washed Yirgacheffe tends to taste so clean — bright citrus, jasmine, bergamot, a tea-like body — rather than heavy or fruity.

None of those three things — elevation, variety, process — would produce that cup on its own. It's the combination, repeated by farmers who've been refining it for generations, that makes Yirgacheffe recognizable in a blind cup.`,
    },
    {
      slug: "guji-vs-sidama-side-by-side",
      title: "Guji vs. Sidama, Side by Side",
      excerpt: "Two neighboring regions, two very different personalities in the cup.",
      category: "origins-regions",
      body: `Guji and Sidama sit close enough to each other on a map that it's easy to assume they'd taste similar. In the cup, they usually don't.

Sidama, one of Ethiopia's larger and more established coffee zones, tends to land in a familiar washed-Ethiopian register: bright acidity, a syrupy body, and fruit notes that lean toward citrus and berry rather than tropical. It's a reliable, balanced cup — the kind that made Ethiopian washed coffee famous in the first place.

Guji, a somewhat newer name on specialty coffee menus, is where things get more distinctive. The region grows coffee at similarly high elevations, but Guji lots — especially natural-processed ones — are known for big, wine-like fruit: blueberry, dark cherry, sometimes something close to red wine itself. Even Guji's washed lots tend to carry more stone-fruit sweetness than a typical Sidama.

Neither is "better" — they're just different expressions of similar growing conditions filtered through different local processing traditions and microclimates. If you've only had one, the other is worth seeking out specifically for the contrast.`,
    },
    {
      slug: "dialing-in-pour-over-at-home",
      title: "Dialing In Pour-Over at Home",
      excerpt: "Four variables — ratio, grind, temperature, time — and how to adjust each one.",
      category: "brewing-guides",
      body: `Pour-over rewards a little precision, but you don't need much gear to get it right. Start with a ratio of about 1:16 — 1 gram of coffee for every 16 grams (roughly milliliters) of water. For a 300g cup, that's about 19g of coffee.

Grind matters more than people expect. Aim for a medium-fine grind, similar in texture to coarse sand. Too coarse and water rushes through without picking up enough flavor, leaving a thin, sour cup. Too fine and it drains too slowly, over-extracting and turning bitter.

Water temperature should sit between 195°F and 205°F (90–96°C) — just off a full boil. Pour a small amount first, about twice the coffee's weight, and let it sit for 30 to 45 seconds. This "bloom" lets trapped CO2 escape so the rest of your pour extracts evenly. Then pour the remaining water in slow, steady circles, aiming to finish the whole brew in 2.5 to 3.5 minutes.

If the result tastes sour or thin, grind finer next time. If it tastes bitter or harsh, grind coarser. Everything else — pour technique, filter type, water — matters less than getting those two dials right first.`,
    },
    {
      slug: "cold-brew-without-the-guesswork",
      title: "Cold Brew Without the Guesswork",
      excerpt: "One ratio, one steep time, and a dilution step most people skip.",
      category: "brewing-guides",
      body: `Cold brew is one of the most forgiving ways to make coffee, mostly because time does the work that heat usually does. Grind your coffee coarse — coarser than you'd use for drip — and combine it with room-temperature or cold water at a ratio of about 1 part coffee to 8 parts water by weight.

Let it steep, covered, for 12 to 18 hours. Room temperature and refrigerator steeping both work; the fridge just takes a bit longer to reach the same result. Longer steeps pull out more body and sweetness, but past about 20 hours you start picking up unwanted bitterness, so it's worth timing it rather than guessing.

Strain through a fine mesh filter or paper filter — a coarse strainer alone will leave grit behind. What you're left with is a concentrate, not a finished drink: cut it roughly 1:1 with water or milk before serving, adjusting to taste.

The reason cold brew tastes different from hot-brewed coffee cooled down isn't just temperature — cold water extracts a different balance of compounds than hot water does, pulling out less acidity and more of the coffee's natural sweetness. That's why a good cold brew tastes smooth rather than sharp, even from the same beans you'd use for pour-over.`,
    },
    {
      slug: "washed-vs-natural-how-processing-shapes-flavor",
      title: "Washed vs. Natural: How Processing Shapes Flavor",
      excerpt: "Same cherry, same tree — two processes that produce almost opposite cups.",
      category: "processing-craft",
      body: `Before coffee is coffee, it's a cherry — a seed wrapped in fruit pulp and a papery inner layer. What happens to that fruit between harvest and drying is called processing, and it shapes flavor as much as growing region does.

Washed processing removes the fruit early: cherries are pulped the day they're picked, the seeds ferment briefly in water to loosen the remaining mucilage, then they're washed clean and dried as bare parchment. Because almost none of the fruit sugar stays in contact with the bean, washed coffee tends to taste clean and precise — its acidity and origin character come through clearly, without much fruit sweetness layered on top.

Natural processing skips almost all of that. Whole cherries are dried in the sun, fruit and all, for two to four weeks, and only pulped afterward. The bean sits inside that fruit the entire time, slowly absorbing sugars and aromatic compounds as it dries. The result is a heavier-bodied cup with pronounced fruit character — berry, stone fruit, sometimes something close to wine.

There's a middle path too, often called honey processing, where some but not all of the fruit is removed before drying — splitting the difference between the two. Ethiopia produces serious volumes of both washed and natural coffee, often from the very same farms, which is part of why two lots from the same region can taste so different.`,
    },
    {
      slug: "why-we-roast-to-order",
      title: "Why We Roast to Order",
      excerpt: "Coffee has a flavor window measured in days, not months — so we don't roast until you order.",
      category: "processing-craft",
      body: `Roasted coffee isn't shelf-stable in the way most people assume. Right after roasting, beans are still releasing CO2 and volatile aromatic compounds — a process called degassing that continues for several days. Brew too soon after roasting and a cup can taste flat or unevenly extracted; the flavor hasn't fully settled yet.

There's a window, usually starting a few days after roasting and lasting a couple of weeks, where coffee tastes its best — aromatics are at their peak and the roast has had time to stabilize. After that window closes, coffee doesn't go "bad," but it loses brightness and complexity week over week as it stales, even in a sealed bag.

That timeline is exactly why we don't keep pre-roasted stock sitting in a warehouse. Every bag is roasted after you order it and shipped within days, so it reaches you at or near the start of that flavor window instead of the tail end of it. It's a slower way to run a coffee business than roasting in bulk ahead of demand, but it means what arrives at your door was roasted for you, not for inventory.`,
    },
    {
      slug: "direct-trade-explained",
      title: "Direct Trade, Explained",
      excerpt: "Buying straight from washing stations and cooperatives, without a chain of middlemen in between.",
      category: "sustainability",
      body: `"Direct trade" gets used loosely in coffee marketing, so it's worth being precise about what it actually means. Unlike Fair Trade, which is a formal certification with defined price floors and a paid certification process, direct trade isn't a certification at all — it's a description of how coffee is bought: directly from the washing station, mill, or cooperative that processed it, rather than through a chain of exporters, brokers, and importers each taking a cut.

That matters for a few reasons. Buying directly usually means a bigger share of what's paid actually reaches the producer, rather than being distributed across several intermediary businesses. It also creates a real feedback loop — a buyer who purchases directly, cup after cup, season after season, can tell a washing station which lots tasted best and why, information that rarely survives a long anonymous supply chain.

It's also more work than buying through a single importer who handles everything. It means real relationships with real washing stations, real logistics to manage, and real variability from one harvest to the next. We buy every lot we sell this way — directly from the washing stations and cooperatives that produced it — because it's the only way we've found to actually know where a coffee came from, not just what the bag says.`,
    },
    {
      slug: "what-shade-grown-actually-means",
      title: "What \"Shade-Grown\" Actually Means",
      excerpt: "Coffee didn't evolve to grow in open fields — and Ethiopia's forests are where that's most visible.",
      category: "sustainability",
      body: `Coffee is naturally an understory plant. In the wild, the coffee species grown for drinking evolved in the highland forests of Ethiopia, growing in the dappled shade beneath taller trees — not in open, sun-exposed rows. "Shade-grown" simply describes coffee grown closer to that original environment, under a forest or tree canopy, rather than on cleared land.

Ethiopia is where you see this most clearly, since it's both coffee's birthplace and a place where large amounts of coffee are still grown in or near native forest, sometimes called forest coffee or semi-forest coffee. Farmers manage the surrounding trees rather than clearing them, letting coffee grow among a genuinely diverse canopy.

There's a practical flavor argument for this too, not just an ecological one: shade slows down cherry ripening, similar to how high elevation does, giving the fruit more time to develop sugar and complexity before harvest. It also supports far more biodiversity — birds, pollinators, other plant life — than a cleared monoculture would.

Not every Ethiopian lot is grown this way, and shade-grown isn't a certification with a strict legal definition the way organic is. But when you taste an Ethiopian coffee with real depth and complexity, there's a decent chance it grew up literally under a forest, the way coffee first did.`,
    },
  ] as const;

  await Promise.all(
    journalPostDefs.map((p) =>
      prisma.journalPost.upsert({
        where: { slug: p.slug },
        update: {},
        create: {
          slug: p.slug,
          title: p.title,
          excerpt: p.excerpt,
          body: p.body,
          published: true,
          publishedAt: new Date(),
          authorId: admin.id,
          categoryId: journalCategoryBySlug[p.category].id,
        },
      })
    )
  );

  console.log("Seed complete.");
  console.log("  Admin login:    admin@ethiopicana.example / ChangeMe123!");
  console.log("  Manager login:  manager@ethiopicana.example / ChangeMe123!");
  console.log("  Customer login: customer@ethiopicana.example / ChangeMe123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
