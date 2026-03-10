-- Fix migration drift: add columns and tables that exist in schema but are missing from migrations

-- 1. PostComment.parentId + self-relation + index
ALTER TABLE "PostComment" ADD COLUMN "parentId" TEXT;
ALTER TABLE "PostComment" ADD CONSTRAINT "PostComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "PostComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "PostComment_parentId_idx" ON "PostComment"("parentId");

-- 2. CommentLike table
CREATE TABLE "CommentLike" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommentLike_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CommentLike_commentId_userId_key" ON "CommentLike"("commentId", "userId");
CREATE INDEX "CommentLike_commentId_idx" ON "CommentLike"("commentId");
CREATE INDEX "CommentLike_userId_idx" ON "CommentLike"("userId");

ALTER TABLE "CommentLike" ADD CONSTRAINT "CommentLike_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "PostComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommentLike" ADD CONSTRAINT "CommentLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 3. Match.u1Approved, Match.u2Approved
ALTER TABLE "Match" ADD COLUMN "u1Approved" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Match" ADD COLUMN "u2Approved" BOOLEAN NOT NULL DEFAULT false;

-- 4. TrainerProfile.experienceYears
ALTER TABLE "TrainerProfile" ADD COLUMN "experienceYears" INTEGER;

-- 5. BotTask.listingDateTime
ALTER TABLE "BotTask" ADD COLUMN "listingDateTime" TIMESTAMP(3);
