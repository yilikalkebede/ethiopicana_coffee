import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { CheckoutForm } from "@/components/CheckoutForm";

export default async function CheckoutPage() {
  const user = await getCurrentUser();
  const [addresses, settings] = await Promise.all([
    user
      ? prisma.address.findMany({
          where: { userId: user.id },
          orderBy: [{ isDefaultShipping: "desc" }, { createdAt: "desc" }],
        })
      : Promise.resolve([]),
    getSettings(),
  ]);

  return (
    <section className="mx-auto max-w-4xl px-6 py-16">
      <p className="font-mono text-[11px] uppercase tracking-tag text-belt-700">Checkout</p>
      <h1 className="mt-2 text-4xl text-ink">Checkout</h1>

      <CheckoutForm
        userEmail={user?.email ?? null}
        addresses={addresses.map((a) => ({
          id: a.id,
          firstName: a.firstName,
          lastName: a.lastName,
          company: a.company ?? "",
          address1: a.address1,
          address2: a.address2 ?? "",
          city: a.city,
          state: a.state,
          postalCode: a.postalCode,
          country: a.country,
          phone: a.phone ?? "",
          isDefaultShipping: a.isDefaultShipping,
        }))}
        freeShippingThreshold={settings.freeShippingThreshold}
        flatShippingRate={settings.flatShippingRate}
      />
    </section>
  );
}
