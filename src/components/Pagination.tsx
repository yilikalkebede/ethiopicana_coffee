import Link from "next/link";

function hrefFor(basePath: string, params: URLSearchParams, page: number): string {
  const next = new URLSearchParams(params);
  if (page <= 1) {
    next.delete("page");
  } else {
    next.set("page", String(page));
  }
  const qs = next.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function Pagination({
  basePath,
  searchParams,
  page,
  totalPages,
}: {
  basePath: string;
  searchParams: Record<string, string | string[] | undefined>;
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string" && key !== "page") params.set(key, value);
  }

  return (
    <nav aria-label="Pagination" className="mt-14 flex items-center justify-center gap-6 font-mono text-xs uppercase tracking-tag">
      {page > 1 ? (
        <Link href={hrefFor(basePath, params, page - 1)} className="text-ink hover:text-belt-700">
          ← Previous
        </Link>
      ) : (
        <span className="text-ink-soft/40">← Previous</span>
      )}
      <span className="text-ink-soft">
        Page {page} of {totalPages}
      </span>
      {page < totalPages ? (
        <Link href={hrefFor(basePath, params, page + 1)} className="text-ink hover:text-belt-700">
          Next →
        </Link>
      ) : (
        <span className="text-ink-soft/40">Next →</span>
      )}
    </nav>
  );
}
