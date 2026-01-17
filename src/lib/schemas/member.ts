import { z } from "zod";

export const addMemberSchema = z.object({
  eventId: z.string().uuid(),
  email: z.string().email("有効なメールアドレスを入力してください"),
  nickname: z.string().max(50).optional(),
});

export const addMemberByUserIdSchema = z.object({
  eventId: z.string().uuid(),
  userId: z.string().uuid(),
  nickname: z.string().max(50).optional(),
});

export const updateDepartureLocationSchema = z.object({
  memberId: z.string().uuid(),
  eventId: z.string().uuid(),
  departureLocationId: z.string().uuid().nullable(),
});

export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type AddMemberByUserIdInput = z.infer<typeof addMemberByUserIdSchema>;
export type UpdateDepartureLocationInput = z.infer<typeof updateDepartureLocationSchema>;
