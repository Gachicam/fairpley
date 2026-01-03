import Link from "next/link";
import { notFound } from "next/navigation";
import { getEventById } from "@/data/event";
import { calculateSettlement } from "@/lib/settlement";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { paymentCategoryLabels } from "@/lib/schemas/payment";
import type { PaymentCategory } from "@/lib/schemas/payment";

interface PageProps {
  params: Promise<{ eventId: string }>;
}

function getBalanceColorClass(balance: number): string {
  if (balance > 0) {
    return "text-green-600";
  }
  if (balance < 0) {
    return "text-red-600";
  }
  return "";
}

export default async function SettlementPage({ params }: PageProps): Promise<React.ReactElement> {
  const { eventId } = await params;
  const event = await getEventById(eventId);

  if (!event) {
    notFound();
  }

  const payments = event.payments.map((p) => ({
    id: p.id,
    amount: p.amount,
    payerId: p.payerId,
    category: p.category,
    beneficiaries: p.beneficiaries.map((b) => ({ memberId: b.memberId })),
  }));

  const members = event.members.map((m) => ({
    id: m.id,
    userId: m.userId,
    nickname: m.nickname,
    user: {
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
    },
  }));

  const settlement = calculateSettlement(payments, members);

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

      <h1 className="mb-8 text-2xl font-bold">清算</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* サマリー */}
        <Card>
          <CardHeader>
            <CardTitle>合計金額</CardTitle>
            <CardDescription>カテゴリ別の内訳</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-3xl font-bold">¥{settlement.totalAmount.toLocaleString()}</p>
            <div className="space-y-2">
              {(Object.entries(settlement.categoryBreakdown) as [PaymentCategory, number][])
                .filter(([, amount]) => amount > 0)
                .sort(([, a], [, b]) => b - a)
                .map(([category, amount]) => (
                  <div key={category} className="flex items-center justify-between">
                    <Badge variant="outline">{paymentCategoryLabels[category]}</Badge>
                    <span>¥{amount.toLocaleString()}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* 送金一覧 */}
        <Card>
          <CardHeader>
            <CardTitle>送金</CardTitle>
            <CardDescription>清算に必要な送金一覧</CardDescription>
          </CardHeader>
          <CardContent>
            {settlement.transfers.length > 0 ? (
              <div className="space-y-3">
                {settlement.transfers.map((transfer, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{transfer.from.memberName}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="font-medium">{transfer.to.memberName}</span>
                    </div>
                    <span className="text-lg font-bold">¥{transfer.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground py-4 text-center">送金の必要はありません</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 個人別残高 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>個人別残高</CardTitle>
          <CardDescription>各メンバーの支払い額・負担額・残高</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-2 text-left">メンバー</th>
                  <th className="px-4 py-2 text-right">支払い額</th>
                  <th className="px-4 py-2 text-right">負担額</th>
                  <th className="px-4 py-2 text-right">残高</th>
                </tr>
              </thead>
              <tbody>
                {settlement.balances.map((balance) => (
                  <tr key={balance.memberId} className="border-b last:border-0">
                    <td className="px-4 py-3">{balance.memberName}</td>
                    <td className="px-4 py-3 text-right">¥{balance.paid.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">¥{balance.owed.toLocaleString()}</td>
                    <td
                      className={`px-4 py-3 text-right font-bold ${getBalanceColorClass(balance.balance)}`}
                    >
                      {balance.balance > 0 ? "+" : ""}¥{balance.balance.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
