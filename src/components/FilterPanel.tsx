import Link from "next/link";
import { FilterSelects } from "@/components/FilterSelects";

function chipHref(searchParams: Record<string, string | string[] | undefined>, categorySlug?: string) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string" && key !== "category" && key !== "page") params.set(key, value);
  }
  if (categorySlug) params.set("category", categorySlug);
  const qs = params.toString();
  return qs ? `/shop?${qs}` : "/shop";
}

export function FilterPanel({
  categories,
  regions,
  roasts,
  searchParams,
}: {
  categories: { name: string; slug: string }[];
  regions: string[];
  roasts: string[];
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const activeCategory = typeof searchParams.category === "string" ? searchParams.category : undefined;

  return (
    <div className="space-y-6 border-b border-line pb-8">
      <div className="flex flex-wrap gap-2">
        <Link
          href={chipHref(searchParams)}
          className={`tag-pill ${!activeCategory ? "border-belt-500 text-belt-700" : ""}`}
        >
          All Coffee
        </Link>
        {categories.map((category) => (
          <Link
            key={category.slug}
            href={chipHref(searchParams, category.slug)}
            className={`tag-pill ${activeCategory === category.slug ? "border-belt-500 text-belt-700" : ""}`}
          >
            {category.name}
          </Link>
        ))}
      </div>

      <FilterSelects regions={regions} roasts={roasts} />
    </div>
  );
}
