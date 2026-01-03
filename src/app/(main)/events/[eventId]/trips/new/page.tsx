import Link from "next/link";
import { notFound } from "next/navigation";
import { getEventById, getEventVehicles } from "@/data/event";
import { getLocations } from "@/actions/location";
import { TripForm } from "@/components/trip/trip-form";

interface PageProps {
  params: Promise<{ eventId: string }>;
}

export default async function NewTripPage({ params }: PageProps): Promise<React.ReactElement> {
  const { eventId } = await params;
  const [event, vehicles, locations] = await Promise.all([
    getEventById(eventId),
    getEventVehicles(eventId),
    getLocations(),
  ]);

  if (!event) {
    notFound();
  }

  const members = event.members.map((m) => ({
    id: m.id,
    nickname: m.nickname,
    user: {
      name: m.user.name,
      email: m.user.email,
    },
  }));

  const vehicleList = vehicles.map((v) => ({
    id: v.id,
    name: v.name,
  }));

  const locationList = locations.map((l) => ({
    id: l.id,
    name: l.name,
  }));

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <Link
          href={`/events/${eventId}`}
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          ← {event.name}に戻る
        </Link>
      </div>
      <TripForm
        eventId={eventId}
        members={members}
        vehicles={vehicleList}
        locations={locationList}
      />
    </div>
  );
}
