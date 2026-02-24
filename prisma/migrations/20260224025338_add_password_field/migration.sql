-- CreateEnum
CREATE TYPE "RulePriority" AS ENUM ('CRITICAL', 'IMPORTANT', 'PREFERENCE');

-- CreateEnum
CREATE TYPE "RuleSource" AS ENUM ('MANUAL', 'AUTO_LEARNED', 'CORRECTION');

-- CreateEnum
CREATE TYPE "CorrectionType" AS ENUM ('PRICE_CHANGE', 'ITEM_ADDED', 'ITEM_REMOVED', 'QUANTITY_CHANGE', 'CATEGORY_CHANGE', 'DESCRIPTION_CHANGE', 'MARKUP_CHANGE', 'ASSUMPTION_CHANGE');

-- CreateEnum
CREATE TYPE "TriggerType" AS ENUM ('KEYWORD', 'CATEGORY', 'PROJECT_TYPE', 'ALWAYS');

-- AlterTable
ALTER TABLE "Estimate" ADD COLUMN     "proposalData" JSONB;

-- AlterTable
ALTER TABLE "PricingProfile" ADD COLUMN     "totalInvoicesProcessed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalMaterialsTracked" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "UploadedDocument" ADD COLUMN     "documentType" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "brandColors" JSONB,
ADD COLUMN     "onboardingComplete" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "password" TEXT,
ADD COLUMN     "primaryTrade" TEXT,
ADD COLUMN     "tagline" TEXT,
ADD COLUMN     "trades" TEXT[];

-- CreateTable
CREATE TABLE "SupplierInvoice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "supplierName" TEXT,
    "invoiceDate" TIMESTAMP(3),
    "invoiceNumber" TEXT,
    "subtotal" DOUBLE PRECISION,
    "taxAmount" DOUBLE PRECISION,
    "totalAmount" DOUBLE PRECISION,
    "parseStatus" "ParseStatus" NOT NULL DEFAULT 'PENDING',
    "parseErrors" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "SupplierInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierItem" (
    "id" TEXT NOT NULL,
    "supplierInvoiceId" TEXT NOT NULL,
    "itemDescription" TEXT NOT NULL,
    "category" TEXT,
    "sku" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unit" TEXT NOT NULL DEFAULT 'ea',
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "normalizedName" TEXT,
    "normalizedUnit" TEXT,
    "normalizedUnitPrice" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialPriceLibrary" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "materialName" TEXT NOT NULL,
    "category" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'ea',
    "avgUnitPrice" DOUBLE PRECISION NOT NULL,
    "lastUnitPrice" DOUBLE PRECISION NOT NULL,
    "minUnitPrice" DOUBLE PRECISION NOT NULL,
    "maxUnitPrice" DOUBLE PRECISION NOT NULL,
    "priceCount" INTEGER NOT NULL DEFAULT 1,
    "priceHistory" JSONB NOT NULL DEFAULT '[]',
    "bestSupplier" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialPriceLibrary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandTemplate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Default',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "templateConfig" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingRule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priority" "RulePriority" NOT NULL DEFAULT 'IMPORTANT',
    "source" "RuleSource" NOT NULL DEFAULT 'MANUAL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "timesApplied" INTEGER NOT NULL DEFAULT 0,
    "correctionLogId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorrectionLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "estimateId" TEXT NOT NULL,
    "correctionType" "CorrectionType" NOT NULL,
    "fieldPath" TEXT NOT NULL,
    "previousValue" TEXT NOT NULL,
    "newValue" TEXT NOT NULL,
    "context" TEXT,
    "extractedRule" TEXT,
    "similarCount" INTEGER NOT NULL DEFAULT 1,
    "promotedToRule" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CorrectionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContextRule" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "triggerType" "TriggerType" NOT NULL,
    "triggerValue" TEXT NOT NULL,
    "mustInclude" TEXT[],
    "mustExclude" TEXT[],
    "mustAssume" TEXT[],
    "neverAssume" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContextRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupplierInvoice_userId_idx" ON "SupplierInvoice"("userId");

-- CreateIndex
CREATE INDEX "SupplierItem_supplierInvoiceId_idx" ON "SupplierItem"("supplierInvoiceId");

-- CreateIndex
CREATE INDEX "MaterialPriceLibrary_userId_idx" ON "MaterialPriceLibrary"("userId");

-- CreateIndex
CREATE INDEX "MaterialPriceLibrary_userId_priceCount_idx" ON "MaterialPriceLibrary"("userId", "priceCount" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "MaterialPriceLibrary_userId_materialName_key" ON "MaterialPriceLibrary"("userId", "materialName");

-- CreateIndex
CREATE INDEX "BrandTemplate_userId_idx" ON "BrandTemplate"("userId");

-- CreateIndex
CREATE INDEX "TrainingRule_userId_idx" ON "TrainingRule"("userId");

-- CreateIndex
CREATE INDEX "TrainingRule_userId_isActive_idx" ON "TrainingRule"("userId", "isActive");

-- CreateIndex
CREATE INDEX "CorrectionLog_userId_idx" ON "CorrectionLog"("userId");

-- CreateIndex
CREATE INDEX "CorrectionLog_estimateId_idx" ON "CorrectionLog"("estimateId");

-- CreateIndex
CREATE INDEX "CorrectionLog_userId_extractedRule_idx" ON "CorrectionLog"("userId", "extractedRule");

-- CreateIndex
CREATE INDEX "CorrectionLog_userId_createdAt_idx" ON "CorrectionLog"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ContextRule_userId_idx" ON "ContextRule"("userId");

-- CreateIndex
CREATE INDEX "ContextRule_triggerType_isActive_idx" ON "ContextRule"("triggerType", "isActive");

-- CreateIndex
CREATE INDEX "EditHistory_estimateId_createdAt_idx" ON "EditHistory"("estimateId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Estimate_userId_updatedAt_idx" ON "Estimate"("userId", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "Estimate_userId_status_idx" ON "Estimate"("userId", "status");

-- CreateIndex
CREATE INDEX "Estimate_userId_createdAt_idx" ON "Estimate"("userId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "SupplierInvoice" ADD CONSTRAINT "SupplierInvoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierItem" ADD CONSTRAINT "SupplierItem_supplierInvoiceId_fkey" FOREIGN KEY ("supplierInvoiceId") REFERENCES "SupplierInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialPriceLibrary" ADD CONSTRAINT "MaterialPriceLibrary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandTemplate" ADD CONSTRAINT "BrandTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingRule" ADD CONSTRAINT "TrainingRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectionLog" ADD CONSTRAINT "CorrectionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectionLog" ADD CONSTRAINT "CorrectionLog_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "Estimate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContextRule" ADD CONSTRAINT "ContextRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
