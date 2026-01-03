import Link from "next/link";
import { notFound } from "next/navigation";
import { getEventById } from "@/data/event";
import { PaymentForm } from "@/components/payment/payment-form";

interface PageProps {
  params: Promise<{ eventId: string }>;
}

export default async function NewPaymentPage({ params }: PageProps): Promise<React.ReactElement> {
  const { eventId } = await params;
  const event = await getEventById(eventId);

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
      <PaymentForm eventId={eventId} members={members} />
    </div>
  );
}
