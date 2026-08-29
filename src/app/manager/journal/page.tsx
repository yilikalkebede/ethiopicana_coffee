import { requirePortalUser } from "@/lib/portalAuth";
import { PortalShell } from "@/components/PortalShell";
import { JournalPostsView } from "@/components/JournalPostsView";

export default async function ManagerJournalPage() {
  await requirePortalUser("MANAGER", "/manager/journal");

  return (
    <PortalShell basePath="/manager" roleLabel="Manager" active="journal">
      <JournalPostsView basePath="/manager" />
    </PortalShell>
  );
}
