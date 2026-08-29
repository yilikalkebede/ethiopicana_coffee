"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const MAX_ATTEMPTS = 15; // ~30s at a 2s interval
const INTERVAL_MS = 2000;

/**
 * Watches an order that hasn't been confirmed as PAID yet (the webhook
 * hasn't landed) and refreshes the server component once it is, rather
 * than the success page ever claiming payment succeeded on the strength of
 * the redirect alone.
 */
export function OrderStatusPoller({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [attempts, setAttempts] = useState(0);
  const stoppedRef = useRef(false);

  useEffect(() => {
    if (attempts >= MAX_ATTEMPTS || stoppedRef.current) return;

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}/status`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.paymentStatus === "PAID") {
            stoppedRef.current = true;
            router.refresh();
            return;
          }
        }
      } finally {
        if (!stoppedRef.current) setAttempts((a) => a + 1);
      }
    }, INTERVAL_MS);

    return () => clearTimeout(timer);
  }, [attempts, orderId, router]);

  if (attempts >= MAX_ATTEMPTS) {
    return (
      <p role="status" className="font-body text-sm text-ink-soft">
        Still confirming with Stripe — this can take a moment longer than usual. Refresh this page, or check{" "}
        <a href="/account/orders" className="underline underline-offset-2">
          your order history
        </a>{" "}
        shortly.
      </p>
    );
  }

  return (
    <p role="status" aria-live="polite" className="font-body text-sm text-ink-soft">
      Confirming your payment…
    </p>
  );
}
