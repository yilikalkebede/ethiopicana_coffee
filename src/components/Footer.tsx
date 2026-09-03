import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-line bg-paper">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-6">
          <div className="col-span-2">
            <p className="font-display text-lg text-ink">
              Ethiopicana <span className="italic text-belt-500">Coffee</span>
            </p>
            <p className="mt-3 max-w-xs font-body text-sm text-ink-soft">
              Every bag we sell is Ethiopian — coffee&apos;s birthplace. We buy
              directly from named regions and washing stations, then roast
              each lot to order.
            </p>
          </div>

          <div>
            <p className="font-body text-xs uppercase tracking-tag text-ink-soft">Shop</p>
            <ul className="mt-3 space-y-2 font-body text-sm">
              <li><Link href="/shop" className="hover:text-belt-700">All coffee</Link></li>
              <li><Link href="/subscribe" className="hover:text-belt-700">Subscriptions</Link></li>
              <li><Link href="/gifts" className="hover:text-belt-700">Gifts</Link></li>
              <li><Link href="/journal" className="hover:text-belt-700">Field journal</Link></li>
            </ul>
          </div>

          <div>
            <p className="font-body text-xs uppercase tracking-tag text-ink-soft">Account</p>
            <ul className="mt-3 space-y-2 font-body text-sm">
              <li><Link href="/account/subscription" className="hover:text-belt-700">My subscription</Link></li>
              <li><Link href="/account/orders" className="hover:text-belt-700">Orders</Link></li>
              <li><Link href="/account/profile" className="hover:text-belt-700">Profile</Link></li>
              <li><Link href="/account/rewards" className="hover:text-belt-700">Rewards</Link></li>
            </ul>
          </div>

          <div>
            <p className="font-body text-xs uppercase tracking-tag text-ink-soft">Company</p>
            <ul className="mt-3 space-y-2 font-body text-sm">
              <li><Link href="/about" className="hover:text-belt-700">About</Link></li>
              <li><Link href="/contact" className="hover:text-belt-700">Contact</Link></li>
            </ul>
          </div>

          <div>
            <p className="font-body text-xs uppercase tracking-tag text-ink-soft">Legal</p>
            <ul className="mt-3 space-y-2 font-body text-sm">
              <li><Link href="/privacy" className="hover:text-belt-700">Privacy</Link></li>
              <li><Link href="/terms" className="hover:text-belt-700">Terms</Link></li>
              <li><Link href="/shipping-policy" className="hover:text-belt-700">Shipping</Link></li>
              <li><Link href="/returns-policy" className="hover:text-belt-700">Returns</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col justify-between gap-4 border-t border-line pt-6 font-mono text-[11px] uppercase tracking-tag text-ink-soft md:flex-row">
          <span>© {new Date().getFullYear()} Ethiopicana Coffee</span>
          <span>3°N–15°N — the whole of Ethiopia&apos;s coffee highlands</span>
        </div>
      </div>
    </footer>
  );
}
