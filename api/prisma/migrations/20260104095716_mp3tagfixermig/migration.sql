-- AlterTable
ALTER TABLE "Track" ADD COLUMN     "normalizedKey" TEXT;

-- CreateIndex
CREATE INDEX "Track_normalizedKey_idx" ON "Track"("normalizedKey");
