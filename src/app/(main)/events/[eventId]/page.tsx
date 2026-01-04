import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getEventById } from "@/data/event";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EventSettings } from "@/components/event/event-settings";
import { MemberList } from "@/components/event/member-list";
import { AddMemberForm } from "@/components/event/add-member-form";
import { TripListCompact } from "@/components/trip/trip-list-compact";

interface PageProps {
  params: Promise<{ eventId: string }>;
}

export default async function EventPage({ params }: PageProps): Promise<React.ReactElement> {
  const { eventId } = await params;
  const session = await auth();
  const event = await getEventById(eventId);

  if (!event) {
    notFound();
  }

  const isOwner = event.ownerId === session?.user.id;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* ヘッダー */}
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-2">
          <Link href="/" className="text-muted-foreground hover:text-foreground text-sm">
            ← マイイベント
          </Link>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{event.name}</h1>
            <p className="text-muted-foreground">
              {event.startDate.toLocaleDateString("ja-JP")} -{" "}
              {event.endDate.toLocaleDateString("ja-JP")}
            </p>
          </div>
          {isOwner && <EventSettings event={event} />}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* メインコンテンツ */}
        <div className="space-y-6 lg:col-span-2">
          {/* 支払い一覧 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>支払い一覧</CardTitle>
                <CardDescription>
                  {event.payments.length}件の支払いが記録されています
                </CardDescription>
              </div>
              <Button asChild>
                <Link href={`/events/${eventId}/payments/new`}>+ 支払い追加</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {event.payments.length > 0 ? (
                <div className="divide-y">
                  {event.payments.slice(0, 5).map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="font-medium">{payment.description}</p>
                        <p className="text-muted-foreground text-sm">
                          {payment.payer.name} が支払い
                        </p>
                      </div>
                      <p className="font-bold">¥{payment.amount.toLocaleString()}</p>
                    </div>
                  ))}
                  {event.payments.length > 5 && (
                    <div className="pt-3 text-center">
                      <Button variant="link" asChild>
                        <Link href={`/events/${eventId}/payments`}>すべての支払いを表示</Link>
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground py-8 text-center">
                  まだ支払いが記録されていません
                </p>
              )}
            </CardContent>
          </Card>

          {/* 移動記録 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>移動記録</CardTitle>
                <CardDescription>{event.trips.length}件の移動が記録されています</CardDescription>
              </div>
              <Button asChild>
                <Link href={`/events/${eventId}/trips/new`}>+ 移動追加</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <TripListCompact trips={event.trips} eventId={eventId} />
            </CardContent>
          </Card>
        </div>

        {/* サイドバー */}
        <div className="space-y-6">
          {/* 参加者 */}
          <Card>
            <CardHeader>
              <CardTitle>参加者</CardTitle>
              <CardDescription>{event.members.length}人</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <MemberList
                members={event.members}
                ownerId={event.ownerId}
                eventId={eventId}
                isOwner={isOwner}
              />
              <AddMemberForm eventId={eventId} />
            </CardContent>
          </Card>

          {/* 管理 */}
          <Card>
            <CardHeader>
              <CardTitle>管理</CardTitle>
              <CardDescription>車両・場所の管理</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full" asChild>
                <Link href={`/events/${eventId}/vehicles`}>車両管理</Link>
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link href={`/events/${eventId}/locations`}>場所管理</Link>
              </Button>
            </CardContent>
          </Card>

          {/* 清算 */}
          <Card>
            <CardHeader>
              <CardTitle>清算</CardTitle>
              <CardDescription>シャープレイ値による公平な負担額計算</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" asChild>
                <Link href={`/events/${eventId}/settlement`}>清算を計算する</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
