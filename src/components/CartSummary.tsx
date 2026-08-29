import Link from "next/link";
import { formatPrice } from "@/lib/format";

export function CartSummary({
  subtotal,
  freeShippingThreshold,
  onCheckoutClick,
}: {
  subtotal: number;
  freeShippingThreshold: number;
  onCheckoutClick?: () => void;
}) {
  const remaining = Math.max(freeShippingThreshold - subtotal, 0);
  const progress = Math.min((subtotal / freeShippingThreshold) * 100, 100);

  return (
    <div className="space-y-4 border-t border-line pt-5">
      <div>
        {remaining > 0 ? (
          <p className="font-body text-xs text-ink-soft">
            You are {formatPrice(remaining)} away from free shipping.
          </p>
        ) : (
          <p className="font-body text-xs text-belt-700">You&apos;ve unlocked free shipping.</p>
        )}
        <div className="mt-2 h-1.5 w-full bg-belt-100">
          <div className="h-1.5 bg-belt-500 transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="flex items-center justify-between font-body text-sm text-ink">
        <span>Subtotal</span>
        <span>{formatPrice(subtotal)}</span>
      </div>
      <p className="font-body text-xs text-ink-soft">Shipping and any applicable tax are calculated at checkout.</p>

      <Link href="/checkout" onClick={onCheckoutClick} className="btn-primary block w-full text-center">
        Checkout
      </Link>
    </div>
  );
}
