import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GiftClaimForm } from "@/components/GiftClaimForm";

export default async function GiftClaimPage({ params }: { params: { token: string } }) {
  const gift = await prisma.giftSubscription.findUnique({ where: { claimToken: params.token }, include: { purchaser: true } });
  if (!gift) notFound();

  const user = await getCurrentUser();

  const addresses = user
    ? await prisma.address.findMany({ where: { userId: user.id }, orderBy: [{ isDefaultShipping: "desc" }, { createdAt: "desc" }] })
    : [];

  return (
    <section className="mx-auto max-w-2xl px-6 py-16">
      <p className="font-mono text-[11px] uppercase tracking-tag text-belt-700">You&apos;ve got a gift</p>
      <h1 className="mt-2 text-4xl text-ink">
        {gift.purchaser.firstName} sent you {gift.durationMonths} months of Ethiopian coffee.
      </h1>
      {gift.giftMessage && (
        <p className="mt-4 border border-line bg-belt-50 p-4 font-body text-ink-soft">&ldquo;{gift.giftMessage}&rdquo;</p>
      )}

      {gift.status !== "SENT" ? (
        <p className="mt-8 font-body text-sm text-rust">
          {gift.status === "CLAIMED" ? "This gift has already been claimed." : "This gift is no longer available."}
        </p>
      ) : !user ? (
        <div className="mt-8 border border-line p-6">
          <p className="font-body text-sm text-ink-soft">Sign in or create an account to claim it.</p>
          <div className="mt-4 flex gap-4">
            <Link href={`/login?next=${encodeURIComponent(`/gifts/claim/${params.token}`)}`} className="btn-primary !px-5 !py-2 text-sm">
              Sign in
            </Link>
            <Link href={`/register?next=${encodeURIComponent(`/gifts/claim/${params.token}`)}`} className="btn-secondary !px-5 !py-2 text-sm">
              Create account
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-8">
          <h2 className="font-display text-lg text-ink">Pick your coffee</h2>
          <p className="mt-1 font-body text-sm text-ink-soft">
            {gift.ounces}oz every 4 weeks, for {gift.durationMonths} months — already paid for. Just tell us how you drink it.
          </p>
          <div className="mt-6">
            <GiftClaimForm
              token={params.token}
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
          </div>
        </div>
      )}
    </section>
  );
}
