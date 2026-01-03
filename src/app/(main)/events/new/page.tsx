"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createEvent } from "@/actions/event";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface FormState {
  error?: Record<string, string[]>;
}

export default function NewEventPage(): React.ReactElement {
  const [state, formAction, isPending] = useActionState<FormState | null, FormData>(
    async (_prevState, formData) => {
      const result = await createEvent(formData);
      // createEvent は成功時に redirect するので、
      // ここに来るのはエラー時のみ
      return result;
    },
    null
  );

  // 今日の日付をデフォルト値として設定
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>新規イベント作成</CardTitle>
          <CardDescription>キャンプなどのイベント情報を入力してください</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">イベント名</Label>
              <Input
                id="name"
                name="name"
                placeholder="例: 2024年夏キャンプ"
                required
                maxLength={100}
              />
              {state?.error?.name && <p className="text-sm text-red-500">{state.error.name[0]}</p>}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startDate">開始日</Label>
                <Input id="startDate" name="startDate" type="date" defaultValue={today} required />
                {state?.error?.startDate && (
                  <p className="text-sm text-red-500">{state.error.startDate[0]}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">終了日</Label>
                <Input id="endDate" name="endDate" type="date" defaultValue={today} required />
                {state?.error?.endDate && (
                  <p className="text-sm text-red-500">{state.error.endDate[0]}</p>
                )}
              </div>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={isPending}>
                {isPending ? "作成中..." : "イベントを作成"}
              </Button>
              <Button variant="outline" asChild>
                <Link href="/">キャンセル</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
