import { requirePortalUser } from "@/lib/portalAuth";
import { PortalShell } from "@/components/PortalShell";
import { GiftCardsView } from "@/components/GiftCardsView";

export default async function AdminGiftCardsPage() {
  await requirePortalUser("ADMIN", "/admin/gift-cards");

  return (
    <PortalShell basePath="/admin" roleLabel="Admin" active="gift-cards">
      <GiftCardsView />
    </PortalShell>
  );
}
