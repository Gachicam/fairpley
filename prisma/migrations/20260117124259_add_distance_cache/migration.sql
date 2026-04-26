-- CreateTable
CREATE TABLE "DistanceCache" (
    "id" TEXT NOT NULL,
    "fromLat" DOUBLE PRECISION NOT NULL,
    "fromLng" DOUBLE PRECISION NOT NULL,
    "toLat" DOUBLE PRECISION NOT NULL,
    "toLng" DOUBLE PRECISION NOT NULL,
    "distanceKm" DOUBLE PRECISION NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DistanceCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DistanceCache_fromLat_fromLng_idx" ON "DistanceCache"("fromLat", "fromLng");

-- CreateIndex
CREATE INDEX "DistanceCache_toLat_toLng_idx" ON "DistanceCache"("toLat", "toLng");

-- CreateIndex
CREATE UNIQUE INDEX "DistanceCache_fromLat_fromLng_toLat_toLng_key" ON "DistanceCache"("fromLat", "fromLng", "toLat", "toLng");
