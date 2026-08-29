import { prisma } from "@/lib/prisma";
import { DataTable } from "@/components/DataTable";
import { ReviewModerationActions } from "@/components/ReviewModerationActions";
import type { ReviewStatus } from "@prisma/client";

const STATUSES: ReviewStatus[] = ["PENDING", "APPROVED", "REJECTED", "HIDDEN"];

export async function ReviewsView({ basePath, status }: { basePath: "/admin" | "/manager"; status?: string }) {
  const where = status && STATUSES.includes(status as ReviewStatus) ? { status: status as ReviewStatus } : {};
  const reviews = await prisma.review.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { user: true, product: true },
  });

  return (
    <div>
      <h1 className="text-3xl text-ink">Reviews</h1>

      <form action={`${basePath}/reviews`} method="GET" className="mt-6 flex gap-4">
        <select
          name="status"
          defaultValue={status ?? ""}
          className="border border-line bg-paper px-3 py-2 font-body text-sm text-ink"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button type="submit" className="btn-secondary !px-4 !py-2 text-sm">
          Filter
        </button>
      </form>

      <div className="mt-6">
        <DataTable
          headers={["Product", "Customer", "Rating", "Review", "Status", ""]}
          isEmpty={reviews.length === 0}
          emptyMessage="No reviews match."
        >
          {reviews.map((r) => (
            <tr key={r.id} className="border-b border-line last:border-b-0 hover:bg-belt-50/50">
              <td className="px-4 py-3 text-ink">{r.product.name}</td>
              <td className="px-4 py-3 text-ink-soft">{r.user.firstName} {r.user.lastName}</td>
              <td className="px-4 py-3 text-ink-soft">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</td>
              <td className="px-4 py-3 max-w-xs">
                {r.title && <p className="font-body text-sm text-ink">{r.title}</p>}
                <p className="font-body text-xs text-ink-soft line-clamp-2">{r.body}</p>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center border px-2.5 py-1 font-mono text-[10px] uppercase tracking-tag ${
                    r.status === "APPROVED"
                      ? "border-belt-500/40 text-belt-700"
                      : r.status === "PENDING"
                        ? "border-ochre-500/50 text-ochre-700"
                        : "border-rust/40 text-rust"
                  }`}
                >
                  {r.status}
                </span>
              </td>
              <td className="px-4 py-3">
                <ReviewModerationActions reviewId={r.id} status={r.status} />
              </td>
            </tr>
          ))}
        </DataTable>
      </div>
    </div>
  );
}
