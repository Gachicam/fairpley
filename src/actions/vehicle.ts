"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createVehicleSchema, updateVehicleSchema } from "@/lib/schemas/vehicle";
import { revalidatePath } from "next/cache";

interface ActionResult {
  error?: Record<string, string[]>;
}

/**
 * 車両を作成
 */
export async function createVehicle(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session) {
    throw new Error("認証が必要です");
  }

  const capacityRaw = formData.get("capacity");
  const fuelEfficiencyRaw = formData.get("fuelEfficiency");
  const ownerIdRaw = formData.get("ownerId");

  const validatedFields = createVehicleSchema.safeParse({
    eventId: formData.get("eventId"),
    name: formData.get("name"),
    type: formData.get("type"),
    ownerId: typeof ownerIdRaw === "string" && ownerIdRaw ? ownerIdRaw : undefined,
    capacity: typeof capacityRaw === "string" ? parseInt(capacityRaw, 10) : 4,
    fuelEfficiency:
      typeof fuelEfficiencyRaw === "string" && fuelEfficiencyRaw
        ? parseFloat(fuelEfficiencyRaw)
        : undefined,
  });

  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors };
  }

  const { eventId, ...data } = validatedFields.data;

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

  await prisma.vehicle.create({
    data: {
      ...data,
    },
  });

  revalidatePath(`/events/${eventId}`);
  return {};
}

/**
 * 車両を更新
 */
export async function updateVehicle(eventId: string, formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session) {
    throw new Error("認証が必要です");
  }

  const capacityRaw = formData.get("capacity");
  const fuelEfficiencyRaw = formData.get("fuelEfficiency");
  const ownerIdRaw = formData.get("ownerId");

  const validatedFields = updateVehicleSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    type: formData.get("type"),
    ownerId: typeof ownerIdRaw === "string" && ownerIdRaw ? ownerIdRaw : undefined,
    capacity: typeof capacityRaw === "string" ? parseInt(capacityRaw, 10) : 4,
    fuelEfficiency:
      typeof fuelEfficiencyRaw === "string" && fuelEfficiencyRaw
        ? parseFloat(fuelEfficiencyRaw)
        : undefined,
  });

  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors };
  }

  const { id, ...data } = validatedFields.data;

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

  await prisma.vehicle.update({
    where: { id },
    data,
  });

  revalidatePath(`/events/${eventId}`);
  return {};
}

/**
 * 車両を削除
 */
export async function deleteVehicle(eventId: string, vehicleId: string): Promise<void> {
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

  // 使用中の移動記録があるかチェック
  const tripCount = await prisma.trip.count({
    where: { vehicleId },
  });

  if (tripCount > 0) {
    throw new Error("この車両は移動記録で使用されているため削除できません");
  }

  await prisma.vehicle.delete({
    where: { id: vehicleId },
  });

  revalidatePath(`/events/${eventId}`);
}
