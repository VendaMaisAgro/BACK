-- AlterTable
ALTER TABLE "PriceRecommendation" ADD COLUMN     "pricePerKg" DECIMAL(10,2),
ADD COLUMN     "productUnitKg" DECIMAL(10,2),
ADD COLUMN     "productUnitKind" TEXT;

-- CreateIndex
CREATE INDEX "PriceRecommendation_productUnitKind_idx" ON "PriceRecommendation"("productUnitKind");
