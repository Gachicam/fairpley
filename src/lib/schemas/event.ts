import { z } from "zod";

export const createEventSchema = z
  .object({
    name: z.string().min(1, "イベント名は必須です").max(100),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "終了日は開始日以降にしてください",
    path: ["endDate"],
  });

export const updateEventSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().min(1, "イベント名は必須です").max(100),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    gasPricePerLiter: z.number().int().min(1).max(500).default(170),
    destinationId: z.string().uuid().nullable().optional(), // 目的地
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "終了日は開始日以降にしてください",
    path: ["endDate"],
  });

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
