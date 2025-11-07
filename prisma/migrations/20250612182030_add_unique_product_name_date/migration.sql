/*
  Warnings:

  - A unique constraint covering the columns `[productName,date]` on the table `PriceRecommendation` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "PriceRecommendation_productName_date_key" ON "PriceRecommendation"("productName", "date");
