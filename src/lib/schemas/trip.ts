import { z } from "zod";

export const createTripSchema = z.object({
  eventId: z.string().uuid(),
  vehicleId: z.string().uuid(),
  fromId: z.string().uuid(),
  toId: z.string().uuid(),
  distance: z.number().min(0).max(10000).optional(),
  passengerIds: z.array(z.string().uuid()).min(1, "乗客を1人以上選択してください"),
});

export const updateTripSchema = z.object({
  id: z.string().uuid(),
  vehicleId: z.string().uuid(),
  fromId: z.string().uuid(),
  toId: z.string().uuid(),
  distance: z.number().min(0).max(10000).optional(),
  passengerIds: z.array(z.string().uuid()).min(1, "乗客を1人以上選択してください"),
});

export type CreateTripInput = z.infer<typeof createTripSchema>;
export type UpdateTripInput = z.infer<typeof updateTripSchema>;
