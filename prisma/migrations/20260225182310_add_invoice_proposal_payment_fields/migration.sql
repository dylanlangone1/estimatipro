-- AlterTable
ALTER TABLE "Estimate" ADD COLUMN     "invoiceDueDate" TIMESTAMP(3),
ADD COLUMN     "invoiceNumber" TEXT,
ADD COLUMN     "projectPhotoUrl" TEXT,
ADD COLUMN     "stripePaymentLink" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bankAccountNumber" TEXT,
ADD COLUMN     "bankAccountType" TEXT,
ADD COLUMN     "bankName" TEXT,
ADD COLUMN     "bankRoutingNumber" TEXT,
ADD COLUMN     "invoicePaymentDays" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "proposalLogoWatermark" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stripeConnectAccountId" TEXT,
ADD COLUMN     "stripeConnectOnboarded" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ProposalDefaults" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "aboutUs" TEXT,
    "timelineTemplate" JSONB,
    "warranty" TEXT,
    "exclusions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProposalDefaults_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProposalDefaults_userId_key" ON "ProposalDefaults"("userId");

-- AddForeignKey
ALTER TABLE "ProposalDefaults" ADD CONSTRAINT "ProposalDefaults_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
