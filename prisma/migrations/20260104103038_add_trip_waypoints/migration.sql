-- CreateTable
CREATE TABLE "TripWaypoint" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "TripWaypoint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TripWaypoint_tripId_idx" ON "TripWaypoint"("tripId");

-- CreateIndex
CREATE INDEX "TripWaypoint_locationId_idx" ON "TripWaypoint"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "TripWaypoint_tripId_order_key" ON "TripWaypoint"("tripId", "order");

-- AddForeignKey
ALTER TABLE "TripWaypoint" ADD CONSTRAINT "TripWaypoint_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripWaypoint" ADD CONSTRAINT "TripWaypoint_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
