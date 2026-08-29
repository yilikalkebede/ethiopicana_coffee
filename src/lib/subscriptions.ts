import { prisma } from "@/lib/prisma";

/** Same "not found rather than 403" pattern used for orders/addresses
 * elsewhere in the app — never confirms to a logged-in user that a given
 * subscription id exists at all if it isn't theirs. */
export async function getOwnedSubscription(subscriptionId: string, userId: string) {
  const subscription = await prisma.subscription.findUnique({ where: { id: subscriptionId } });
  if (!subscription || subscription.userId !== userId) return null;
  return subscription;
}
