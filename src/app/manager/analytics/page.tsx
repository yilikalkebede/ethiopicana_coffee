import { requirePortalUser } from "@/lib/portalAuth";
import { PortalShell } from "@/components/PortalShell";
import { AnalyticsView } from "@/components/AnalyticsView";

export default async function ManagerAnalyticsPage() {
  await requirePortalUser("MANAGER", "/manager/analytics");

  return (
    <PortalShell basePath="/manager" roleLabel="Manager" active="analytics">
      <AnalyticsView />
    </PortalShell>
  );
}
