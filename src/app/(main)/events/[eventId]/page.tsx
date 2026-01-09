import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getEventById } from "@/data/event";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EventSettings } from "@/components/event/event-settings";
import { MemberList } from "@/components/event/member-list";
import { AddMemberForm } from "@/components/event/add-member-form";

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
  const isAdmin = session?.user.role === "ADMIN";

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
          {(isOwner || isAdmin) && <EventSettings event={event} isAdmin={isAdmin} />}
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
                  {event.payments.slice(0, 5).map((payment) => {
                    const MAX_DISPLAY_BENEFICIARIES = 5;
                    const beneficiaries = payment.beneficiaries;
                    const displayedBeneficiaries = beneficiaries.slice(
                      0,
                      MAX_DISPLAY_BENEFICIARIES
                    );
                    const remainingCount = beneficiaries.length - MAX_DISPLAY_BENEFICIARIES;

                    return (
                      <Link
                        key={payment.id}
                        href={`/events/${eventId}/payments/${payment.id}/edit`}
                        className="hover:bg-muted/50 -mx-2 flex items-center justify-between gap-4 rounded px-2 py-3 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{payment.description}</p>
                          <div className="flex items-center gap-2 text-sm">
                            <div className="flex items-center gap-1">
                              <Avatar className="size-5">
                                <AvatarImage
                                  src={payment.payer.image ?? undefined}
                                  alt={payment.payer.name ?? ""}
                                />
                                <AvatarFallback className="text-xs">
                                  {payment.payer.name?.charAt(0) ?? "?"}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-muted-foreground">{payment.payer.name}</span>
                            </div>
                            <span className="text-muted-foreground">→</span>
                            <div className="flex items-center -space-x-1.5">
                              {displayedBeneficiaries.map((b) => (
                                <Avatar key={b.id} className="border-background size-5 border-2">
                                  <AvatarImage
                                    src={b.member.user.image ?? undefined}
                                    alt={b.member.nickname ?? b.member.user.name ?? ""}
                                  />
                                  <AvatarFallback className="text-xs">
                                    {(b.member.nickname ?? b.member.user.name)?.charAt(0) ?? "?"}
                                  </AvatarFallback>
                                </Avatar>
                              ))}
                              {remainingCount > 0 && (
                                <div className="border-background bg-muted flex size-5 items-center justify-center rounded-full border-2 text-xs">
                                  +{remainingCount}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <p className="font-bold whitespace-nowrap">
                          ¥{payment.amount.toLocaleString()}
                        </p>
                      </Link>
                    );
                  })}
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
