-- CreateEnum
CREATE TYPE "PrivacyLevel" AS ENUM ('EVERYONE', 'FOLLOWERS', 'NOBODY');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "profileVisibility" "PrivacyLevel" NOT NULL DEFAULT 'EVERYONE',
ADD COLUMN     "showOnLeaderboard" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "whoCanChallenge" "PrivacyLevel" NOT NULL DEFAULT 'EVERYONE',
ADD COLUMN     "whoCanMessage" "PrivacyLevel" NOT NULL DEFAULT 'EVERYONE';
