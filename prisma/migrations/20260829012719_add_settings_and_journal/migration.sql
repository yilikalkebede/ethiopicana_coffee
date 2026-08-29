-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "freeShippingThreshold" DECIMAL(10,2) NOT NULL DEFAULT 35,
    "flatShippingRate" DECIMAL(10,2) NOT NULL DEFAULT 6,
    "checkoutReservationMinutes" INTEGER NOT NULL DEFAULT 30,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalPost" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT,
    "body" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JournalPost_slug_key" ON "JournalPost"("slug");

-- CreateIndex
CREATE INDEX "JournalPost_slug_idx" ON "JournalPost"("slug");

-- CreateIndex
CREATE INDEX "JournalPost_published_publishedAt_idx" ON "JournalPost"("published", "publishedAt");

-- AddForeignKey
ALTER TABLE "JournalPost" ADD CONSTRAINT "JournalPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
