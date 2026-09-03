import { z } from "zod";
import { SUBSCRIPTION_OUNCE_OPTIONS, SUBSCRIPTION_FREQUENCIES } from "@/lib/subscriptionPricing";
import { GIFT_CARD_MIN_AMOUNT, GIFT_CARD_MAX_AMOUNT } from "@/lib/giftCards";

export const addressSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  company: z.string().optional(),
  address1: z.string().min(1),
  address2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  postalCode: z.string().min(1),
  country: z.string().min(1),
  phone: z.string().optional(),
});

export type AddressInput = z.infer<typeof addressSchema>;

// Product management is Manager-accessible per the spec's own permission
// matrix (§3: Manager CAN "Create/update products") — not Admin-exclusive.
// Only user-role changes, security, and app-level settings are Admin-only.
export const productSchema = z.object({
  name: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers, and hyphens only."),
  description: z.string().min(1),
  shortDescription: z.string().optional(),
  sku: z.string().min(1),
  categoryId: z.string().optional(),
  price: z.number().positive(),
  compareAtPrice: z.number().positive().optional(),
  cost: z.number().nonnegative().optional(),
  active: z.boolean().default(true),
  featured: z.boolean().default(false),
  subscriptionEligible: z.boolean().default(true),
  origin: z.string().optional(),
  region: z.string().optional(),
  farmOrProducer: z.string().optional(),
  elevationMeters: z.number().int().positive().optional(),
  processingMethod: z.string().optional(),
  roastLevel: z.string().optional(),
  flavorNotes: z.array(z.string()).default([]),
  brewMethods: z.array(z.string()).default([]),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

// Suppliers/purchase orders are Manager-accessible, same tier as products
// and inventory — not admin-exclusive.
export const supplierSchema = z.object({
  name: z.string().min(1),
  contactEmail: z.string().optional(),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
});

export const reviewSchema = z.object({
  productId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  title: z.string().optional(),
  body: z.string().min(1),
});

export const giftPurchaseSchema = z.object({
  recipientName: z.string().optional(),
  recipientEmail: z.string().email(),
  giftMessage: z.string().optional(),
  deliveryDate: z.coerce.date(),
  shipments: z.number().int().refine((v) => [3, 6, 12].includes(v)),
  frequency: z.enum(SUBSCRIPTION_FREQUENCIES),
  renewable: z.boolean().default(false),
  ounces: z.number().int().refine((v) => (SUBSCRIPTION_OUNCE_OPTIONS as readonly number[]).includes(v)),
});

// A gift card is redeemable by whoever has the code, no account required —
// senderEmail is collected directly (not read from a session) since
// purchase is allowed as a guest, same as ordinary checkout.
export const giftCardPurchaseSchema = z.object({
  amount: z.number().min(GIFT_CARD_MIN_AMOUNT).max(GIFT_CARD_MAX_AMOUNT),
  senderName: z.string().min(1),
  senderEmail: z.string().email(),
  recipientName: z.string().optional(),
  recipientEmail: z.string().email(),
  giftMessage: z.string().max(500).optional(),
});

export const giftClaimSchema = z.object({
  brewMethod: z.string().min(1),
  roastPreference: z.string().min(1),
  flavorPreference: z.array(z.string()).default([]),
  grindPreference: z.enum(["whole-bean", "ground"]),
  shippingAddressId: z.string().optional(),
  shippingAddress: addressSchema.optional(),
});

export const rewardTierSchema = z.object({
  name: z.string().min(1),
  pointsCost: z.number().int().positive(),
  rewardType: z.enum(["credit", "free_shipping", "percentage_discount", "free_product"]),
  rewardValue: z.string().min(1),
  active: z.boolean().default(true),
});

export const couponSchema = z.object({
  code: z
    .string()
    .min(3)
    .regex(/^[A-Z0-9-]+$/i, "Use letters, numbers, and hyphens only.")
    .transform((v) => v.toUpperCase()),
  type: z.enum(["PERCENTAGE", "FIXED", "FREE_SHIPPING"]),
  value: z.number().nonnegative(),
  firstOrderOnly: z.boolean().default(false),
  subscriptionOnly: z.boolean().default(false),
  minimumPurchase: z.number().nonnegative().optional(),
  usageLimit: z.number().int().positive().optional(),
  perUserLimit: z.number().int().positive().optional(),
  startsAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date().optional(),
  active: z.boolean().default(true),
});

export const monthlyCoffeeSchema = z.object({
  productId: z.string().min(1),
  story: z.string().min(1),
  availableFrom: z.coerce.date(),
  availableUntil: z.coerce.date().optional(),
  featured: z.boolean().default(true),
});

export const journalPostSchema = z.object({
  title: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers, and hyphens only."),
  excerpt: z.string().optional(),
  body: z.string().min(1),
  published: z.boolean().default(false),
  // nullable (not just optional): the edit form must be able to send an
  // explicit null to clear a category, distinct from omitting the key
  // entirely (which journalPostSchema.partial() treats as "leave
  // untouched" on PATCH, per Prisma's create/update semantics).
  categoryId: z.string().nullable().optional(),
});

export const purchaseOrderSchema = z.object({
  supplierId: z.string().min(1),
  items: z
    .array(
      z.object({
        productVariantId: z.string().min(1),
        quantityExpected: z.number().int().positive(),
        unitCost: z.number().nonnegative(),
      })
    )
    .min(1, "Add at least one line item."),
});
