-- AlterTable
ALTER TABLE "CartItem" ADD COLUMN     "isBoxItem" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "boxDiscount" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "isBoxItem" BOOLEAN NOT NULL DEFAULT false;
