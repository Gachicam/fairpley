import Link from "next/link";
import { getLocations } from "@/actions/location";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GlobalLocationList } from "@/components/location/global-location-list";
import { GlobalLocationForm } from "@/components/location/global-location-form";

export default async function LocationsPage(): Promise<React.ReactElement> {
  const locations = await getLocations();

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <Link href="/" className="text-muted-foreground hover:text-foreground text-sm">
          ← マイイベントに戻る
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold">場所管理</h1>
        <p className="text-muted-foreground">
          移動記録で使用する場所を管理します（全イベント共通）
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* 場所追加フォーム */}
        <Card>
          <CardHeader>
            <CardTitle>場所を追加</CardTitle>
            <CardDescription>新しい場所を登録します</CardDescription>
          </CardHeader>
          <CardContent>
            <GlobalLocationForm />
          </CardContent>
        </Card>

        {/* 場所一覧 */}
        <Card>
          <CardHeader>
            <CardTitle>登録済み場所</CardTitle>
            <CardDescription>{locations.length}件の場所が登録されています</CardDescription>
          </CardHeader>
          <CardContent>
            <GlobalLocationList locations={locations} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
