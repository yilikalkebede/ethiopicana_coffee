import { requirePortalUser } from "@/lib/portalAuth";
import { PortalShell } from "@/components/PortalShell";
import { CouponsView } from "@/components/CouponsView";

export default async function AdminCouponsPage() {
  await requirePortalUser("ADMIN", "/admin/coupons");

  return (
    <PortalShell basePath="/admin" roleLabel="Admin" active="coupons">
      <CouponsView />
    </PortalShell>
  );
}
