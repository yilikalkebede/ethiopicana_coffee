-- CreateTable
CREATE TABLE "DiscoveryBoxItem" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "includedProductId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DiscoveryBoxItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DiscoveryBoxItem_productId_idx" ON "DiscoveryBoxItem"("productId");

-- AddForeignKey
ALTER TABLE "DiscoveryBoxItem" ADD CONSTRAINT "DiscoveryBoxItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscoveryBoxItem" ADD CONSTRAINT "DiscoveryBoxItem_includedProductId_fkey" FOREIGN KEY ("includedProductId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
