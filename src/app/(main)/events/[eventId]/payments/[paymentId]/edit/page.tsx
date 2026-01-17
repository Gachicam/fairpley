import Link from "next/link";
import { notFound } from "next/navigation";
import { getEventById, getPaymentById } from "@/data/event";
import { PaymentForm } from "@/components/payment/payment-form";

interface PageProps {
  params: Promise<{ eventId: string; paymentId: string }>;
}

export default async function EditPaymentPage({ params }: PageProps): Promise<React.ReactElement> {
  const { eventId, paymentId } = await params;
  const [event, payment] = await Promise.all([getEventById(eventId), getPaymentById(paymentId)]);

  if (!event || !payment) {
    notFound();
  }

  const members = event.members.map((m) => ({
    id: m.id,
    nickname: m.nickname,
    user: {
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
    },
  }));

  const paymentData = {
    id: payment.id,
    payerId: payment.payerId,
    amount: payment.amount,
    description: payment.description,
    isTransport: payment.isTransport,
    beneficiaries: payment.beneficiaries.map((b) => ({ memberId: b.memberId })),
  };

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
      <PaymentForm eventId={eventId} members={members} payment={paymentData} />
    </div>
  );
}
