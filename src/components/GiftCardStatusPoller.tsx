"use client";

import { useEffect, useRef, useState } from "react";

const MAX_ATTEMPTS = 15; // ~30s at a 2s interval
const INTERVAL_MS = 2000;

/** Same pattern as GiftStatusPoller: the checkout.session.completed webhook,
 * not this page, creates the GiftCard row and sends the recipient's email —
 * there's no code to display here, it only ever goes to their inbox. */
export function GiftCardStatusPoller({ sessionId, recipientEmail }: { sessionId: string; recipientEmail: string }) {
  const [attempts, setAttempts] = useState(0);
  const [ready, setReady] = useState(false);
  const stoppedRef = useRef(false);

  useEffect(() => {
    if (attempts >= MAX_ATTEMPTS || stoppedRef.current) return;

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/gift-cards/status?session_id=${encodeURIComponent(sessionId)}`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.ready) {
            stoppedRef.current = true;
            setReady(true);
            return;
          }
        }
      } finally {
        if (!stoppedRef.current) setAttempts((a) => a + 1);
      }
    }, INTERVAL_MS);

    return () => clearTimeout(timer);
  }, [attempts, sessionId]);

  if (ready) {
    return (
      <p role="status" className="font-body text-sm text-ink">
        Sent! <strong>{recipientEmail}</strong> will receive the gift card code by email.
      </p>
    );
  }

  if (attempts >= MAX_ATTEMPTS) {
    return (
      <p role="status" className="font-body text-sm text-ink-soft">
        Still confirming with Stripe — refresh this page shortly, or check your email receipt for the payment.
      </p>
    );
  }

  return (
    <p role="status" aria-live="polite" className="font-body text-sm text-ink-soft">
      Confirming your payment…
    </p>
  );
}
