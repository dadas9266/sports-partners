-- CreateEnum
CREATE TYPE "BotTaskStatus" AS ENUM ('PENDING', 'LISTING_CREATED', 'RESPONSE_SENT', 'MATCH_DONE', 'FAILED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "botPersona" TEXT,
ADD COLUMN "isBot" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "BotTask" (
    "id" TEXT NOT NULL,
    "listingBotId" TEXT NOT NULL,
    "responderBotId" TEXT NOT NULL,
    "countryId" TEXT,
    "cityId" TEXT,
    "sportId" TEXT,
    "status" "BotTaskStatus" NOT NULL DEFAULT 'PENDING',
    "delaySeconds" INTEGER NOT NULL DEFAULT 300,
    "listingId" TEXT,
    "responseId" TEXT,
    "matchId" TEXT,
    "errorMessage" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "executedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BotTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BotTask_status_idx" ON "BotTask"("status");

-- CreateIndex
CREATE INDEX "BotTask_cityId_idx" ON "BotTask"("cityId");

-- CreateIndex
CREATE INDEX "BotTask_listingBotId_idx" ON "BotTask"("listingBotId");

-- AddForeignKey
ALTER TABLE "BotTask" ADD CONSTRAINT "BotTask_listingBotId_fkey" FOREIGN KEY ("listingBotId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BotTask" ADD CONSTRAINT "BotTask_responderBotId_fkey" FOREIGN KEY ("responderBotId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BotTask" ADD CONSTRAINT "BotTask_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BotTask" ADD CONSTRAINT "BotTask_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BotTask" ADD CONSTRAINT "BotTask_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE SET NULL ON UPDATE CASCADE;