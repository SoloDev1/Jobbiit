-- AlterTable
ALTER TABLE "User" ADD COLUMN "otp" TEXT,
ADD COLUMN "otp_expires_at" TIMESTAMP(3);
