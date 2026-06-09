-- AlterEnum
ALTER TYPE "ContractKind" ADD VALUE 'sale_intermediation';

-- AlterTable
ALTER TABLE "SaleData" ADD COLUMN     "certifier_required" BOOLEAN,
ADD COLUMN     "down_payment_percent" INTEGER,
ADD COLUMN     "packaging_type" TEXT,
ADD COLUMN     "payment_term_days" INTEGER,
ADD COLUMN     "payment_type" TEXT,
ADD COLUMN     "planned_delivery_date" TIMESTAMP(3),
ADD COLUMN     "planned_harvest_date" TIMESTAMP(3),
ADD COLUMN     "planned_pickup_date" TIMESTAMP(3),
ADD COLUMN     "seller_profile" TEXT,
ADD COLUMN     "technical_spec" TEXT;

-- CreateTable
CREATE TABLE "ConformityCertifier" (
    "id" TEXT NOT NULL,
    "sale_id" TEXT NOT NULL,
    "agent_name" TEXT,
    "agent_company" TEXT,
    "agent_contact" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "report_url" TEXT,
    "reported_at" TIMESTAMP(3),
    "cost_value" DECIMAL(10,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConformityCertifier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationDocument" (
    "id" TEXT NOT NULL,
    "sale_id" TEXT NOT NULL,
    "uploaded_by_id" TEXT NOT NULL,
    "doc_type" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConformityCertifier_sale_id_key" ON "ConformityCertifier"("sale_id");

-- AddForeignKey
ALTER TABLE "ConformityCertifier" ADD CONSTRAINT "ConformityCertifier_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "SaleData"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationDocument" ADD CONSTRAINT "OperationDocument_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "SaleData"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationDocument" ADD CONSTRAINT "OperationDocument_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
