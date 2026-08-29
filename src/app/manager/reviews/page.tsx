import { requirePortalUser } from "@/lib/portalAuth";
import { PortalShell } from "@/components/PortalShell";
import { ReviewsView } from "@/components/ReviewsView";

export default async function ManagerReviewsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  await requirePortalUser("MANAGER", "/manager/reviews");
  const status = typeof searchParams.status === "string" ? searchParams.status : undefined;

  return (
    <PortalShell basePath="/manager" roleLabel="Manager" active="reviews">
      <ReviewsView basePath="/manager" status={status} />
    </PortalShell>
  );
}
