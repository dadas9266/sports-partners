-- AlterTable
ALTER TABLE "VenueProfile" ADD COLUMN     "amenities" TEXT[] DEFAULT ARRAY[]::TEXT[];
