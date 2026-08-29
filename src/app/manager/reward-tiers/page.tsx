import { requirePortalUser } from "@/lib/portalAuth";
import { PortalShell } from "@/components/PortalShell";
import { RewardTiersView } from "@/components/RewardTiersView";

export default async function ManagerRewardTiersPage() {
  await requirePortalUser("MANAGER", "/manager/reward-tiers");

  return (
    <PortalShell basePath="/manager" roleLabel="Manager" active="reward-tiers">
      <RewardTiersView />
    </PortalShell>
  );
}
