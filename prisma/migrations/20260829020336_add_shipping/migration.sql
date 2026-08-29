-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "selectedCarrier" TEXT,
ADD COLUMN     "selectedService" TEXT;

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "shipFromAddress1" TEXT,
ADD COLUMN     "shipFromAddress2" TEXT,
ADD COLUMN     "shipFromCity" TEXT,
ADD COLUMN     "shipFromCompany" TEXT,
ADD COLUMN     "shipFromCountry" TEXT,
ADD COLUMN     "shipFromName" TEXT,
ADD COLUMN     "shipFromPhone" TEXT,
ADD COLUMN     "shipFromPostalCode" TEXT,
ADD COLUMN     "shipFromState" TEXT;
