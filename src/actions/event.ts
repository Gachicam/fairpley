"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createEventSchema, updateEventSchema } from "@/lib/schemas/event";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// 戻り値の型定義
interface ActionResult {
  error?: Record<string, string[]>;
}

/**
 * イベント作成
 */
export async function createEvent(formData: FormData): Promise<ActionResult | never> {
  const session = await auth();
  if (!session) {
    throw new Error("認証が必要です");
  }

  const validatedFields = createEventSchema.safeParse({
    name: formData.get("name"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
  });

  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors };
  }

  const { name, startDate, endDate } = validatedFields.data;

  const event = await prisma.event.create({
    data: {
      name,
      startDate,
      endDate,
      ownerId: session.user.id,
      members: {
        create: {
          userId: session.user.id,
          // オーナーは自動的に参加者になる
        },
      },
    },
  });

  revalidatePath("/");
  redirect(`/events/${event.id}`);
}

/**
 * イベント更新
 */
export async function updateEvent(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session) {
    throw new Error("認証が必要です");
  }

  const gasPriceRaw = formData.get("gasPricePerLiter");
  const gasPricePerLiter = typeof gasPriceRaw === "string" ? parseInt(gasPriceRaw, 10) : 170;

  const validatedFields = updateEventSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    gasPricePerLiter: isNaN(gasPricePerLiter) ? 170 : gasPricePerLiter,
  });

  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors };
  }

  const { id, ...data } = validatedFields.data;

  // オーナーのみ更新可能
  const event = await prisma.event.findUnique({
    where: { id },
    select: { ownerId: true },
  });

  if (event?.ownerId !== session.user.id) {
    throw new Error("イベントの更新権限がありません");
  }

  await prisma.event.update({
    where: { id },
    data,
  });

  revalidatePath(`/events/${id}`);
  return {};
}

/**
 * イベント削除
 */
export async function deleteEvent(eventId: string): Promise<never> {
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
    throw new Error("イベントの削除権限がありません");
  }

  // カスケード削除（関連データも削除）
  await prisma.event.delete({
    where: { id: eventId },
  });

  revalidatePath("/");
  redirect("/");
}
