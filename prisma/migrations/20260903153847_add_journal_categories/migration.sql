-- AlterTable
ALTER TABLE "JournalPost" ADD COLUMN     "categoryId" TEXT;

-- CreateTable
CREATE TABLE "JournalCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "JournalCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JournalCategory_slug_key" ON "JournalCategory"("slug");

-- AddForeignKey
ALTER TABLE "JournalPost" ADD CONSTRAINT "JournalPost_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "JournalCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
