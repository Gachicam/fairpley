"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { UserRole } from "@prisma/client";

/**
 * 管理者権限をチェック
 */
async function requireAdmin(): Promise<void> {
  const session = await auth();
  if (!session) {
    throw new Error("認証が必要です");
  }
  if (session.user.role !== "ADMIN") {
    throw new Error("管理者権限が必要です");
  }
}

/**
 * 承認待ちユーザー一覧を取得
 */
export async function getPendingUsers(): Promise<
  Array<{
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    createdAt: Date;
  }>
> {
  await requireAdmin();

  return prisma.user.findMany({
    where: { role: "PENDING" },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * 全ユーザー一覧を取得
 */
export async function getAllUsers(): Promise<
  Array<{
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    role: UserRole;
    createdAt: Date;
  }>
> {
  await requireAdmin();

  return prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * ユーザーを承認する（PENDING → MEMBER）
 */
export async function approveUser(userId: string): Promise<void> {
  await requireAdmin();

  await prisma.user.update({
    where: { id: userId },
    data: { role: "MEMBER" },
  });

  revalidatePath("/admin");
}

/**
 * ユーザーを拒否する（アカウント削除）
 */
export async function rejectUser(userId: string): Promise<void> {
  await requireAdmin();

  await prisma.user.delete({
    where: { id: userId },
  });

  revalidatePath("/admin");
}

/**
 * ユーザーの権限を変更する
 */
export async function updateUserRole(userId: string, role: UserRole): Promise<void> {
  await requireAdmin();

  const session = await auth();

  // 自分自身の権限は変更不可
  if (session?.user.id === userId) {
    throw new Error("自分自身の権限は変更できません");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role },
  });

  revalidatePath("/admin");
}
