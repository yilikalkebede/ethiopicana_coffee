import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NotificationPreferencesForm } from "@/components/NotificationPreferencesForm";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account/notifications");

  const prefs = await prisma.notificationPreference.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  });

  return (
    <section className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/account" className="font-mono text-[11px] uppercase tracking-tag text-ink-soft hover:text-belt-700">
        ← Account
      </Link>

      <h1 className="mt-4 text-3xl text-ink">Email preferences</h1>
      <p className="mt-2 font-body text-sm text-ink-soft">
        Order confirmations and account emails (password resets, verification) always send — these control everything else.
      </p>

      <div className="mt-8">
        <NotificationPreferencesForm
          initial={{
            marketingEmail: prefs.marketingEmail,
            subscriptionReminders: prefs.subscriptionReminders,
            shippingNotifications: prefs.shippingNotifications,
            promotions: prefs.promotions,
            rewardsUpdates: prefs.rewardsUpdates,
            productAnnouncements: prefs.productAnnouncements,
          }}
        />
      </div>
    </section>
  );
}
