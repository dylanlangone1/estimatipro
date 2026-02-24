-- AlterTable
ALTER TABLE "Estimate" ADD COLUMN     "isContract" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "defaultTerms" JSONB;
