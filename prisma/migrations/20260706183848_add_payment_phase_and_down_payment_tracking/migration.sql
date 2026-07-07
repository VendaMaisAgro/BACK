-- AlterTable
ALTER TABLE "SaleData" ADD COLUMN     "adjusted_contract_total" DOUBLE PRECISION,
ADD COLUMN     "penalty_amount" DECIMAL(10,2),
ADD COLUMN     "penalty_applied" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "penalty_reason" TEXT;
