-- CreateIndex
CREATE UNIQUE INDEX "DiscoveryBoxItem_productId_includedProductId_key" ON "DiscoveryBoxItem"("productId", "includedProductId");
