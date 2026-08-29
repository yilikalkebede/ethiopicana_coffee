import { requirePortalUser } from "@/lib/portalAuth";
import { PortalShell } from "@/components/PortalShell";
import { JournalPostForm } from "@/components/JournalPostForm";

export default async function ManagerNewJournalPostPage() {
  await requirePortalUser("MANAGER", "/manager/journal/new");

  return (
    <PortalShell basePath="/manager" roleLabel="Manager" active="journal">
      <h1 className="text-3xl text-ink">New post</h1>
      <div className="mt-8">
        <JournalPostForm mode="create" basePath="/manager" />
      </div>
    </PortalShell>
  );
}
