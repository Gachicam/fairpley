"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { createPayment, updatePayment } from "@/actions/payment";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { paymentCategoryLabels } from "@/lib/schemas/payment";
import type { PaymentCategory } from "@/lib/schemas/payment";

interface Member {
  id: string;
  nickname: string | null;
  user: {
    name: string | null;
    email: string;
  };
}

interface Payment {
  id: string;
  amount: number;
  description: string;
  category: PaymentCategory;
  beneficiaries: { memberId: string }[];
}

interface PaymentFormProps {
  eventId: string;
  members: Member[];
  payment?: Payment;
}

interface FormState {
  error?: Record<string, string[]>;
}

export function PaymentForm({ eventId, members, payment }: PaymentFormProps): React.ReactElement {
  const router = useRouter();
  const isEditing = Boolean(payment);

  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    async (_prevState, formData) => {
      const result = isEditing ? await updatePayment(formData) : await createPayment(formData);
      if (!result.error && isEditing) {
        router.push(`/events/${eventId}`);
      }
      return result;
    },
    {}
  );

  const getDisplayName = (member: Member): string => {
    return member.nickname ?? member.user.name ?? member.user.email;
  };

  const getSubmitLabel = (): string => {
    return isEditing ? "更新" : "登録";
  };

  const defaultBeneficiaryIds =
    payment?.beneficiaries.map((b) => b.memberId) ?? members.map((m) => m.id);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? "支払いを編集" : "新規支払い登録"}</CardTitle>
        <CardDescription>
          {isEditing ? "支払い情報を更新してください" : "支払い情報を入力してください"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-6">
          {isEditing && <input type="hidden" name="id" value={payment?.id} />}
          <input type="hidden" name="eventId" value={eventId} />

          <div className="space-y-2">
            <Label htmlFor="description">説明</Label>
            <Input
              id="description"
              name="description"
              placeholder="例: 食材費"
              defaultValue={payment?.description}
              required
              maxLength={200}
            />
            {state.error?.description && (
              <p className="text-sm text-red-500">{state.error.description[0]}</p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="amount">金額（円）</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                placeholder="0"
                defaultValue={payment?.amount}
                min={1}
                max={10000000}
                required
              />
              {state.error?.amount && (
                <p className="text-sm text-red-500">{state.error.amount[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">カテゴリ</Label>
              <Select name="category" defaultValue={payment?.category ?? "FOOD"}>
                <SelectTrigger>
                  <SelectValue placeholder="カテゴリを選択" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(paymentCategoryLabels) as [PaymentCategory, string][]).map(
                    ([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
              {state.error?.category && (
                <p className="text-sm text-red-500">{state.error.category[0]}</p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <Label>受益者（この支払いの恩恵を受けた人）</Label>
            <div className="grid gap-2 md:grid-cols-2">
              {members.map((member) => (
                <label
                  key={member.id}
                  className="hover:bg-accent flex cursor-pointer items-center gap-2 rounded-lg border p-3"
                >
                  <Checkbox
                    name="beneficiaryIds"
                    value={member.id}
                    defaultChecked={defaultBeneficiaryIds.includes(member.id)}
                  />
                  <span className="text-sm">{getDisplayName(member)}</span>
                </label>
              ))}
            </div>
            {state.error?.beneficiaryIds && (
              <p className="text-sm text-red-500">{state.error.beneficiaryIds[0]}</p>
            )}
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={isPending}>
              {isPending ? "保存中..." : getSubmitLabel()}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              キャンセル
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
