import Link from "next/link";
import { getVehicles } from "@/actions/vehicle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GlobalVehicleList } from "@/components/vehicle/global-vehicle-list";
import { GlobalVehicleForm } from "@/components/vehicle/global-vehicle-form";

export default async function VehiclesPage(): Promise<React.ReactElement> {
  const vehicles = await getVehicles();

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <Link href="/" className="text-muted-foreground hover:text-foreground text-sm">
          ← マイイベントに戻る
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold">車両管理</h1>
        <p className="text-muted-foreground">
          移動記録で使用する車両を管理します（全イベント共通）
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* 車両追加フォーム */}
        <Card>
          <CardHeader>
            <CardTitle>車両を追加</CardTitle>
            <CardDescription>新しい車両を登録します</CardDescription>
          </CardHeader>
          <CardContent>
            <GlobalVehicleForm />
          </CardContent>
        </Card>

        {/* 車両一覧 */}
        <Card>
          <CardHeader>
            <CardTitle>登録済み車両</CardTitle>
            <CardDescription>{vehicles.length}台の車両が登録されています</CardDescription>
          </CardHeader>
          <CardContent>
            <GlobalVehicleList vehicles={vehicles} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
