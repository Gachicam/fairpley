import Link from "next/link";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage(): Promise<React.ReactElement> {
  const session = await auth();

  // TODO: getMyEvents() を実装したら置き換え
  const events: Array<{
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
    memberCount: number;
    paymentCount: number;
  }> = [];

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
