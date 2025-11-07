-- CreateTable
CREATE TABLE "Product" (
    "id" SERIAL NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "pricePerUnit" DOUBLE PRECISION NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL,
    "reviewCount" DOUBLE PRECISION NOT NULL,
    "unit" VARCHAR(50) NOT NULL,
    "href" VARCHAR(255) NOT NULL,
    "imagesSrc" TEXT[],
    "description" TEXT NOT NULL,
    "ratingStatsId" INTEGER,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RatingStats" (
    "id" SERIAL NOT NULL,
    "average" DOUBLE PRECISION NOT NULL,
    "total" INTEGER NOT NULL,
    "recommendPercentage" INTEGER NOT NULL,

    CONSTRAINT "RatingStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RatingDistribution" (
    "id" SERIAL NOT NULL,
    "rating" INTEGER NOT NULL,
    "count" INTEGER NOT NULL,
    "ratingStatsId" INTEGER NOT NULL,

    CONSTRAINT "RatingDistribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" SERIAL NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "productId" INTEGER NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_ratingStatsId_key" ON "Product"("ratingStatsId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_ratingStatsId_fkey" FOREIGN KEY ("ratingStatsId") REFERENCES "RatingStats"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RatingDistribution" ADD CONSTRAINT "RatingDistribution_ratingStatsId_fkey" FOREIGN KEY ("ratingStatsId") REFERENCES "RatingStats"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
