import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, UnauthorizedError } from "@/lib/auth";
import { stripe } from "@/lib/stripe";

const refundSchema = z.object({
  amount: z.number().positive().optional(),
  reason: z.string().optional(),
});

/**
 * Real money movement — same-tier access as the rest of Orders (Manager+),
 * matching the spec's permission matrix. No automatic inventory restock:
 * a refund doesn't imply the product came back. If a real return-and-
 * restock flow is ever needed, that's a separate, larger feature.
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await requireRole("MANAGER");

    const body = await request.json().catch(() => ({}));
    const parsed = refundSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input." }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: { payments: true, refunds: true },
    });
    if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

    if (["CANCELLED", "REFUNDED"].includes(order.status)) {
      return NextResponse.json({ error: "This order has already been fully refunded." }, { status: 400 });
    }

    const successfulPayment = order.payments.find((p) => p.status === "PAID");
    if (!successfulPayment?.stripePaymentIntentId) {
      return NextResponse.json({ error: "This order has no successful payment to refund." }, { status: 400 });
    }

    const alreadyRefunded = order.refunds.reduce((sum, r) => sum + Number(r.amount), 0);
    const remaining = Number(order.total) - alreadyRefunded;
    const amount = parsed.data.amount ?? remaining;

    if (amount <= 0 || amount > remaining + 0.001) {
      return NextResponse.json(
        { error: `You can refund at most ${remaining.toFixed(2)} on this order.` },
        { status: 400 }
      );
    }

    const stripeRefund = await stripe.refunds.create({
      payment_intent: successfulPayment.stripePaymentIntentId,
      amount: Math.round(amount * 100),
      reason: "requested_by_customer",
    });

    const isFullRefund = amount >= remaining - 0.001;
    const newStatus = isFullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED";

    const updated = await prisma.$transaction(async (tx) => {
      await tx.refund.create({
        data: {
          orderId: order.id,
          stripeRefundId: stripeRefund.id,
          amount,
          reason: parsed.data.reason,
          createdById: actor.id,
        },
      });

      const result = await tx.order.update({
        where: { id: order.id },
        data: { status: newStatus, paymentStatus: newStatus },
      });

      await tx.auditLog.create({
        data: {
          userId: actor.id,
          action: "ORDER_REFUNDED",
          entity: "Order",
          entityId: order.id,
          oldValue: { status: order.status, paymentStatus: order.paymentStatus },
          newValue: { status: newStatus, paymentStatus: newStatus, refundAmount: amount },
        },
      });

      return result;
    });

    return NextResponse.json({ order: updated, refund: { amount, stripeRefundId: stripeRefund.id } });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
