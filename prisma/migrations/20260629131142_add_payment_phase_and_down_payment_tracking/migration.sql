-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "phase" TEXT NOT NULL DEFAULT 'full';

-- AlterTable
ALTER TABLE "SaleData" ADD COLUMN     "down_payment_completed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "weight_document_id" TEXT;
