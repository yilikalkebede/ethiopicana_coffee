import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import type { Cart } from "@prisma/client";

const CART_COOKIE = "ethiopicana_cart";
const CART_COOKIE_TTL_DAYS = 90;

function generateGuestToken(): string {
  return randomBytes(24).toString("hex");
}

/**
 * Resolves the current shopper's cart — the logged-in user's cart, or an
 * anonymous cart tracked by a guest-token cookie — creating one if none
 * exists yet. This is the single place cart identity is resolved so API
 * routes and server components agree on "whose cart is this."
 */
export async function getOrCreateCart(): Promise<Cart> {
  const user = await getCurrentUser();

  if (user) {
    const existing = await prisma.cart.findUnique({ where: { userId: user.id } });
    if (existing) {
      // Backfill for carts created before this field existed, or if the
      // user's email changed since — kept current for the abandoned-cart
      // reminder rather than a one-time snapshot.
      if (existing.email !== user.email) {
        return prisma.cart.update({ where: { id: existing.id }, data: { email: user.email } });
      }
      return existing;
    }
    return prisma.cart.create({ data: { userId: user.id, email: user.email } });
  }

  const cookieStore = cookies();
  const token = cookieStore.get(CART_COOKIE)?.value;

  if (token) {
    const existing = await prisma.cart.findUnique({ where: { guestToken: token } });
    if (existing) return existing;
  }

  const newToken = generateGuestToken();
  const cart = await prisma.cart.create({ data: { guestToken: newToken } });
  cookieStore.set(CART_COOKIE, newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CART_COOKIE_TTL_DAYS * 24 * 60 * 60,
  });
  return cart;
}

export async function getCartWithTotals() {
  const cart = await getOrCreateCart();

  const items = await prisma.cartItem.findMany({
    where: { cartId: cart.id },
    include: {
      productVariant: {
        include: { product: { include: { images: { orderBy: { position: "asc" }, take: 1 } } } },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.productVariant.price) * item.quantity,
    0
  );
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return { cart, items, subtotal, itemCount };
}

export type CartWithTotals = Awaited<ReturnType<typeof getCartWithTotals>>;

/**
 * Called right after a successful login/registration so a shopper who added
 * items before signing in doesn't lose their cart. Guest quantities are
 * added on top of any existing quantity in the user's cart; the guest cart
 * row and its cookie are then discarded. (Doesn't re-check stock on merge —
 * the per-line soft check runs again the next time that line is touched.)
 */
export async function mergeGuestCartIntoUser(userId: string): Promise<void> {
  const cookieStore = cookies();
  const guestToken = cookieStore.get(CART_COOKIE)?.value;
  if (!guestToken) return;

  const guestCart = await prisma.cart.findUnique({
    where: { guestToken },
    include: { items: true },
  });
  if (!guestCart) {
    cookieStore.delete(CART_COOKIE);
    return;
  }

  const userCart = await prisma.cart.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });

  await prisma.$transaction(async (tx) => {
    for (const item of guestCart.items) {
      const existing = await tx.cartItem.findUnique({
        where: {
          cartId_productVariantId: { cartId: userCart.id, productVariantId: item.productVariantId },
        },
      });
      if (existing) {
        await tx.cartItem.update({
          where: { id: existing.id },
          data: { quantity: existing.quantity + item.quantity },
        });
      } else {
        await tx.cartItem.create({
          data: { cartId: userCart.id, productVariantId: item.productVariantId, quantity: item.quantity },
        });
      }
    }
    await tx.cart.delete({ where: { id: guestCart.id } });
  });

  cookieStore.delete(CART_COOKIE);
}
