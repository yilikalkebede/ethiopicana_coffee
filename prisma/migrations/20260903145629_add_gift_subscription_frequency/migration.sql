-- AlterTable
ALTER TABLE "GiftSubscription" ADD COLUMN     "frequency" "SubscriptionFrequency" NOT NULL DEFAULT 'EVERY_4_WEEKS',
ADD COLUMN     "shipments" INTEGER NOT NULL DEFAULT 3;
