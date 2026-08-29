import { requirePortalUser } from "@/lib/portalAuth";
import { PortalShell } from "@/components/PortalShell";
import { CouponsView } from "@/components/CouponsView";

export default async function ManagerCouponsPage() {
  await requirePortalUser("MANAGER", "/manager/coupons");

  return (
    <PortalShell basePath="/manager" roleLabel="Manager" active="coupons">
      <CouponsView />
    </PortalShell>
  );
}
