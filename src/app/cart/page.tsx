import { getSettings } from "@/lib/settings";
import { CartPageClient } from "@/components/CartPageClient";

export default async function CartPage() {
  const settings = await getSettings();

  return <CartPageClient freeShippingThreshold={settings.freeShippingThreshold} />;
}
