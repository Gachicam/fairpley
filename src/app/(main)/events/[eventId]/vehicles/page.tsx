import Link from "next/link";
import { notFound } from "next/navigation";
import { getEventById, getEventVehicles } from "@/data/event";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { VehicleList } from "@/components/vehicle/vehicle-list";
import { VehicleForm } from "@/components/vehicle/vehicle-form";

interface PageProps {
  params: Promise<{ eventId: string }>;
}

export default async function VehiclesPage({ params }: PageProps): Promise<React.ReactElement> {
  const { eventId } = await params;
  const event = await getEventById(eventId);

  if (!event) {
    notFound();
  }

  const vehicles = await getEventVehicles(eventId);
  const members = event.members.map((m) => ({
    id: m.id,
    nickname: m.nickname,
    user: { name: m.user.name },
  }));

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

      <div className="mb-8">
        <h1 className="text-2xl font-bold">車両管理</h1>
        <p className="text-muted-foreground">イベントで使用する車両を管理します</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* 車両追加フォーム */}
        <Card>
          <CardHeader>
            <CardTitle>車両を追加</CardTitle>
            <CardDescription>新しい車両を登録します</CardDescription>
          </CardHeader>
          <CardContent>
            <VehicleForm eventId={eventId} members={members} />
          </CardContent>
        </Card>

        {/* 車両一覧 */}
        <Card>
          <CardHeader>
            <CardTitle>登録済み車両</CardTitle>
            <CardDescription>{vehicles.length}台の車両が登録されています</CardDescription>
          </CardHeader>
          <CardContent>
            <VehicleList vehicles={vehicles} eventId={eventId} members={members} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
