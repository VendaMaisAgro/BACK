-- CreateTable
CREATE TABLE "SaleContract" (
    "id" TEXT NOT NULL,
    "sale_id" TEXT NOT NULL,
    "accepted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "buyer" JSONB NOT NULL,
    "seller" JSONB NOT NULL,
    "items" JSONB NOT NULL,
    "conditions" JSONB NOT NULL,

    CONSTRAINT "SaleContract_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SaleContract_sale_id_key" ON "SaleContract"("sale_id");

-- AddForeignKey
ALTER TABLE "SaleContract" ADD CONSTRAINT "SaleContract_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "SaleData"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
