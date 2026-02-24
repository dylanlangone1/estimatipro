-- AlterTable
ALTER TABLE "User" ADD COLUMN     "customFinishLevels" JSONB;

-- CreateTable
CREATE TABLE "MaterialBrand" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "productLine" TEXT,
    "notes" TEXT,
    "timesUsed" INTEGER NOT NULL DEFAULT 1,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialBrand_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MaterialBrand_userId_idx" ON "MaterialBrand"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialBrand_userId_brandName_category_key" ON "MaterialBrand"("userId", "brandName", "category");

-- AddForeignKey
ALTER TABLE "MaterialBrand" ADD CONSTRAINT "MaterialBrand_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
