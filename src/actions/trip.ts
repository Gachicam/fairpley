"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createTripSchema, updateTripSchema } from "@/lib/schemas/trip";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

interface ActionResult {
  error?: Record<string, string[]>;
}

/**
 * 移動記録を作成
 */
export async function createTrip(formData: FormData): Promise<ActionResult | never> {
  const session = await auth();
  if (!session) {
    throw new Error("認証が必要です");
  }

  const passengerIds = formData.getAll("passengerIds");
  const distanceRaw = formData.get("distance");

  const validatedFields = createTripSchema.safeParse({
    eventId: formData.get("eventId"),
    vehicleId: formData.get("vehicleId"),
    fromId: formData.get("fromId"),
    toId: formData.get("toId"),
    distance: typeof distanceRaw === "string" && distanceRaw ? parseFloat(distanceRaw) : undefined,
    passengerIds: passengerIds.filter((id): id is string => typeof id === "string"),
  });

  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors };
  }

  const { eventId, passengerIds: passengers, ...data } = validatedFields.data;

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

  await prisma.trip.create({
    data: {
      eventId,
      ...data,
      passengers: {
        create: passengers.map((memberId) => ({
          memberId,
        })),
      },
    },
  });

  revalidatePath(`/events/${eventId}`);
  redirect(`/events/${eventId}`);
}

/**
 * 移動記録を更新
 */
export async function updateTrip(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session) {
    throw new Error("認証が必要です");
  }

  const passengerIds = formData.getAll("passengerIds");
  const distanceRaw = formData.get("distance");

  const validatedFields = updateTripSchema.safeParse({
    id: formData.get("id"),
    vehicleId: formData.get("vehicleId"),
    fromId: formData.get("fromId"),
    toId: formData.get("toId"),
    distance: typeof distanceRaw === "string" && distanceRaw ? parseFloat(distanceRaw) : undefined,
    passengerIds: passengerIds.filter((id): id is string => typeof id === "string"),
  });

  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors };
  }

  const { id, passengerIds: newPassengerIds, ...data } = validatedFields.data;

  // 移動記録の存在確認
  const trip = await prisma.trip.findUnique({
    where: { id },
    include: {
      event: {
        include: {
          members: { select: { userId: true } },
        },
      },
    },
  });

  if (!trip) {
    throw new Error("移動記録が見つかりません");
  }

  // イベント参加者のみ編集可能
  const isMember = trip.event.members.some((m) => m.userId === session.user.id);
  if (!isMember) {
    throw new Error("移動記録を編集する権限がありません");
  }

  // 乗客を更新（既存を削除して新規作成）
  await prisma.$transaction([
    prisma.tripPassenger.deleteMany({
      where: { tripId: id },
    }),
    prisma.trip.update({
      where: { id },
      data: {
        ...data,
        passengers: {
          create: newPassengerIds.map((memberId) => ({
            memberId,
          })),
        },
      },
    }),
  ]);

  revalidatePath(`/events/${trip.eventId}`);
  return {};
}

/**
 * 移動記録を削除
 */
export async function deleteTrip(tripId: string): Promise<void> {
  const session = await auth();
  if (!session) {
    throw new Error("認証が必要です");
  }

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      event: {
        include: {
          members: { select: { userId: true } },
        },
      },
    },
  });

  if (!trip) {
    throw new Error("移動記録が見つかりません");
  }

  // イベント参加者のみ削除可能
  const isMember = trip.event.members.some((m) => m.userId === session.user.id);
  if (!isMember) {
    throw new Error("移動記録を削除する権限がありません");
  }

  await prisma.trip.delete({
    where: { id: tripId },
  });

  revalidatePath(`/events/${trip.eventId}`);
}
