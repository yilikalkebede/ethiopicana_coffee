import { requirePortalUser } from "@/lib/portalAuth";
import { PortalShell } from "@/components/PortalShell";
import { SuppliersView } from "@/components/SuppliersView";

export default async function ManagerSuppliersPage() {
  await requirePortalUser("MANAGER", "/manager/suppliers");

  return (
    <PortalShell basePath="/manager" roleLabel="Manager" active="suppliers">
      <SuppliersView />
    </PortalShell>
  );
}
