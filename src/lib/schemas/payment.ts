import { z } from "zod";

export const createPaymentSchema = z.object({
  eventId: z.string().uuid(),
  payerId: z.string().uuid(),
  amount: z.number().int().min(1, "金額は1円以上で入力してください").max(10000000),
  description: z.string().min(1, "説明は必須です").max(200),
  beneficiaryIds: z.array(z.string().uuid()).min(1, "受益者を1人以上選択してください"),
});

export const updatePaymentSchema = z.object({
  id: z.string().uuid(),
  payerId: z.string().uuid(),
  amount: z.number().int().min(1, "金額は1円以上で入力してください").max(10000000),
  description: z.string().min(1, "説明は必須です").max(200),
  beneficiaryIds: z.array(z.string().uuid()).min(1, "受益者を1人以上選択してください"),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;
