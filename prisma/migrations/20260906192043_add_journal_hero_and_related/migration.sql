-- AlterTable
ALTER TABLE "JournalPost" ADD COLUMN     "heroImageUrl" TEXT,
ADD COLUMN     "region" TEXT;

-- CreateTable
CREATE TABLE "JournalPostProduct" (
    "id" TEXT NOT NULL,
    "journalPostId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,

    CONSTRAINT "JournalPostProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JournalPostProduct_journalPostId_idx" ON "JournalPostProduct"("journalPostId");

-- CreateIndex
CREATE UNIQUE INDEX "JournalPostProduct_journalPostId_productId_key" ON "JournalPostProduct"("journalPostId", "productId");

-- AddForeignKey
ALTER TABLE "JournalPostProduct" ADD CONSTRAINT "JournalPostProduct_journalPostId_fkey" FOREIGN KEY ("journalPostId") REFERENCES "JournalPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalPostProduct" ADD CONSTRAINT "JournalPostProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
