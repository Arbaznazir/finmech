-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "purchasedModels" TEXT NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "modelSlug" TEXT;
ALTER TABLE "Payment" ALTER COLUMN "billingCycle" SET DEFAULT 'monthly';

-- CreateTable
CREATE TABLE IF NOT EXISTS "PlanPrice" (
    "id" TEXT NOT NULL,
    "planKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceMonthly" INTEGER,
    "priceYearly" INTEGER,
    "priceOneTime" INTEGER,
    "discountPercent" INTEGER NOT NULL DEFAULT 0,
    "discountLabel" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ModelPrice" (
    "id" TEXT NOT NULL,
    "modelSlug" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "priceOneTime" INTEGER NOT NULL,
    "discountPercent" INTEGER NOT NULL DEFAULT 0,
    "discountLabel" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModelPrice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PlanPrice_planKey_key" ON "PlanPrice"("planKey");
CREATE UNIQUE INDEX IF NOT EXISTS "ModelPrice_modelSlug_key" ON "ModelPrice"("modelSlug");
