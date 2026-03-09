-- AlterTable
ALTER TABLE "Post" ADD COLUMN "communityId" TEXT;

-- CreateIndex
CREATE INDEX "Post_communityId_idx" ON "Post"("communityId");

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE SET NULL ON UPDATE CASCADE;