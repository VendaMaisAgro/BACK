-- CreateTable
CREATE TABLE "PriceRecommendation" (
    "id" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "marketPrice" DECIMAL(10,2) NOT NULL,
    "suggestedPrice" DECIMAL(10,2) NOT NULL,
    "date" DATE NOT NULL,
    "algorithmVersion" TEXT NOT NULL DEFAULT 'static-v1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PriceRecommendation_productName_date_idx" ON "PriceRecommendation"("productName", "date");
