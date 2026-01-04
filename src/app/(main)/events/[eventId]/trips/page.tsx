import Link from "next/link";
import { notFound } from "next/navigation";
import { getEventById } from "@/data/event";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TripList } from "@/components/trip/trip-list";

interface PageProps {
  params: Promise<{ eventId: string }>;
}

export default async function TripsPage({ params }: PageProps): Promise<React.ReactElement> {
  const { eventId } = await params;
  const event = await getEventById(eventId);

  if (!event) {
    notFound();
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <Link
          href={`/events/${eventId}`}
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          ← {event.name}に戻る
        </Link>
      </div>

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">移動記録</h1>
          <p className="text-muted-foreground">{event.trips.length}件の移動が記録されています</p>
        </div>
        <Button asChild>
          <Link href={`/events/${eventId}/trips/new`}>+ 移動を追加</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>移動記録一覧</CardTitle>
          <CardDescription>車両による移動と乗客を管理します</CardDescription>
        </CardHeader>
        <CardContent>
          <TripList trips={event.trips} eventId={eventId} />
        </CardContent>
      </Card>
    </div>
  );
}
