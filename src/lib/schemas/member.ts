import { z } from "zod";

export const addMemberSchema = z.object({
  eventId: z.string().uuid(),
  email: z.string().email("有効なメールアドレスを入力してください"),
  nickname: z.string().max(50).optional(),
});

export type AddMemberInput = z.infer<typeof addMemberSchema>;
