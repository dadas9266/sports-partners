-- CreateIndex
CREATE INDEX "Listing_status_dateTime_idx" ON "Listing"("status", "dateTime");

-- CreateIndex
CREATE INDEX "Listing_sportId_idx" ON "Listing"("sportId");

-- CreateIndex
CREATE INDEX "Listing_districtId_idx" ON "Listing"("districtId");

-- CreateIndex
CREATE INDEX "Listing_userId_idx" ON "Listing"("userId");

-- CreateIndex
CREATE INDEX "Listing_status_sportId_dateTime_idx" ON "Listing"("status", "sportId", "dateTime");

-- CreateIndex
CREATE INDEX "Match_user1Id_idx" ON "Match"("user1Id");

-- CreateIndex
CREATE INDEX "Match_user2Id_idx" ON "Match"("user2Id");

-- CreateIndex
CREATE INDEX "Response_userId_idx" ON "Response"("userId");

-- CreateIndex
CREATE INDEX "Response_status_idx" ON "Response"("status");
