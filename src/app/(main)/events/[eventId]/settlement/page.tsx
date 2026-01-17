import Link from "next/link";
import { notFound } from "next/navigation";
import { getEventById, getEventForSettlement } from "@/data/event";
import { calculateSettlement, calculateSimpleSettlement } from "@/lib/settlement";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
  const eventForSettlement = await getEventForSettlement(eventId);

  if (!event || !eventForSettlement) {
    notFound();
  }

  // Shapley値計算用のデータを整形
  const settlementData = {
    id: eventForSettlement.id,
    gasPricePerLiter: eventForSettlement.gasPricePerLiter,
    destination: eventForSettlement.destination,
    members: eventForSettlement.members.map((m) => ({
      id: m.id,
      userId: m.userId,
      nickname: m.nickname,
      departureLocation: m.departureLocation,
      vehicles: m.vehicles.map((v) => ({
        id: v.id,
        type: v.type as "OWNED" | "RENTAL" | "CARSHARE" | "BIKE",
        capacity: v.capacity,
        fuelEfficiency: v.fuelEfficiency,
      })),
      user: {
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        homeLocation: m.user.homeLocation,
      },
    })),
    payments: eventForSettlement.payments.map((p) => ({
      id: p.id,
      amount: p.amount,
      payerId: p.payerId,
      isTransport: p.isTransport,
      description: p.description,
      beneficiaries: p.beneficiaries.map((b) => ({ memberId: b.memberId })),
    })),
  };

  // 交通費支払いがあり、目的地が設定されている場合はShapley値計算を試みる
  const hasTransportPayments = settlementData.payments.some((p) => p.isTransport);
  const hasDestination = settlementData.destination !== null;
  const hasCarOwner = settlementData.members.some((m) => m.vehicles.some((v) => v.type !== "BIKE"));

  let settlement;
  let useShapley = false;
  let shapleyError: string | null = null;

  if (hasTransportPayments && hasDestination && hasCarOwner) {
    try {
      settlement = await calculateSettlement(settlementData);
      useShapley = true;
    } catch (error) {
      shapleyError = error instanceof Error ? error.message : "計算中にエラーが発生しました";
      // フォールバック: シンプル計算
      const payments = event.payments.map((p) => ({
        id: p.id,
        amount: p.amount,
        payerId: p.payerId,
        beneficiaries: p.beneficiaries.map((b) => ({ memberId: b.memberId })),
      }));
      const members = event.members.map((m) => ({
        id: m.id,
        userId: m.userId,
        nickname: m.nickname,
        user: { id: m.user.id, name: m.user.name, email: m.user.email },
      }));
      settlement = {
        ...calculateSimpleSettlement(payments, members),
        shapleyValues: [],
        transportCost: 0,
      };
    }
  } else {
    // シンプル計算（均等割り）
    const payments = event.payments.map((p) => ({
      id: p.id,
      amount: p.amount,
      payerId: p.payerId,
      beneficiaries: p.beneficiaries.map((b) => ({ memberId: b.memberId })),
    }));
    const members = event.members.map((m) => ({
      id: m.id,
      userId: m.userId,
      nickname: m.nickname,
      user: { id: m.user.id, name: m.user.name, email: m.user.email },
    }));
    settlement = {
      ...calculateSimpleSettlement(payments, members),
      shapleyValues: [],
      transportCost: 0,
    };
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

      <h1 className="mb-8 text-2xl font-bold">清算</h1>

      {shapleyError && (
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-sm text-yellow-800">
            Shapley値計算中に問題が発生しました: {shapleyError}
          </p>
          <p className="text-sm text-yellow-700">均等割りで計算しています。</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* サマリー */}
        <Card>
          <CardHeader>
            <CardTitle>合計金額</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-3xl font-bold">¥{settlement.totalAmount.toLocaleString()}</p>
            {useShapley && settlement.transportCost > 0 && (
              <p className="text-muted-foreground text-sm">
                うち交通費: ¥{settlement.transportCost.toLocaleString()}（Shapley値で分配）
              </p>
            )}
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

      {/* Shapley値 */}
      {useShapley && settlement.shapleyValues.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>交通費の負担額（Shapley値）</CardTitle>
            <CardDescription>
              各メンバーの公平な交通費負担額です。車を出す人は負担が軽減されます。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {settlement.shapleyValues.map((sv) => (
                <div
                  key={sv.memberId}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <span>{sv.memberName}</span>
                  <span className="font-bold">¥{sv.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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

      {/* 計算方法の説明 */}
      {!useShapley && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>計算方法</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              現在、すべての支払いは受益者間で均等割りされています。
              {!hasDestination && "目的地を設定し、"}
              {!hasTransportPayments && "交通費として支払いを登録すると、"}
              Shapley値による公平な分配が適用されます。
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
