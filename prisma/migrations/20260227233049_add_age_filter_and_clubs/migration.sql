-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "maxAge" INTEGER,
ADD COLUMN     "minAge" INTEGER;

-- CreateTable
CREATE TABLE "Club" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sportId" TEXT,
    "cityId" TEXT,
    "website" TEXT,
    "logoUrl" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Club_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserClubMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserClubMembership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Club_sportId_idx" ON "Club"("sportId");

-- CreateIndex
CREATE INDEX "Club_cityId_idx" ON "Club"("cityId");

-- CreateIndex
CREATE UNIQUE INDEX "Club_name_cityId_key" ON "Club"("name", "cityId");

-- CreateIndex
CREATE INDEX "UserClubMembership_userId_idx" ON "UserClubMembership"("userId");

-- CreateIndex
CREATE INDEX "UserClubMembership_clubId_idx" ON "UserClubMembership"("clubId");

-- CreateIndex
CREATE UNIQUE INDEX "UserClubMembership_userId_clubId_key" ON "UserClubMembership"("userId", "clubId");

-- AddForeignKey
ALTER TABLE "Club" ADD CONSTRAINT "Club_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Club" ADD CONSTRAINT "Club_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserClubMembership" ADD CONSTRAINT "UserClubMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserClubMembership" ADD CONSTRAINT "UserClubMembership_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
