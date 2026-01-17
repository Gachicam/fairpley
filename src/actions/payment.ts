"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPaymentSchema, updatePaymentSchema } from "@/lib/schemas/payment";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

interface ActionResult {
  error?: Record<string, string[]>;
}

/**
 * 支払いを作成
 */
export async function createPayment(formData: FormData): Promise<ActionResult | never> {
  const session = await auth();
  if (!session) {
    throw new Error("認証が必要です");
  }

  const beneficiaryIds = formData.getAll("beneficiaryIds");
  const amountRaw = formData.get("amount");
  const amount = typeof amountRaw === "string" ? parseInt(amountRaw, 10) : 0;

  const isTransportRaw = formData.get("isTransport");
  const isTransport = isTransportRaw === "true" || isTransportRaw === "on";

  const validatedFields = createPaymentSchema.safeParse({
    eventId: formData.get("eventId"),
    payerId: formData.get("payerId"),
    amount: isNaN(amount) ? 0 : amount,
    description: formData.get("description"),
    isTransport,
    beneficiaryIds: beneficiaryIds.filter((id): id is string => typeof id === "string"),
  });

  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors };
  }

  const { eventId, payerId, ...data } = validatedFields.data;

  // イベントへのアクセス権チェック
  const event = await prisma.event.findFirst({
    where: {
      id: eventId,
      members: { some: { userId: session.user.id } },
    },
  });

  if (!event) {
    throw new Error("イベントが見つかりません");
  }

  await prisma.payment.create({
    data: {
      eventId,
      payerId,
      amount: data.amount,
      description: data.description,
      isTransport: data.isTransport,
      beneficiaries: {
        create: data.beneficiaryIds.map((memberId) => ({
          memberId,
        })),
      },
    },
  });

  revalidatePath(`/events/${eventId}`);
  redirect(`/events/${eventId}`);
}

/**
 * 支払いを更新
 */
export async function updatePayment(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session) {
    throw new Error("認証が必要です");
  }

  const beneficiaryIds = formData.getAll("beneficiaryIds");
  const amountRaw = formData.get("amount");
  const amount = typeof amountRaw === "string" ? parseInt(amountRaw, 10) : 0;

  const isTransportRaw = formData.get("isTransport");
  const isTransport = isTransportRaw === "true" || isTransportRaw === "on";

  const validatedFields = updatePaymentSchema.safeParse({
    id: formData.get("id"),
    payerId: formData.get("payerId"),
    amount: isNaN(amount) ? 0 : amount,
    description: formData.get("description"),
    isTransport,
    beneficiaryIds: beneficiaryIds.filter((id): id is string => typeof id === "string"),
  });

  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors };
  }

  const { id, payerId, beneficiaryIds: newBeneficiaryIds, ...data } = validatedFields.data;

  // 支払いの存在確認とアクセス権チェック
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      event: {
        include: {
          members: { select: { userId: true } },
        },
      },
    },
  });

  if (!payment) {
    throw new Error("支払いが見つかりません");
  }

  // イベント参加者のみ編集可能（性善説アプローチ）
  const isMember = payment.event.members.some((m) => m.userId === session.user.id);
  if (!isMember) {
    throw new Error("支払いを編集する権限がありません");
  }

  // 受益者を更新（既存を削除して新規作成）
  await prisma.$transaction([
    prisma.paymentBeneficiary.deleteMany({
      where: { paymentId: id },
    }),
    prisma.payment.update({
      where: { id },
      data: {
        amount: data.amount,
        description: data.description,
        isTransport: data.isTransport,
        payerId,
        beneficiaries: {
          create: newBeneficiaryIds.map((memberId) => ({
            memberId,
          })),
        },
      },
    }),
  ]);

  revalidatePath(`/events/${payment.eventId}`);
  return {};
}

/**
 * 支払いを削除
 */
export async function deletePayment(paymentId: string): Promise<void> {
  const session = await auth();
  if (!session) {
    throw new Error("認証が必要です");
  }

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      event: {
        include: {
          members: { select: { userId: true } },
        },
      },
    },
  });

  if (!payment) {
    throw new Error("支払いが見つかりません");
  }

  // イベント参加者のみ削除可能（性善説アプローチ）
  const isMember = payment.event.members.some((m) => m.userId === session.user.id);
  if (!isMember) {
    throw new Error("支払いを削除する権限がありません");
  }

  await prisma.payment.delete({
    where: { id: paymentId },
  });

  revalidatePath(`/events/${payment.eventId}`);
}
