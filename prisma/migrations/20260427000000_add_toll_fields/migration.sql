-- CreateEnum
CREATE TYPE "VehicleClass" AS ENUM ('LIGHT', 'STANDARD', 'MEDIUM', 'LARGE', 'EXTRA');

-- AlterTable: Event に往路・復路日付と時刻カラムを追加
ALTER TABLE "Event"
  ADD COLUMN "outboundDate"  TIMESTAMP(3),
  ADD COLUMN "returnDate"    TIMESTAMP(3),
  ADD COLUMN "checkinTime"   INTEGER,
  ADD COLUMN "checkoutTime"  INTEGER;

-- AlterTable: Vehicle に vehicleClass と hasEtc を追加
ALTER TABLE "Vehicle"
  ADD COLUMN "vehicleClass" "VehicleClass" NOT NULL DEFAULT 'STANDARD',
  ADD COLUMN "hasEtc"       BOOLEAN        NOT NULL DEFAULT true;

-- AlterTable: EventMember に loadingMinutes を追加
ALTER TABLE "EventMember"
  ADD COLUMN "loadingMinutes" INTEGER NOT NULL DEFAULT 15;
