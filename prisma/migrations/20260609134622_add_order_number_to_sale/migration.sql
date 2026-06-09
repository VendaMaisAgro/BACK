/*
  Warnings:

  - A unique constraint covering the columns `[order_number]` on the table `SaleData` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "SaleData" ADD COLUMN     "order_number" SERIAL NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "SaleData_order_number_key" ON "SaleData"("order_number");
