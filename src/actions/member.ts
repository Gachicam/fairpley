"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  addMemberSchema,
  addMemberByUserIdSchema,
  updateMemberLoadingMinutesSchema,
} from "@/lib/schemas/member";
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
  const loadingMinutesRaw = formData.get("loadingMinutes");
  const validatedFields = addMemberSchema.safeParse({
    eventId: formData.get("eventId"),
    email: formData.get("email"),
    nickname: typeof nicknameValue === "string" && nicknameValue ? nicknameValue : undefined,
    loadingMinutes:
      typeof loadingMinutesRaw === "string" && loadingMinutesRaw
        ? parseInt(loadingMinutesRaw, 10)
        : 15,
  });

  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors };
  }

  const { eventId, email, nickname, loadingMinutes } = validatedFields.data;

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
      loadingMinutes,
    },
  });

  revalidatePath(`/events/${eventId}`);
  return {};
}

/**
 * Unicode装飾文字を正規化してASCII相当に変換
 * 例: 𝓙𝓲𝓬𝓱𝓸𝓾𝓟 → JichouP
 */
function normalizeUnicode(str: string): string {
  return str
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // 結合文字（アクセント記号等）を削除
    .toLowerCase();
}

/**
 * ユーザーを検索（名前・username・メールで部分一致、Unicode装飾文字も対応）
 */
export async function searchUsers(query: string): Promise<
  {
    id: string;
    name: string | null;
    username: string | null;
    email: string;
    image: string | null;
  }[]
> {
  const session = await auth();
  if (!session) {
    throw new Error("認証が必要です");
  }

  if (!query || query.length < 2) {
    return [];
  }

  const normalizedQuery = normalizeUnicode(query);

  // 全ユーザーを取得してUnicode正規化検索
  const allUsers = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      image: true,
    },
    take: 200,
  });

  const matches = allUsers.filter((user) => {
    const normalizedName = user.name ? normalizeUnicode(user.name) : "";
    const normalizedUsername = user.username ? normalizeUnicode(user.username) : "";
    const normalizedEmail = normalizeUnicode(user.email);
    return (
      normalizedName.includes(normalizedQuery) ||
      normalizedUsername.includes(normalizedQuery) ||
      normalizedEmail.includes(normalizedQuery)
    );
  });

  return matches.slice(0, 10);
}

/**
 * ユーザーIDを指定してイベントに参加者を追加
 */
export async function addMemberByUserId(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session) {
    throw new Error("認証が必要です");
  }

  const nicknameValue = formData.get("nickname");
  const loadingMinutesRaw = formData.get("loadingMinutes");
  const validatedFields = addMemberByUserIdSchema.safeParse({
    eventId: formData.get("eventId"),
    userId: formData.get("userId"),
    nickname: typeof nicknameValue === "string" && nicknameValue ? nicknameValue : undefined,
    loadingMinutes:
      typeof loadingMinutesRaw === "string" && loadingMinutesRaw
        ? parseInt(loadingMinutesRaw, 10)
        : 15,
  });

  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors };
  }

  const { eventId, userId, nickname, loadingMinutes } = validatedFields.data;

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

  // ユーザーの存在確認
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return { error: { userId: ["ユーザーが見つかりません"] } };
  }

  // 既に参加者かチェック
  const existingMember = await prisma.eventMember.findUnique({
    where: {
      eventId_userId: { eventId, userId },
    },
  });

  if (existingMember) {
    return { error: { userId: ["この参加者は既に登録されています"] } };
  }

  await prisma.eventMember.create({
    data: {
      eventId,
      userId,
      nickname,
      loadingMinutes,
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

/**
 * 参加者の荷積み時間を更新
 */
export async function updateMemberLoadingMinutes(
  eventId: string,
  memberId: string,
  loadingMinutes: number
): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("認証が必要です");

  const validatedFields = updateMemberLoadingMinutesSchema.safeParse({
    memberId,
    eventId,
    loadingMinutes,
  });

  if (!validatedFields.success) throw new Error("入力値が不正です");

  const event = await prisma.event.findFirst({
    where: { id: eventId, members: { some: { userId: session.user.id } } },
  });

  if (!event) throw new Error("イベントが見つかりません");

  await prisma.eventMember.update({
    where: { id: memberId },
    data: { loadingMinutes },
  });

  revalidatePath(`/events/${eventId}`);
}

/**
 * 参加者の出発地を更新
 */
export async function updateDepartureLocation(
  eventId: string,
  memberId: string,
  departureLocationId: string | null
): Promise<void> {
  const session = await auth();
  if (!session) {
    throw new Error("認証が必要です");
  }

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

  // メンバーの存在確認
  const member = await prisma.eventMember.findUnique({
    where: { id: memberId },
    select: { userId: true, eventId: true },
  });

  if (member?.eventId !== eventId) {
    throw new Error("参加者が見つかりません");
  }

  await prisma.eventMember.update({
    where: { id: memberId },
    data: { departureLocationId },
  });

  revalidatePath(`/events/${eventId}`);
}
