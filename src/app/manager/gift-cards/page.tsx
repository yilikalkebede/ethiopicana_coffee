import { requirePortalUser } from "@/lib/portalAuth";
import { PortalShell } from "@/components/PortalShell";
import { GiftCardsView } from "@/components/GiftCardsView";

export default async function ManagerGiftCardsPage() {
  await requirePortalUser("MANAGER", "/manager/gift-cards");

  return (
    <PortalShell basePath="/manager" roleLabel="Manager" active="gift-cards">
      <GiftCardsView />
    </PortalShell>
  );
}
