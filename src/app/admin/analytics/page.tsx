import { requirePortalUser } from "@/lib/portalAuth";
import { PortalShell } from "@/components/PortalShell";
import { AnalyticsView } from "@/components/AnalyticsView";

export default async function AdminAnalyticsPage() {
  await requirePortalUser("ADMIN", "/admin/analytics");

  return (
    <PortalShell basePath="/admin" roleLabel="Admin" active="analytics">
      <AnalyticsView />
    </PortalShell>
  );
}
