import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { abandonedCartEmail } from "@/lib/emailTemplates";

const ABANDONED_AFTER_MS = 3 * 60 * 60 * 1000; // 3 hours
const IGNORE_OLDER_THAN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days — don't dredge up ancient carts forever

/**
 * Fired by Vercel Cron (vercel.json), hourly. Logged-in-user carts only —
 * no email is ever captured for a guest before checkout, so guest cart
 * abandonment is explicitly out of scope here (a real, stated limitation,
 * not silently partial coverage).
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const now = Date.now();
  const carts = await prisma.cart.findMany({
    where: {
      userId: { not: null },
      email: { not: null },
      abandonedEmailSentAt: null,
      updatedAt: {
        lte: new Date(now - ABANDONED_AFTER_MS),
        gte: new Date(now - IGNORE_OLDER_THAN_MS),
      },
      items: { some: {} },
    },
    include: {
      items: { include: { productVariant: { include: { product: true } } } },
      user: { include: { notificationPrefs: true } },
    },
  });

  let sent = 0;
  for (const cart of carts) {
    if (cart.user?.notificationPrefs?.marketingEmail === false) continue;
    if (!cart.email) continue;

    const { subject, html } = abandonedCartEmail(
      cart.user?.firstName ?? "there",
      cart.items.map((item) => ({
        name: `${item.productVariant.product.name}${item.productVariant.name ? ` — ${item.productVariant.name}` : ""}`,
        quantity: item.quantity,
      }))
    );
    const ok = await sendEmail({ to: cart.email, subject, html });
    if (ok) sent++;

    await prisma.cart.update({ where: { id: cart.id }, data: { abandonedEmailSentAt: new Date() } });
  }

  return NextResponse.json({ checked: carts.length, sent });
}
