import Link from "next/link";
import { notFound } from "next/navigation";
import { getEventById, getTripById } from "@/data/event";
import { getLocations } from "@/actions/location";
import { getVehicles } from "@/actions/vehicle";
import { TripForm } from "@/components/trip/trip-form";

interface PageProps {
  params: Promise<{ eventId: string; tripId: string }>;
}

export default async function EditTripPage({ params }: PageProps): Promise<React.ReactElement> {
  const { eventId, tripId } = await params;
  const [event, trip, vehicles, locations] = await Promise.all([
    getEventById(eventId),
    getTripById(tripId),
    getVehicles(),
    getLocations(),
  ]);

  if (!event || !trip) {
    notFound();
  }

  const members = event.members.map((m) => ({
    id: m.id,
    nickname: m.nickname,
    user: { name: m.user.name, email: m.user.email },
  }));

  const tripForForm = {
    id: trip.id,
    vehicleId: trip.vehicleId,
    fromId: trip.fromId,
    toId: trip.toId,
    distance: trip.distance,
    passengers: trip.passengers.map((p) => ({ memberId: p.memberId })),
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <Link
          href={`/events/${eventId}/trips`}
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          ← 移動記録一覧に戻る
        </Link>
      </div>

      <TripForm
        eventId={eventId}
        members={members}
        vehicles={vehicles}
        locations={locations}
        trip={tripForForm}
      />
    </div>
  );
}
