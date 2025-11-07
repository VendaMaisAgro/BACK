/*
  Warnings:

  - The primary key for the `Address` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `BoughtProduct` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Cart` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `CartItem` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Contract` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `ContractAcceptance` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `PaymentMethod` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Product` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Question` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `SaleData` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `SecurityQuestions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `SellerStats` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `SellingUnit` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `SellingUnitProduct` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `TransportTypes` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "Address" DROP CONSTRAINT "Address_userId_fkey";

-- DropForeignKey
ALTER TABLE "BoughtProduct" DROP CONSTRAINT "BoughtProduct_productId_fkey";

-- DropForeignKey
ALTER TABLE "BoughtProduct" DROP CONSTRAINT "BoughtProduct_saleDataId_fkey";

-- DropForeignKey
ALTER TABLE "BoughtProduct" DROP CONSTRAINT "BoughtProduct_sellingUnitProductId_fkey";

-- DropForeignKey
ALTER TABLE "Cart" DROP CONSTRAINT "Cart_userId_fkey";

-- DropForeignKey
ALTER TABLE "CartItem" DROP CONSTRAINT "CartItem_cartId_fkey";

-- DropForeignKey
ALTER TABLE "CartItem" DROP CONSTRAINT "CartItem_productId_fkey";

-- DropForeignKey
ALTER TABLE "CartItem" DROP CONSTRAINT "CartItem_sellingUnitProductId_fkey";

-- DropForeignKey
ALTER TABLE "ContractAcceptance" DROP CONSTRAINT "ContractAcceptance_contract_id_fkey";

-- DropForeignKey
ALTER TABLE "ContractAcceptance" DROP CONSTRAINT "ContractAcceptance_sale_id_fkey";

-- DropForeignKey
ALTER TABLE "ContractAcceptance" DROP CONSTRAINT "ContractAcceptance_user_id_fkey";

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_sellerId_fkey";

-- DropForeignKey
ALTER TABLE "Question" DROP CONSTRAINT "Question_productId_fkey";

-- DropForeignKey
ALTER TABLE "Question" DROP CONSTRAINT "Question_questionerId_fkey";

-- DropForeignKey
ALTER TABLE "SaleData" DROP CONSTRAINT "SaleData_addressId_fkey";

-- DropForeignKey
ALTER TABLE "SaleData" DROP CONSTRAINT "SaleData_buyerId_fkey";

-- DropForeignKey
ALTER TABLE "SaleData" DROP CONSTRAINT "SaleData_paymentMethodId_fkey";

-- DropForeignKey
ALTER TABLE "SaleData" DROP CONSTRAINT "SaleData_transportTypeId_fkey";

-- DropForeignKey
ALTER TABLE "SecurityQuestions" DROP CONSTRAINT "SecurityQuestions_userId_fkey";

-- DropForeignKey
ALTER TABLE "SellerStats" DROP CONSTRAINT "SellerStats_sellerId_fkey";

-- DropForeignKey
ALTER TABLE "SellingUnitProduct" DROP CONSTRAINT "SellingUnitProduct_productId_fkey";

-- DropForeignKey
ALTER TABLE "SellingUnitProduct" DROP CONSTRAINT "SellingUnitProduct_unitId_fkey";

-- AlterTable
ALTER TABLE "Address" DROP CONSTRAINT "Address_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "userId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Address_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Address_id_seq";

-- AlterTable
ALTER TABLE "BoughtProduct" DROP CONSTRAINT "BoughtProduct_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "productId" SET DATA TYPE TEXT,
ALTER COLUMN "sellingUnitProductId" SET DATA TYPE TEXT,
ALTER COLUMN "saleDataId" SET DATA TYPE TEXT,
ADD CONSTRAINT "BoughtProduct_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "BoughtProduct_id_seq";

-- AlterTable
ALTER TABLE "Cart" DROP CONSTRAINT "Cart_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "userId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Cart_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Cart_id_seq";

-- AlterTable
ALTER TABLE "CartItem" DROP CONSTRAINT "CartItem_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "cartId" SET DATA TYPE TEXT,
ALTER COLUMN "productId" SET DATA TYPE TEXT,
ALTER COLUMN "sellingUnitProductId" SET DATA TYPE TEXT,
ADD CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "CartItem_id_seq";

-- AlterTable
ALTER TABLE "Contract" DROP CONSTRAINT "Contract_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "Contract_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Contract_id_seq";

-- AlterTable
ALTER TABLE "ContractAcceptance" DROP CONSTRAINT "ContractAcceptance_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "user_id" SET DATA TYPE TEXT,
ALTER COLUMN "contract_id" SET DATA TYPE TEXT,
ALTER COLUMN "sale_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "ContractAcceptance_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "ContractAcceptance_id_seq";

-- AlterTable
ALTER TABLE "PaymentMethod" DROP CONSTRAINT "PaymentMethod_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "PaymentMethod_id_seq";

-- AlterTable
ALTER TABLE "Product" DROP CONSTRAINT "Product_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "sellerId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Product_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Product_id_seq";

-- AlterTable
ALTER TABLE "Question" DROP CONSTRAINT "Question_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "productId" SET DATA TYPE TEXT,
ALTER COLUMN "questionerId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Question_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Question_id_seq";

-- AlterTable
ALTER TABLE "SaleData" DROP CONSTRAINT "SaleData_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "transportTypeId" SET DATA TYPE TEXT,
ALTER COLUMN "addressId" SET DATA TYPE TEXT,
ALTER COLUMN "paymentMethodId" SET DATA TYPE TEXT,
ALTER COLUMN "buyerId" SET DATA TYPE TEXT,
ADD CONSTRAINT "SaleData_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "SaleData_id_seq";

-- AlterTable
ALTER TABLE "SecurityQuestions" DROP CONSTRAINT "SecurityQuestions_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "userId" SET DATA TYPE TEXT,
ADD CONSTRAINT "SecurityQuestions_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "SecurityQuestions_id_seq";

-- AlterTable
ALTER TABLE "SellerStats" DROP CONSTRAINT "SellerStats_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "sellerId" SET DATA TYPE TEXT,
ADD CONSTRAINT "SellerStats_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "SellerStats_id_seq";

-- AlterTable
ALTER TABLE "SellingUnit" DROP CONSTRAINT "SellingUnit_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "SellingUnit_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "SellingUnit_id_seq";

-- AlterTable
ALTER TABLE "SellingUnitProduct" DROP CONSTRAINT "SellingUnitProduct_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "unitId" SET DATA TYPE TEXT,
ALTER COLUMN "productId" SET DATA TYPE TEXT,
ADD CONSTRAINT "SellingUnitProduct_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "SellingUnitProduct_id_seq";

-- AlterTable
ALTER TABLE "TransportTypes" DROP CONSTRAINT "TransportTypes_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "TransportTypes_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "TransportTypes_id_seq";

-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "User_id_seq";

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityQuestions" ADD CONSTRAINT "SecurityQuestions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerStats" ADD CONSTRAINT "SellerStats_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleData" ADD CONSTRAINT "SaleData_transportTypeId_fkey" FOREIGN KEY ("transportTypeId") REFERENCES "TransportTypes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleData" ADD CONSTRAINT "SaleData_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleData" ADD CONSTRAINT "SaleData_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleData" ADD CONSTRAINT "SaleData_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoughtProduct" ADD CONSTRAINT "BoughtProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoughtProduct" ADD CONSTRAINT "BoughtProduct_sellingUnitProductId_fkey" FOREIGN KEY ("sellingUnitProductId") REFERENCES "SellingUnitProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoughtProduct" ADD CONSTRAINT "BoughtProduct_saleDataId_fkey" FOREIGN KEY ("saleDataId") REFERENCES "SaleData"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellingUnitProduct" ADD CONSTRAINT "SellingUnitProduct_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "SellingUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellingUnitProduct" ADD CONSTRAINT "SellingUnitProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_questionerId_fkey" FOREIGN KEY ("questionerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_sellingUnitProductId_fkey" FOREIGN KEY ("sellingUnitProductId") REFERENCES "SellingUnitProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractAcceptance" ADD CONSTRAINT "ContractAcceptance_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractAcceptance" ADD CONSTRAINT "ContractAcceptance_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractAcceptance" ADD CONSTRAINT "ContractAcceptance_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "SaleData"("id") ON DELETE SET NULL ON UPDATE CASCADE;
