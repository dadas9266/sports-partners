-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LessonStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isPrivateProfile" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "TrainerEnrollment" (
    "id" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "sportName" TEXT,
    "totalLessons" INTEGER NOT NULL DEFAULT 1,
    "usedLessons" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainerEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainerLesson" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "status" "LessonStatus" NOT NULL DEFAULT 'SCHEDULED',
    "trainerNotes" TEXT,
    "homeworkText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainerLesson_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrainerEnrollment_trainerId_idx" ON "TrainerEnrollment"("trainerId");

-- CreateIndex
CREATE INDEX "TrainerEnrollment_studentId_idx" ON "TrainerEnrollment"("studentId");

-- CreateIndex
CREATE INDEX "TrainerEnrollment_status_idx" ON "TrainerEnrollment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TrainerEnrollment_trainerId_studentId_key" ON "TrainerEnrollment"("trainerId", "studentId");

-- CreateIndex
CREATE INDEX "TrainerLesson_enrollmentId_idx" ON "TrainerLesson"("enrollmentId");

-- CreateIndex
CREATE INDEX "TrainerLesson_status_idx" ON "TrainerLesson"("status");

-- AddForeignKey
ALTER TABLE "TrainerEnrollment" ADD CONSTRAINT "TrainerEnrollment_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainerEnrollment" ADD CONSTRAINT "TrainerEnrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainerLesson" ADD CONSTRAINT "TrainerLesson_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "TrainerEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
