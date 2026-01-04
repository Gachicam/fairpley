/*
  Warnings:

  - You are about to drop the `Trip` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TripPassenger` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TripWaypoint` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Trip" DROP CONSTRAINT "Trip_eventId_fkey";

-- DropForeignKey
ALTER TABLE "Trip" DROP CONSTRAINT "Trip_fromId_fkey";

-- DropForeignKey
ALTER TABLE "Trip" DROP CONSTRAINT "Trip_toId_fkey";

-- DropForeignKey
ALTER TABLE "Trip" DROP CONSTRAINT "Trip_vehicleId_fkey";

-- DropForeignKey
ALTER TABLE "TripPassenger" DROP CONSTRAINT "TripPassenger_memberId_fkey";

-- DropForeignKey
ALTER TABLE "TripPassenger" DROP CONSTRAINT "TripPassenger_tripId_fkey";

-- DropForeignKey
ALTER TABLE "TripWaypoint" DROP CONSTRAINT "TripWaypoint_locationId_fkey";

-- DropForeignKey
ALTER TABLE "TripWaypoint" DROP CONSTRAINT "TripWaypoint_tripId_fkey";

-- DropTable
DROP TABLE "Trip";

-- DropTable
DROP TABLE "TripPassenger";

-- DropTable
DROP TABLE "TripWaypoint";
