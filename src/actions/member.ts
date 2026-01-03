"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addMemberSchema } from "@/lib/schemas/member";
import { revalidatePath } from "next/cache";

// 戻り値の型定義
interface ActionResult {
  error?: Record<string, string[]>;
}

/**
 * イベントに参加者を追加
 */
export async function addMember(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session) {
    throw new Error("認証が必要です");
  }

  const nicknameValue = formData.get("nickname");
  const validatedFields = addMemberSchema.safeParse({
    eventId: formData.get("eventId"),
    email: formData.get("email"),
    nickname: typeof nicknameValue === "string" && nicknameValue ? nicknameValue : undefined,
  });

  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors };
  }

  const { eventId, email, nickname } = validatedFields.data;

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

  // ユーザーを検索または作成
  let user = await prisma.user.findUnique({
    where: { email },
  });

  // 未登録ユーザーはプレースホルダーとして作成
  user ??= await prisma.user.create({
    data: {
      email,
      name: nickname ?? email.split("@")[0],
    },
  });

  // 既に参加者かチェック
  const existingMember = await prisma.eventMember.findUnique({
    where: {
      eventId_userId: { eventId, userId: user.id },
    },
  });

  if (existingMember) {
    return { error: { email: ["この参加者は既に登録されています"] } };
  }

  await prisma.eventMember.create({
    data: {
      eventId,
      userId: user.id,
      nickname,
    },
  });

  revalidatePath(`/events/${eventId}`);
  return {};
}

/**
 * イベントから参加者を削除
 */
export async function removeMember(eventId: string, memberId: string): Promise<void> {
  const session = await auth();
  if (!session) {
    throw new Error("認証が必要です");
  }

  // オーナーのみ削除可能
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { ownerId: true },
  });

  if (event?.ownerId !== session.user.id) {
    throw new Error("参加者を削除する権限がありません");
  }

  // 削除対象のメンバー情報を取得
  const member = await prisma.eventMember.findUnique({
    where: { id: memberId },
    select: { userId: true },
  });

  if (!member) {
    throw new Error("参加者が見つかりません");
  }

  // オーナー自身は削除不可
  if (member.userId === session.user.id) {
    throw new Error("オーナーは削除できません");
  }

  // 関連データをチェック（支払いや乗車記録がある場合は削除不可）
  const hasPayments = await prisma.payment.count({
    where: {
      eventId,
      OR: [{ payerId: member.userId }, { beneficiaries: { some: { memberId } } }],
    },
  });

  if (hasPayments > 0) {
    throw new Error("支払い記録がある参加者は削除できません");
  }

  await prisma.eventMember.delete({
    where: { id: memberId },
  });

  revalidatePath(`/events/${eventId}`);
}
