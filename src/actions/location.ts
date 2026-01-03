"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createLocationSchema, updateLocationSchema } from "@/lib/schemas/location";

interface ActionResult {
  error?: Record<string, string[]>;
  locationId?: string;
}

/**
 * 場所を作成
 */
export async function createLocation(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session) {
    throw new Error("認証が必要です");
  }

  const latRaw = formData.get("lat");
  const lngRaw = formData.get("lng");

  const addressRaw = formData.get("address");
  const address = typeof addressRaw === "string" && addressRaw !== "" ? addressRaw : undefined;

  const validatedFields = createLocationSchema.safeParse({
    name: formData.get("name"),
    address,
    lat: typeof latRaw === "string" ? parseFloat(latRaw) : 0,
    lng: typeof lngRaw === "string" ? parseFloat(lngRaw) : 0,
    type: formData.get("type"),
  });

  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors };
  }

  const location = await prisma.location.create({
    data: validatedFields.data,
  });

  return { locationId: location.id };
}

/**
 * 場所を更新
 */
export async function updateLocation(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session) {
    throw new Error("認証が必要です");
  }

  const latRaw = formData.get("lat");
  const lngRaw = formData.get("lng");

  const addressRaw = formData.get("address");
  const address = typeof addressRaw === "string" && addressRaw !== "" ? addressRaw : undefined;

  const validatedFields = updateLocationSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    address,
    lat: typeof latRaw === "string" ? parseFloat(latRaw) : 0,
    lng: typeof lngRaw === "string" ? parseFloat(lngRaw) : 0,
    type: formData.get("type"),
  });

  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors };
  }

  const { id, ...data } = validatedFields.data;

  await prisma.location.update({
    where: { id },
    data,
  });

  return {};
}

/**
 * 場所を削除
 */
export async function deleteLocation(locationId: string): Promise<void> {
  const session = await auth();
  if (!session) {
    throw new Error("認証が必要です");
  }

  await prisma.location.delete({
    where: { id: locationId },
  });
}

/**
 * 全場所を取得
 */
export async function getLocations(): Promise<
  Array<{
    id: string;
    name: string;
    address: string | null;
    lat: number;
    lng: number;
    type: string;
  }>
> {
  const session = await auth();
  if (!session) {
    return [];
  }

  return prisma.location.findMany({
    orderBy: { name: "asc" },
  });
}
