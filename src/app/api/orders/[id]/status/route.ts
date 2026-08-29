import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Deliberately narrow and unauthenticated: returns only whether an order
 * has been paid, nothing else (no address, no line items, no totals). Safe
 * to expose without ownership checks since order ids are unguessable cuids
 * and this reveals nothing sensitive — it exists purely so the guest
 * /checkout/success page can poll for the webhook to land without needing
 * a session. Full order details (src/app/account/orders/[id]/page.tsx) stay
 * behind login + ownership checks.
 */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    select: { id: true, orderNumber: true, status: true, paymentStatus: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  return NextResponse.json(order);
}
