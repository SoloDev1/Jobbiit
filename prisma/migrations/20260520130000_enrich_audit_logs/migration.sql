-- CreateEnum
CREATE TYPE "AuditLogStatus" AS ENUM ('SUCCESS', 'FAILURE');

-- AlterEnum (auth & account lifecycle)
ALTER TYPE "AuditAction" ADD VALUE 'SIGNUP';
ALTER TYPE "AuditAction" ADD VALUE 'LOGIN_SUCCESS';
ALTER TYPE "AuditAction" ADD VALUE 'LOGIN_FAILED';
ALTER TYPE "AuditAction" ADD VALUE 'LOGOUT';
ALTER TYPE "AuditAction" ADD VALUE 'OAUTH_SIGNIN_EXISTING';
ALTER TYPE "AuditAction" ADD VALUE 'OAUTH_SIGNIN_NEW';
ALTER TYPE "AuditAction" ADD VALUE 'REFRESH_TOKEN_REUSE';
ALTER TYPE "AuditAction" ADD VALUE 'ACCOUNT_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'ACCOUNT_DELETED_OAUTH';

-- AlterEnum (password recovery)
ALTER TYPE "AuditAction" ADD VALUE 'PASSWORD_RESET_REQUESTED';
ALTER TYPE "AuditAction" ADD VALUE 'PASSWORD_RESET_COMPLETED';
ALTER TYPE "AuditAction" ADD VALUE 'PASSWORD_OTP_REQUESTED';
ALTER TYPE "AuditAction" ADD VALUE 'PASSWORD_OTP_VERIFY_SUCCESS';
ALTER TYPE "AuditAction" ADD VALUE 'PASSWORD_OTP_VERIFY_FAILED';

-- AlterEnum (content)
ALTER TYPE "AuditAction" ADD VALUE 'JOB_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'JOB_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'JOB_CLOSED';
ALTER TYPE "AuditAction" ADD VALUE 'REPORT_CREATED';

-- AlterEnum (admin messaging)
ALTER TYPE "AuditAction" ADD VALUE 'ADMIN_PUSH_SENT';
ALTER TYPE "AuditAction" ADD VALUE 'ADMIN_NOTIFICATION_SENT';

-- AlterTable: make actorId nullable, drop old FK and recreate with SetNull
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_actorId_fkey";
ALTER TABLE "AuditLog" ALTER COLUMN "actorId" DROP NOT NULL;
ALTER TABLE "AuditLog"
  ADD CONSTRAINT "AuditLog_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: enrichment columns
ALTER TABLE "AuditLog" ADD COLUMN "status"        "AuditLogStatus" NOT NULL DEFAULT 'SUCCESS';
ALTER TABLE "AuditLog" ADD COLUMN "errorMessage" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "ipAddress"    TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "userAgent"    TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "requestId"    TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "method"       TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "path"         TEXT;

-- CreateIndex
CREATE INDEX "AuditLog_entityType_idx" ON "AuditLog"("entityType");
CREATE INDEX "AuditLog_status_idx"     ON "AuditLog"("status");
CREATE INDEX "AuditLog_requestId_idx"  ON "AuditLog"("requestId");
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");
