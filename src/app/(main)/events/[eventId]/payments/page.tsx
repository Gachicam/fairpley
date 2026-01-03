import Link from "next/link";
import { notFound } from "next/navigation";
import { getEventById } from "@/data/event";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PaymentList } from "@/components/payment/payment-list";

interface PageProps {
  params: Promise<{ eventId: string }>;
}

export default async function PaymentsPage({ params }: PageProps): Promise<React.ReactElement> {
  const { eventId } = await params;
  const event = await getEventById(eventId);

  if (!event) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href={`/events/${eventId}`}
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          ← {event.name}に戻る
        </Link>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>支払い一覧</CardTitle>
            <CardDescription>{event.payments.length}件の支払いが記録されています</CardDescription>
          </div>
          <Button asChild>
            <Link href={`/events/${eventId}/payments/new`}>+ 支払い追加</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <PaymentList payments={event.payments} eventId={eventId} members={event.members} />
        </CardContent>
      </Card>
    </div>
  );
}
