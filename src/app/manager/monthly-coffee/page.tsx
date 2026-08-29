import { requirePortalUser } from "@/lib/portalAuth";
import { PortalShell } from "@/components/PortalShell";
import { MonthlyCoffeeView } from "@/components/MonthlyCoffeeView";

export default async function ManagerMonthlyCoffeePage() {
  await requirePortalUser("MANAGER", "/manager/monthly-coffee");

  return (
    <PortalShell basePath="/manager" roleLabel="Manager" active="monthly-coffee">
      <MonthlyCoffeeView />
    </PortalShell>
  );
}
