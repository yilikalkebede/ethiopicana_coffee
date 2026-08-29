export function SearchBar({ defaultValue }: { defaultValue?: string }) {
  return (
    <form action="/shop" method="GET" role="search" className="relative w-full max-w-xs">
      <label htmlFor="shop-search" className="sr-only">
        Search coffee
      </label>
      <input
        id="shop-search"
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder="Search Yirgacheffe, blueberry…"
        className="w-full border border-line bg-paper px-3 py-2 font-body text-sm text-ink placeholder:text-ink-soft/70 focus-visible:outline-belt-500"
      />
    </form>
  );
}
