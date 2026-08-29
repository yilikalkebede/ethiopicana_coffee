import { requirePortalUser } from "@/lib/portalAuth";
import { PortalShell } from "@/components/PortalShell";
import { RewardTiersView } from "@/components/RewardTiersView";

export default async function AdminRewardTiersPage() {
  await requirePortalUser("ADMIN", "/admin/reward-tiers");

  return (
    <PortalShell basePath="/admin" roleLabel="Admin" active="reward-tiers">
      <RewardTiersView />
    </PortalShell>
  );
}
