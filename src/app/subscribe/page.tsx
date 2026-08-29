import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SubscriptionBuilder } from "@/components/SubscriptionBuilder";

export default async function SubscribePage() {
  const user = await getCurrentUser();
  const addresses = user
    ? await prisma.address.findMany({
        where: { userId: user.id },
        orderBy: [{ isDefaultShipping: "desc" }, { createdAt: "desc" }],
      })
    : [];

  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <p className="font-mono text-[11px] uppercase tracking-tag text-belt-700">Build Your Subscription</p>
      <h1 className="mt-2 text-4xl text-ink">Coffee, tuned to how you actually drink it.</h1>
      <p className="mt-3 max-w-xl font-body text-sm text-ink-soft">
        Seven quick questions, then we match a real Ethiopian coffee to your taste — pause, skip, or change any of
        this later from your account.
      </p>

      <SubscriptionBuilder
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
      />
    </section>
  );
}
