"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

const SORTS = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "name-asc", label: "Name: A–Z" },
];

export function FilterSelects({ regions, roasts, flavors }: { regions: string[]; roasts: string[]; flavors: string[] }) {
  const router = useRouter();
  const pathname = usePathname() ?? "/shop";
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        aria-label="Filter by region"
        value={searchParams?.get("region") ?? ""}
        onChange={(e) => updateParam("region", e.target.value)}
        className="border border-line bg-paper px-3 py-2 font-body text-sm text-ink"
      >
        <option value="">All regions</option>
        {regions.map((region) => (
          <option key={region} value={region}>
            {region}
          </option>
        ))}
      </select>

      <select
        aria-label="Filter by roast"
        value={searchParams?.get("roast") ?? ""}
        onChange={(e) => updateParam("roast", e.target.value)}
        className="border border-line bg-paper px-3 py-2 font-body text-sm text-ink"
      >
        <option value="">All roasts</option>
        {roasts.map((roast) => (
          <option key={roast} value={roast}>
            {roast}
          </option>
        ))}
      </select>

      <select
        aria-label="Filter by flavor"
        value={searchParams?.get("flavor") ?? ""}
        onChange={(e) => updateParam("flavor", e.target.value)}
        className="border border-line bg-paper px-3 py-2 font-body text-sm text-ink capitalize"
      >
        <option value="">All flavors</option>
        {flavors.map((flavor) => (
          <option key={flavor} value={flavor} className="capitalize">
            {flavor}
          </option>
        ))}
      </select>

      <select
        aria-label="Sort"
        value={searchParams?.get("sort") ?? "featured"}
        onChange={(e) => updateParam("sort", e.target.value)}
        className="ml-auto border border-line bg-paper px-3 py-2 font-body text-sm text-ink"
      >
        {SORTS.map((sort) => (
          <option key={sort.value} value={sort.value}>
            {sort.label}
          </option>
        ))}
      </select>
    </div>
  );
}
