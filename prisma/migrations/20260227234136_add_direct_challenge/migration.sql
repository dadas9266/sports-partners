-- CreateEnum
CREATE TYPE "DirectChallengeStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'DIRECT_CHALLENGE';

-- CreateTable
CREATE TABLE "DirectChallenge" (
    "id" TEXT NOT NULL,
    "challengerId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "sportId" TEXT NOT NULL,
    "message" TEXT,
    "proposedDateTime" TIMESTAMP(3),
    "districtId" TEXT,
    "challengeType" TEXT NOT NULL DEFAULT 'RIVAL',
    "status" "DirectChallengeStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DirectChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DirectChallenge_challengerId_idx" ON "DirectChallenge"("challengerId");

-- CreateIndex
CREATE INDEX "DirectChallenge_targetId_idx" ON "DirectChallenge"("targetId");

-- CreateIndex
CREATE INDEX "DirectChallenge_status_idx" ON "DirectChallenge"("status");

-- CreateIndex
CREATE INDEX "DirectChallenge_expiresAt_idx" ON "DirectChallenge"("expiresAt");

-- AddForeignKey
ALTER TABLE "DirectChallenge" ADD CONSTRAINT "DirectChallenge_challengerId_fkey" FOREIGN KEY ("challengerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectChallenge" ADD CONSTRAINT "DirectChallenge_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectChallenge" ADD CONSTRAINT "DirectChallenge_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectChallenge" ADD CONSTRAINT "DirectChallenge_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;
