-- AlterTable
ALTER TABLE "Club" ADD COLUMN     "creatorId" TEXT,
ADD COLUMN     "isPrivate" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "GroupMembership" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'APPROVED';

-- AlterTable
ALTER TABLE "UserClubMembership" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'APPROVED';

-- CreateIndex
CREATE INDEX "Club_creatorId_idx" ON "Club"("creatorId");

-- CreateIndex
CREATE INDEX "UserClubMembership_status_idx" ON "UserClubMembership"("status");

-- AddForeignKey
ALTER TABLE "Club" ADD CONSTRAINT "Club_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
