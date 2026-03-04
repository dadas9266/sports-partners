-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "countryId" TEXT;

-- CreateIndex
CREATE INDEX "Listing_countryId_idx" ON "Listing"("countryId");

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;
