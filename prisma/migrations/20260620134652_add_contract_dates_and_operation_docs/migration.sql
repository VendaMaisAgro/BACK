-- AlterTable
ALTER TABLE "SaleData" ADD COLUMN     "actual_delivery_date" TIMESTAMP(3),
ADD COLUMN     "original_planned_delivery_date" TIMESTAMP(3),
ADD COLUMN     "original_planned_harvest_date" TIMESTAMP(3),
ADD COLUMN     "original_planned_pickup_date" TIMESTAMP(3);
