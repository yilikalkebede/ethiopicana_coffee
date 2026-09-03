import Link from "next/link";
import { SearchBar } from "@/components/SearchBar";
import { CartLink } from "@/components/CartLink";
import { AccountMenu } from "@/components/AccountMenu";
import { GiftsMenu } from "@/components/GiftsMenu";

type NavUser = { firstName: string; role: "ADMIN" | "MANAGER" | "CUSTOMER" } | null;

export function Navbar({ user }: { user: NavUser }) {
  return (
    <header className="border-b border-line bg-paper">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
        <Link href="/" className="shrink-0 font-display text-xl tracking-tight text-ink">
          Ethiopicana <span className="italic text-belt-500">Coffee</span>
        </Link>

        <nav className="hidden items-center gap-8 font-body text-sm text-ink-soft lg:flex">
          <Link href="/shop" className="hover:text-ink">
            Shop
          </Link>
          <Link href="/subscribe" className="hover:text-ink">
            Build a Subscription
          </Link>
          <Link href="/build-a-box" className="hover:text-ink">
            Build a Box
          </Link>
          <Link href="/origins" className="hover:text-ink">
            Origins
          </Link>
          <GiftsMenu />
          <Link href="/journal" className="hover:text-ink">
            Field Journal
          </Link>
        </nav>

        <div className="hidden flex-1 justify-end md:flex">
          <SearchBar />
        </div>

        <div className="flex shrink-0 items-center gap-4">
          {user ? (
            <AccountMenu user={user} />
          ) : (
            <Link href="/login" className="font-body text-sm text-ink hover:text-belt-700">
              Sign in
            </Link>
          )}
          <CartLink />
        </div>
      </div>
    </header>
  );
}
