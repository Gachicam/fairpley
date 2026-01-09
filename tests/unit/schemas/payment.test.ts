import { describe, it, expect } from "vitest";
import { createPaymentSchema, updatePaymentSchema } from "@/lib/schemas/payment";

describe("createPaymentSchema", () => {
  const validInput = {
    eventId: "123e4567-e89b-12d3-a456-426614174000",
    payerId: "123e4567-e89b-12d3-a456-426614174003",
    amount: 5000,
    description: "食材費",
    beneficiaryIds: [
      "123e4567-e89b-12d3-a456-426614174001",
      "123e4567-e89b-12d3-a456-426614174002",
    ],
  };

  describe("正常系", () => {
    it("有効な入力を受け入れる", () => {
      const result = createPaymentSchema.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.amount).toBe(5000);
        expect(result.data.description).toBe("食材費");
        expect(result.data.beneficiaryIds).toHaveLength(2);
      }
    });

    it("金額1円を受け入れる", () => {
      const result = createPaymentSchema.safeParse({
        ...validInput,
        amount: 1,
      });
      expect(result.success).toBe(true);
    });

    it("金額10,000,000円を受け入れる", () => {
      const result = createPaymentSchema.safeParse({
        ...validInput,
        amount: 10000000,
      });
      expect(result.success).toBe(true);
    });

    it("受益者1人を受け入れる", () => {
      const result = createPaymentSchema.safeParse({
        ...validInput,
        beneficiaryIds: ["123e4567-e89b-12d3-a456-426614174001"],
      });
      expect(result.success).toBe(true);
    });
  });

  describe("異常系", () => {
    it("イベントIDが無効なUUIDの場合はエラー", () => {
      const result = createPaymentSchema.safeParse({
        ...validInput,
        eventId: "invalid-uuid",
      });
      expect(result.success).toBe(false);
    });

    it("金額が0の場合はエラー", () => {
      const result = createPaymentSchema.safeParse({
        ...validInput,
        amount: 0,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.amount).toContain(
          "金額は1円以上で入力してください"
        );
      }
    });

    it("金額がマイナスの場合はエラー", () => {
      const result = createPaymentSchema.safeParse({
        ...validInput,
        amount: -100,
      });
      expect(result.success).toBe(false);
    });

    it("金額が10,000,001円を超える場合はエラー", () => {
      const result = createPaymentSchema.safeParse({
        ...validInput,
        amount: 10000001,
      });
      expect(result.success).toBe(false);
    });

    it("説明が空の場合はエラー", () => {
      const result = createPaymentSchema.safeParse({
        ...validInput,
        description: "",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.description).toContain("説明は必須です");
      }
    });

    it("説明が200文字を超える場合はエラー", () => {
      const result = createPaymentSchema.safeParse({
        ...validInput,
        description: "あ".repeat(201),
      });
      expect(result.success).toBe(false);
    });

    it("受益者が0人の場合はエラー", () => {
      const result = createPaymentSchema.safeParse({
        ...validInput,
        beneficiaryIds: [],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.beneficiaryIds).toContain(
          "受益者を1人以上選択してください"
        );
      }
    });

    it("受益者IDが無効なUUIDの場合はエラー", () => {
      const result = createPaymentSchema.safeParse({
        ...validInput,
        beneficiaryIds: ["invalid-uuid"],
      });
      expect(result.success).toBe(false);
    });
  });
});

describe("updatePaymentSchema", () => {
  const validInput = {
    id: "123e4567-e89b-12d3-a456-426614174000",
    payerId: "123e4567-e89b-12d3-a456-426614174003",
    amount: 3000,
    description: "更新された説明",
    beneficiaryIds: ["123e4567-e89b-12d3-a456-426614174001"],
  };

  describe("正常系", () => {
    it("有効な入力を受け入れる", () => {
      const result = updatePaymentSchema.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(validInput.id);
        expect(result.data.amount).toBe(3000);
      }
    });
  });

  describe("異常系", () => {
    it("IDが無効なUUIDの場合はエラー", () => {
      const result = updatePaymentSchema.safeParse({
        ...validInput,
        id: "invalid-uuid",
      });
      expect(result.success).toBe(false);
    });

    it("金額が0の場合はエラー", () => {
      const result = updatePaymentSchema.safeParse({
        ...validInput,
        amount: 0,
      });
      expect(result.success).toBe(false);
    });
  });
});
