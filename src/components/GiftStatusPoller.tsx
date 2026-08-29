"use client";

import { useEffect, useRef, useState } from "react";

const MAX_ATTEMPTS = 15; // ~30s at a 2s interval
const INTERVAL_MS = 2000;

/** Same pattern as SubscriptionStatusPoller: the checkout.session.completed
 * webhook, not this page, creates the GiftSubscription row. Polls for the
 * real claim link once it exists rather than fabricating one. */
export function GiftStatusPoller({ sessionId }: { sessionId: string }) {
  const [attempts, setAttempts] = useState(0);
  const [claimToken, setClaimToken] = useState<string | null>(null);
  const stoppedRef = useRef(false);

  useEffect(() => {
    if (attempts >= MAX_ATTEMPTS || stoppedRef.current) return;

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/gifts/status?session_id=${encodeURIComponent(sessionId)}`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.ready && data.claimToken) {
            stoppedRef.current = true;
            setClaimToken(data.claimToken);
            return;
          }
        }
      } finally {
        if (!stoppedRef.current) setAttempts((a) => a + 1);
      }
    }, INTERVAL_MS);

    return () => clearTimeout(timer);
  }, [attempts, sessionId]);

  if (claimToken) {
    return <ClaimLink claimToken={claimToken} />;
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

function ClaimLink({ claimToken }: { claimToken: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? `${window.location.origin}/gifts/claim/${claimToken}` : `/gifts/claim/${claimToken}`;

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="border border-belt-500 p-4">
      <p className="font-body text-sm text-ink">Share this link with them:</p>
      <div className="mt-2 flex items-center gap-3">
        <code className="flex-1 overflow-x-auto whitespace-nowrap border border-line bg-belt-50 px-3 py-2 font-mono text-xs text-ink">{url}</code>
        <button type="button" onClick={copy} className="btn-secondary !px-4 !py-2 text-xs">
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}
