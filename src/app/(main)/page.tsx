import Link from "next/link";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getMyEvents } from "@/data/event";
import { Car, MapPin } from "lucide-react";

export default async function DashboardPage(): Promise<React.ReactElement> {
  const session = await auth();
  const rawEvents = await getMyEvents();

  const events = rawEvents.map((event) => ({
    id: event.id,
    name: event.name,
    startDate: event.startDate,
    endDate: event.endDate,
    memberCount: event.members.length,
    paymentCount: event._count.payments,
  }));

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">マイイベント</h1>
        <Button asChild>
          <Link href="/events/new">+ 新規イベント作成</Link>
        </Button>
      </div>

      {events.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <Link key={event.id} href={`/events/${event.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardHeader>
                  <CardTitle>{event.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    {event.startDate.toLocaleDateString("ja-JP")} -{" "}
                    {event.endDate.toLocaleDateString("ja-JP")}
                  </p>
                  <p className="mt-2 text-sm">
                    参加者: {event.memberCount}人 | 支払い: {event.paymentCount}件
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="mx-auto max-w-md text-center">
          <CardContent className="py-12">
            <p className="text-muted-foreground mb-4">イベントがありません</p>
            <Button asChild>
              <Link href="/events/new">新規イベントを作成する</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* マスターデータ管理 */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>マスターデータ管理</CardTitle>
          <CardDescription>全イベント共通で使用するデータを管理します</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Link
            href="/locations"
            className="hover:bg-muted flex items-center gap-3 rounded-lg border p-4 transition-colors"
          >
            <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full">
              <MapPin className="text-primary h-5 w-5" />
            </div>
            <div>
              <p className="font-medium">場所管理</p>
              <p className="text-muted-foreground text-sm">キャンプ場、集合場所などを登録・編集</p>
            </div>
          </Link>
          <Link
            href="/vehicles"
            className="hover:bg-muted flex items-center gap-3 rounded-lg border p-4 transition-colors"
          >
            <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full">
              <Car className="text-primary h-5 w-5" />
            </div>
            <div>
              <p className="font-medium">車両管理</p>
              <p className="text-muted-foreground text-sm">自家用車、レンタカーなどを登録・編集</p>
            </div>
          </Link>
        </CardContent>
      </Card>

      {/* デバッグ情報 */}
      {process.env.NODE_ENV === "development" && session && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-sm">デバッグ情報</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs">{JSON.stringify(session, null, 2)}</pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
