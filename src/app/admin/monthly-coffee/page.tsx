import { requirePortalUser } from "@/lib/portalAuth";
import { PortalShell } from "@/components/PortalShell";
import { MonthlyCoffeeView } from "@/components/MonthlyCoffeeView";

export default async function AdminMonthlyCoffeePage() {
  await requirePortalUser("ADMIN", "/admin/monthly-coffee");

  return (
    <PortalShell basePath="/admin" roleLabel="Admin" active="monthly-coffee">
      <MonthlyCoffeeView />
    </PortalShell>
  );
}
