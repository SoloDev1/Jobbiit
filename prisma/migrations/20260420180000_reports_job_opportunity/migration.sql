-- AlterEnum
ALTER TYPE "ReportType" ADD VALUE 'JOB';
ALTER TYPE "ReportType" ADD VALUE 'OPPORTUNITY';

-- AlterTable
ALTER TABLE "Report" ADD COLUMN "jobId" TEXT;
ALTER TABLE "Report" ADD COLUMN "opportunityId" TEXT;

-- CreateIndex
CREATE INDEX "Report_jobId_idx" ON "Report"("jobId");
CREATE INDEX "Report_opportunityId_idx" ON "Report"("opportunityId");

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
