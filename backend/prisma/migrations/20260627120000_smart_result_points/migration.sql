-- Admin-managed Smart Result points (conditional PDF advisory bullets)
CREATE TABLE "SmartResultPoint" (
    "id" TEXT NOT NULL,
    "modelSlug" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#16a34a',
    "conditions" TEXT NOT NULL,
    "combineMode" TEXT NOT NULL DEFAULT 'all',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmartResultPoint_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SmartResultPoint_modelSlug_sortOrder_idx" ON "SmartResultPoint"("modelSlug", "sortOrder");
