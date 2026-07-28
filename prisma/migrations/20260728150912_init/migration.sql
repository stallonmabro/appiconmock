-- DropForeignKey
ALTER TABLE "exports" DROP CONSTRAINT "exports_projectId_fkey";

-- AlterTable
ALTER TABLE "exports" ALTER COLUMN "projectId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "exports" ADD CONSTRAINT "exports_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
