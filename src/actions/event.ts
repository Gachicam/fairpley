"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createEventSchema, updateEventSchema } from "@/lib/schemas/event";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

interface ActionResult {
  error?: Record<string, string[]>;
}

/** HH:MM 文字列を分（0-1439）に変換。無効な場合は null */
function timeStringToMinutes(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || !value) return null;
  const [h, m] = value.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  const minutes = h * 60 + m;
  if (minutes < 0 || minutes > 1439) return null;
  return minutes;
}

export async function createEvent(formData: FormData): Promise<ActionResult | never> {
  const session = await auth();
  if (!session) throw new Error("認証が必要です");

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
      members: { create: { userId: session.user.id } },
    },
  });

  revalidatePath("/");
  redirect(`/events/${event.id}`);
}

export async function updateEvent(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session) throw new Error("認証が必要です");

  const gasPriceRaw = formData.get("gasPricePerLiter");
  const gasPricePerLiter = typeof gasPriceRaw === "string" ? parseInt(gasPriceRaw, 10) : 170;
  const destinationIdRaw = formData.get("destinationId");
  const destinationId =
    typeof destinationIdRaw === "string" && destinationIdRaw && destinationIdRaw !== "none"
      ? destinationIdRaw
      : null;

  const outboundDateRaw = formData.get("outboundDate");
  const returnDateRaw = formData.get("returnDate");

  const validatedFields = updateEventSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    gasPricePerLiter: isNaN(gasPricePerLiter) ? 170 : gasPricePerLiter,
    destinationId,
    outboundDate:
      typeof outboundDateRaw === "string" && outboundDateRaw ? outboundDateRaw : null,
    returnDate:
      typeof returnDateRaw === "string" && returnDateRaw ? returnDateRaw : null,
    checkinTime: timeStringToMinutes(formData.get("checkinTime")),
    checkoutTime: timeStringToMinutes(formData.get("checkoutTime")),
  });

  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors };
  }

  const { id, ...data } = validatedFields.data;

  const event = await prisma.event.findUnique({
    where: { id },
    select: { ownerId: true },
  });

  if (event?.ownerId !== session.user.id) {
    throw new Error("イベントの更新権限がありません");
  }

  await prisma.event.update({ where: { id }, data });

  revalidatePath(`/events/${id}`);
  return {};
}

export async function deleteEvent(eventId: string): Promise<never> {
  const session = await auth();
  if (!session) throw new Error("認証が必要です");

  if (session.user.role !== "ADMIN") {
    throw new Error("イベントの削除権限がありません");
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true },
  });

  if (!event) throw new Error("イベントが見つかりません");

  await prisma.event.delete({ where: { id: eventId } });

  revalidatePath("/");
  redirect("/");
}
