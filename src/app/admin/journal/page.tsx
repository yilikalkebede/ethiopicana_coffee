import { requirePortalUser } from "@/lib/portalAuth";
import { PortalShell } from "@/components/PortalShell";
import { JournalPostsView } from "@/components/JournalPostsView";

export default async function AdminJournalPage() {
  await requirePortalUser("ADMIN", "/admin/journal");

  return (
    <PortalShell basePath="/admin" roleLabel="Admin" active="journal">
      <JournalPostsView basePath="/admin" />
    </PortalShell>
  );
}
