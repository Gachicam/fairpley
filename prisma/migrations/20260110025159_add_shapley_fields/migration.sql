-- AlterEnum
ALTER TYPE "VehicleType" ADD VALUE 'BIKE';

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "destinationId" TEXT;

-- AlterTable
ALTER TABLE "EventMember" ADD COLUMN     "departureLocationId" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "isTransport" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "homeLocationId" TEXT;

-- CreateIndex
CREATE INDEX "Event_destinationId_idx" ON "Event"("destinationId");

-- CreateIndex
CREATE INDEX "EventMember_departureLocationId_idx" ON "EventMember"("departureLocationId");

-- CreateIndex
CREATE INDEX "User_homeLocationId_idx" ON "User"("homeLocationId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_homeLocationId_fkey" FOREIGN KEY ("homeLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventMember" ADD CONSTRAINT "EventMember_departureLocationId_fkey" FOREIGN KEY ("departureLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
