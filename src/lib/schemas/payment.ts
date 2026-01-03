import { z } from "zod";

export const paymentCategoryEnum = z.enum(["FOOD", "TRANSPORT", "LODGING", "EQUIPMENT", "OTHER"]);

export type PaymentCategory = z.infer<typeof paymentCategoryEnum>;

export const paymentCategoryLabels: Record<PaymentCategory, string> = {
  FOOD: "食費",
  TRANSPORT: "交通費",
  LODGING: "宿泊費",
  EQUIPMENT: "装備・道具",
  OTHER: "その他",
};

export const createPaymentSchema = z.object({
  eventId: z.string().uuid(),
  amount: z.number().int().min(1, "金額は1円以上で入力してください").max(10000000),
  description: z.string().min(1, "説明は必須です").max(200),
  category: paymentCategoryEnum,
  beneficiaryIds: z.array(z.string().uuid()).min(1, "受益者を1人以上選択してください"),
});

export const updatePaymentSchema = z.object({
  id: z.string().uuid(),
  amount: z.number().int().min(1, "金額は1円以上で入力してください").max(10000000),
  description: z.string().min(1, "説明は必須です").max(200),
  category: paymentCategoryEnum,
  beneficiaryIds: z.array(z.string().uuid()).min(1, "受益者を1人以上選択してください"),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;
