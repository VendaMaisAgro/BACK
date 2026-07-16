/*
  Warnings:

  - A unique constraint covering the columns `[unit]` on the table `SellingUnit` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "SellingUnit_unit_key" ON "SellingUnit"("unit");
