-- ModelFieldHint: admin-editable field (i) tooltips
CREATE TABLE "ModelFieldHint" (
    "id" TEXT NOT NULL,
    "modelSlug" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "what" TEXT NOT NULL,
    "why" TEXT NOT NULL,
    "how" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModelFieldHint_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ModelFieldHint_modelSlug_fieldKey_key" ON "ModelFieldHint"("modelSlug", "fieldKey");
CREATE INDEX "ModelFieldHint_modelSlug_idx" ON "ModelFieldHint"("modelSlug");
