-- AlterTable
ALTER TABLE "GiftSubscription" ADD COLUMN     "amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "stripePaymentIntentId" TEXT,
ADD COLUMN     "subscriptionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "GiftSubscription_stripePaymentIntentId_key" ON "GiftSubscription"("stripePaymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "GiftSubscription_subscriptionId_key" ON "GiftSubscription"("subscriptionId");

-- AddForeignKey
ALTER TABLE "GiftSubscription" ADD CONSTRAINT "GiftSubscription_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
