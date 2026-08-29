import { requirePortalUser } from "@/lib/portalAuth";
import { PortalShell } from "@/components/PortalShell";
import { ReviewsView } from "@/components/ReviewsView";

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  await requirePortalUser("ADMIN", "/admin/reviews");
  const status = typeof searchParams.status === "string" ? searchParams.status : undefined;

  return (
    <PortalShell basePath="/admin" roleLabel="Admin" active="reviews">
      <ReviewsView basePath="/admin" status={status} />
    </PortalShell>
  );
}
