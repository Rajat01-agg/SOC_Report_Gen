/*
  Warnings:

  - You are about to drop the column `findingsByType` on the `Report` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Report_createdAt_idx";

-- DropIndex
DROP INDEX "Report_executionId_idx";

-- DropIndex
DROP INDEX "Report_generatedAt_idx";

-- DropIndex
DROP INDEX "Report_status_idx";

-- AlterTable
ALTER TABLE "Report" DROP COLUMN "findingsByType";
