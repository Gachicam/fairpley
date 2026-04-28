"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createVehicleSchema,
  updateVehicleSchema,
  createGlobalVehicleSchema,
  updateGlobalVehicleSchema,
  type VehicleClass,
} from "@/lib/schemas/vehicle";
import { revalidatePath } from "next/cache";

interface ActionResult {
  error?: Record<string, string[]>;
}

function parseVehicleFormData(formData: FormData) {
  const capacityRaw = formData.get("capacity");
  const fuelEfficiencyRaw = formData.get("fuelEfficiency");
  const ownerIdRaw = formData.get("ownerId");
  const hasEtcRaw = formData.get("hasEtc");

  return {
    name: formData.get("name"),
    type: formData.get("type"),
    vehicleClass: (formData.get("vehicleClass") ?? "STANDARD") as VehicleClass,
    hasEtc: hasEtcRaw === "true" || hasEtcRaw === "on",
    ownerId:
      typeof ownerIdRaw === "string" && ownerIdRaw && ownerIdRaw !== "__none__"
        ? ownerIdRaw
        : undefined,
    capacity: typeof capacityRaw === "string" ? parseInt(capacityRaw, 10) : 4,
    fuelEfficiency:
      typeof fuelEfficiencyRaw === "string" && fuelEfficiencyRaw
        ? parseFloat(fuelEfficiencyRaw)
        : undefined,
  };
}

export async function createVehicle(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session) throw new Error("認証が必要です");

  const validatedFields = createVehicleSchema.safeParse({
    eventId: formData.get("eventId"),
    ...parseVehicleFormData(formData),
  });

  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors };
  }

  const { eventId, ...data } = validatedFields.data;

  const event = await prisma.event.findFirst({
    where: { id: eventId, members: { some: { userId: session.user.id } } },
  });

  if (!event) throw new Error("イベントが見つかりません");

  await prisma.vehicle.create({ data });

  revalidatePath(`/events/${eventId}`);
  return {};
}

export async function updateVehicle(eventId: string, formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session) throw new Error("認証が必要です");

  const validatedFields = updateVehicleSchema.safeParse({
    id: formData.get("id"),
    ...parseVehicleFormData(formData),
  });

  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors };
  }

  const { id, ...data } = validatedFields.data;

  const event = await prisma.event.findFirst({
    where: { id: eventId, members: { some: { userId: session.user.id } } },
  });

  if (!event) throw new Error("イベントが見つかりません");

  await prisma.vehicle.update({ where: { id }, data });

  revalidatePath(`/events/${eventId}`);
  return {};
}

export async function deleteVehicle(eventId: string, vehicleId: string): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("認証が必要です");

  const event = await prisma.event.findFirst({
    where: { id: eventId, members: { some: { userId: session.user.id } } },
  });

  if (!event) throw new Error("イベントが見つかりません");

  await prisma.vehicle.delete({ where: { id: vehicleId } });

  revalidatePath(`/events/${eventId}`);
}

// ========================================
// グローバル車両管理
// ========================================

export async function getVehicles(): Promise<
  Array<{
    id: string;
    name: string;
    type: string;
    vehicleClass: string;
    hasEtc: boolean;
    capacity: number;
    fuelEfficiency: number | null;
    ownerId: string | null;
  }>
> {
  const session = await auth();
  if (!session) return [];
  return prisma.vehicle.findMany({ orderBy: { name: "asc" } });
}

export async function createGlobalVehicle(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session) throw new Error("認証が必要です");

  const { ownerId: _o, ...globalData } = parseVehicleFormData(formData);
  void _o;

  const validatedFields = createGlobalVehicleSchema.safeParse(globalData);

  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors };
  }

  await prisma.vehicle.create({ data: validatedFields.data });
  return {};
}

export async function updateGlobalVehicle(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session) throw new Error("認証が必要です");

  const { ownerId: _o, ...globalData } = parseVehicleFormData(formData);
  void _o;

  const validatedFields = updateGlobalVehicleSchema.safeParse({
    id: formData.get("id"),
    ...globalData,
  });

  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors };
  }

  const { id, ...data } = validatedFields.data;
  await prisma.vehicle.update({ where: { id }, data });
  return {};
}

export async function deleteGlobalVehicle(vehicleId: string): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("認証が必要です");
  await prisma.vehicle.delete({ where: { id: vehicleId } });
}
