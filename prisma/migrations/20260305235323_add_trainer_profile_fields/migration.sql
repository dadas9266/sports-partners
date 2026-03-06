-- AlterTable
ALTER TABLE "TrainerProfile" ADD COLUMN     "certNote" TEXT,
ADD COLUMN     "department" TEXT,
ADD COLUMN     "lessonTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "providesEquipment" BOOLEAN,
ADD COLUMN     "trainerBadgeVisible" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "university" TEXT;
