/*
  Warnings:

  - You are about to drop the column `district` on the `Address` table. All the data in the column will be lost.
  - You are about to drop the column `state` on the `Address` table. All the data in the column will be lost.
  - You are about to drop the column `href` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `imagesSrc` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `pricePerUnit` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `rating` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `ratingStatsId` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `reviewCount` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `unit` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `addressId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `Buyer` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Producer` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RatingDistribution` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RatingStats` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[cnpj]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[cpf]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[ccir]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `addressee` to the `Address` table without a default value. This is not possible if the table is not empty.
  - Added the required column `alias` to the `Address` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cep` to the `Address` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phone_number_addressee` to the `Address` table without a default value. This is not possible if the table is not empty.
  - Added the required column `uf` to the `Address` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Address` table without a default value. This is not possible if the table is not empty.
  - Added the required column `amountSold` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `category` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdAt` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `harvestAt` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `isNegotiable` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `productRating` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ratingAmount` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sellerId` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stock` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `variety` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `questionerId` to the `Question` table without a default value. This is not possible if the table is not empty.
  - Made the column `answer` on table `Question` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `phone_number` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `role` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AcceptanceRole" AS ENUM ('BUYER', 'SELLER');

-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('CART', 'AWAITING_SELLER_CONFIRMATION', 'CONFIRMED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ContractKind" AS ENUM ('sale_tos', 'terms_of_use', 'privacy_policy');

-- DropForeignKey
ALTER TABLE "Buyer" DROP CONSTRAINT "Buyer_userId_fkey";

-- DropForeignKey
ALTER TABLE "Producer" DROP CONSTRAINT "Producer_userId_fkey";

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_ratingStatsId_fkey";

-- DropForeignKey
ALTER TABLE "RatingDistribution" DROP CONSTRAINT "RatingDistribution_ratingStatsId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "fk_address";

-- DropIndex
DROP INDEX "Product_ratingStatsId_key";

-- AlterTable
ALTER TABLE "Address" DROP COLUMN "district",
DROP COLUMN "state",
ADD COLUMN     "addressee" TEXT NOT NULL,
ADD COLUMN     "alias" TEXT NOT NULL,
ADD COLUMN     "cep" TEXT NOT NULL,
ADD COLUMN     "complement" TEXT,
ADD COLUMN     "default" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "phone_number_addressee" TEXT NOT NULL,
ADD COLUMN     "referencePoint" TEXT,
ADD COLUMN     "uf" TEXT NOT NULL,
ADD COLUMN     "userId" INTEGER NOT NULL,
ALTER COLUMN "city" SET DATA TYPE TEXT,
ALTER COLUMN "street" SET DATA TYPE TEXT,
ALTER COLUMN "number" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "PriceRecommendation" ADD COLUMN     "productUnit" TEXT,
ALTER COLUMN "date" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "href",
DROP COLUMN "imagesSrc",
DROP COLUMN "pricePerUnit",
DROP COLUMN "rating",
DROP COLUMN "ratingStatsId",
DROP COLUMN "reviewCount",
DROP COLUMN "type",
DROP COLUMN "unit",
ADD COLUMN     "amountSold" INTEGER NOT NULL,
ADD COLUMN     "category" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "harvestAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "images_Path" TEXT[],
ADD COLUMN     "isNegotiable" BOOLEAN NOT NULL,
ADD COLUMN     "productRating" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "ratingAmount" INTEGER NOT NULL,
ADD COLUMN     "ratingStarAmount" DOUBLE PRECISION[],
ADD COLUMN     "sellerId" INTEGER NOT NULL,
ADD COLUMN     "status" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "stock" INTEGER NOT NULL,
ADD COLUMN     "variety" TEXT NOT NULL,
ALTER COLUMN "name" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "questionerId" INTEGER NOT NULL,
ALTER COLUMN "answer" SET NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "addressId",
DROP COLUMN "phone",
ADD COLUMN     "ccir" TEXT,
ADD COLUMN     "cnpj" TEXT,
ADD COLUMN     "cpf" TEXT,
ADD COLUMN     "img" TEXT,
ADD COLUMN     "phone_number" VARCHAR(100) NOT NULL,
ADD COLUMN     "role" TEXT NOT NULL,
ADD COLUMN     "valid" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "name" SET DATA TYPE TEXT,
ALTER COLUMN "password" SET DATA TYPE TEXT,
ALTER COLUMN "email" SET DATA TYPE TEXT;

-- DropTable
DROP TABLE "Buyer";

-- DropTable
DROP TABLE "Producer";

-- DropTable
DROP TABLE "RatingDistribution";

-- DropTable
DROP TABLE "RatingStats";

-- CreateTable
CREATE TABLE "SecurityQuestions" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "answer_1" TEXT NOT NULL,
    "answer_2" TEXT NOT NULL,
    "answer_3" TEXT NOT NULL,

    CONSTRAINT "SecurityQuestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerStats" (
    "id" SERIAL NOT NULL,
    "sellerId" INTEGER NOT NULL,
    "sellerRating" DOUBLE PRECISION NOT NULL,
    "salesMade" INTEGER NOT NULL,
    "productsAmount" INTEGER NOT NULL,

    CONSTRAINT "SellerStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMethod" (
    "id" SERIAL NOT NULL,
    "method" TEXT NOT NULL,

    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportTypes" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "valueFreight" DOUBLE PRECISION NOT NULL DEFAULT 0.0,

    CONSTRAINT "TransportTypes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleData" (
    "id" SERIAL NOT NULL,
    "transportTypeId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "shippedAt" TIMESTAMP(3),
    "arrivedAt" TIMESTAMP(3),
    "transportValue" DOUBLE PRECISION NOT NULL,
    "productRating" DOUBLE PRECISION DEFAULT 0.0,
    "sellerRating" DOUBLE PRECISION DEFAULT 0.0,
    "status" TEXT NOT NULL DEFAULT 'Pedido realizado!',
    "addressId" INTEGER,
    "paymentMethodId" INTEGER NOT NULL,
    "buyerId" INTEGER NOT NULL,
    "paymentCompleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SaleData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoughtProduct" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "sellingUnitProductId" INTEGER NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "amount" INTEGER NOT NULL,
    "saleDataId" INTEGER NOT NULL,

    CONSTRAINT "BoughtProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellingUnit" (
    "id" SERIAL NOT NULL,
    "unit" TEXT NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "SellingUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellingUnitProduct" (
    "id" SERIAL NOT NULL,
    "unitId" INTEGER NOT NULL,
    "minPrice" DOUBLE PRECISION NOT NULL,
    "productId" INTEGER NOT NULL,

    CONSTRAINT "SellingUnitProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cart" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartItem" (
    "id" SERIAL NOT NULL,
    "cartId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "sellingUnitProductId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" SERIAL NOT NULL,
    "kind" "ContractKind" NOT NULL DEFAULT 'sale_tos',
    "version" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sha256_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractAcceptance" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "contract_id" INTEGER NOT NULL,
    "sale_id" INTEGER,
    "role" "AcceptanceRole" NOT NULL DEFAULT 'BUYER',
    "accepted" BOOLEAN NOT NULL,
    "accepted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "client_ip" TEXT NOT NULL,
    "user_agent" TEXT NOT NULL,
    "signature_hash" TEXT NOT NULL,

    CONSTRAINT "ContractAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SecurityQuestions_userId_key" ON "SecurityQuestions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SellerStats_sellerId_key" ON "SellerStats"("sellerId");

-- CreateIndex
CREATE INDEX "Contract_kind_created_at_idx" ON "Contract"("kind", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_kind_version_key" ON "Contract"("kind", "version");

-- CreateIndex
CREATE INDEX "ContractAcceptance_sale_id_role_idx" ON "ContractAcceptance"("sale_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "ContractAcceptance_user_id_contract_id_sale_id_role_key" ON "ContractAcceptance"("user_id", "contract_id", "sale_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "User_cnpj_key" ON "User"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "User_cpf_key" ON "User"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "User_ccir_key" ON "User"("ccir");

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
