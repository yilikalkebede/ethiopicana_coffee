import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

/** Same narrow, unauthenticated pattern as /api/gifts/status — lets
 * /gift-cards/success poll for the checkout.session.completed webhook to
 * land (it creates the GiftCard row) without needing a session. */
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session_id." }, { status: 400 });
  }

  let paymentIntentId: string | null = null;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    paymentIntentId =
      typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null);
  } catch {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  if (!paymentIntentId) {
    return NextResponse.json({ ready: false });
  }

  const giftCard = await prisma.giftCard.findUnique({
    where: { stripePaymentIntentId: paymentIntentId },
    select: { id: true },
  });

  return NextResponse.json({ ready: Boolean(giftCard) });
}
