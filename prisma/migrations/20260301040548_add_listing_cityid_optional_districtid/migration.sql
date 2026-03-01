-- DropForeignKey
ALTER TABLE "Listing" DROP CONSTRAINT "Listing_districtId_fkey";

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "cityId" TEXT,
ALTER COLUMN "districtId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;
