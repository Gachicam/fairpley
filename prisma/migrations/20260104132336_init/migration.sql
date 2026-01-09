/*
  Warnings:

  - You are about to drop the column `category` on the `Payment` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Payment_category_idx";

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "category";

-- DropEnum
DROP TYPE "PaymentCategory";
