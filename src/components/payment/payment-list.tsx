"use client";

import { useState } from "react";
import Link from "next/link";
import { deletePayment } from "@/actions/payment";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { paymentCategoryLabels } from "@/lib/schemas/payment";
import type { PaymentCategory } from "@/lib/schemas/payment";

interface Payment {
  id: string;
  amount: number;
  description: string;
  category: string;
  createdAt: Date;
  payer: {
    id: string;
    name: string | null;
    email: string;
  };
  beneficiaries: {
    memberId: string;
  }[];
}

interface Member {
  id: string;
  nickname: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface PaymentListProps {
  payments: Payment[];
  eventId: string;
  members: Member[];
}

export function PaymentList({ payments, eventId, members }: PaymentListProps): React.ReactElement {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (paymentId: string): Promise<void> => {
    setDeletingId(paymentId);
    try {
      await deletePayment(paymentId);
    } catch (error) {
      console.error("Failed to delete payment:", error);
    } finally {
      setDeletingId(null);
    }
  };

  const getMemberName = (memberId: string): string => {
    const member = members.find((m) => m.id === memberId);
    if (!member) return "不明";
    return member.nickname ?? member.user.name ?? member.user.email;
  };

  const getPayerName = (payer: Payment["payer"]): string => {
    const member = members.find((m) => m.user.id === payer.id);
    if (member) {
      return member.nickname ?? member.user.name ?? member.user.email;
    }
    return payer.name ?? payer.email;
  };

  if (payments.length === 0) {
    return <p className="text-muted-foreground py-8 text-center">まだ支払いが記録されていません</p>;
  }

  return (
    <div className="divide-y">
      {payments.map((payment) => (
        <div key={payment.id} className="flex items-center justify-between py-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium">{payment.description}</p>
              <Badge variant="secondary">
                {paymentCategoryLabels[payment.category as PaymentCategory]}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm">{getPayerName(payment.payer)} が支払い</p>
            <p className="text-muted-foreground text-xs">
              受益者: {payment.beneficiaries.map((b) => getMemberName(b.memberId)).join(", ")}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <p className="text-lg font-bold">¥{payment.amount.toLocaleString()}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/events/${eventId}/payments/${payment.id}/edit`}>編集</Link>
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    disabled={deletingId === payment.id}
                  >
                    {deletingId === payment.id ? "..." : "削除"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>支払いを削除</AlertDialogTitle>
                    <AlertDialogDescription>
                      「{payment.description}」（¥{payment.amount.toLocaleString()}
                      ）を削除してもよろしいですか？
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>キャンセル</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDelete(payment.id)}>
                      削除する
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
