-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "title" TEXT,
    "inputFindings" JSONB NOT NULL,
    "summary" JSONB NOT NULL,
    "findingsByType" JSONB,
    "pdfUrl" TEXT,
    "pdfPath" TEXT,
    "fileSize" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PROCESSING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Report_executionId_key" ON "Report"("executionId");

-- CreateIndex
CREATE INDEX "Report_executionId_idx" ON "Report"("executionId");

-- CreateIndex
CREATE INDEX "Report_status_idx" ON "Report"("status");

-- CreateIndex
CREATE INDEX "Report_generatedAt_idx" ON "Report"("generatedAt");

-- CreateIndex
CREATE INDEX "Report_createdAt_idx" ON "Report"("createdAt");
