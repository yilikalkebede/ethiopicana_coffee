import { requirePortalUser } from "@/lib/portalAuth";
import { PortalShell } from "@/components/PortalShell";
import { SuppliersView } from "@/components/SuppliersView";

export default async function AdminSuppliersPage() {
  await requirePortalUser("ADMIN", "/admin/suppliers");

  return (
    <PortalShell basePath="/admin" roleLabel="Admin" active="suppliers">
      <SuppliersView />
    </PortalShell>
  );
}
