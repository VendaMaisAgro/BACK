-- DropForeignKey
ALTER TABLE "SaleContract" DROP CONSTRAINT "SaleContract_sale_id_fkey";

-- AddForeignKey
ALTER TABLE "SaleContract" ADD CONSTRAINT "SaleContract_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "SaleData"("id") ON DELETE CASCADE ON UPDATE CASCADE;
