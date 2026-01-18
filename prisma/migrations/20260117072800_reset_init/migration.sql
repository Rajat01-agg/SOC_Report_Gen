-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "title" TEXT,
    "inputFindings" JSONB NOT NULL,
    "summary" JSONB NOT NULL,
    "pdfUrl" TEXT,
    "pdfPath" TEXT,
    "cloudinaryFileId" TEXT,
    "fileSize" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PROCESSING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Report_executionId_key" ON "Report"("executionId");
