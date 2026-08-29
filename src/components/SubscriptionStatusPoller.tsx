"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const MAX_ATTEMPTS = 15; // ~30s at a 2s interval
const INTERVAL_MS = 2000;

/** Same pattern as OrderStatusPoller (Phase 3): the checkout.session.completed
 * webhook — not this page or the browser redirect — is what actually creates
 * the Subscription row. This just watches for that and refreshes once ready. */
export function SubscriptionStatusPoller({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [attempts, setAttempts] = useState(0);
  const stoppedRef = useRef(false);

  useEffect(() => {
    if (attempts >= MAX_ATTEMPTS || stoppedRef.current) return;

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/subscriptions/status?session_id=${encodeURIComponent(sessionId)}`, {
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          if (data.ready) {
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
  }, [attempts, sessionId, router]);

  if (attempts >= MAX_ATTEMPTS) {
    return (
      <p role="status" className="font-body text-sm text-ink-soft">
        Still confirming with Stripe — this can take a moment longer than usual. Refresh this page, or check{" "}
        <a href="/account/subscription" className="underline underline-offset-2">
          your subscription
        </a>{" "}
        shortly.
      </p>
    );
  }

  return (
    <p role="status" aria-live="polite" className="font-body text-sm text-ink-soft">
      Setting up your subscription…
    </p>
  );
}
