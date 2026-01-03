import { describe, it, expect } from "vitest";
import { createEventSchema, updateEventSchema } from "@/lib/schemas/event";

describe("createEventSchema", () => {
  const validInput = {
    name: "夏キャンプ2024",
    startDate: "2024-08-01",
    endDate: "2024-08-03",
  };

  describe("正常系", () => {
    it("有効な入力を受け入れる", () => {
      const result = createEventSchema.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("夏キャンプ2024");
        expect(result.data.startDate).toBeInstanceOf(Date);
        expect(result.data.endDate).toBeInstanceOf(Date);
      }
    });

    it("開始日と終了日が同じでも受け入れる", () => {
      const result = createEventSchema.safeParse({
        ...validInput,
        endDate: validInput.startDate,
      });
      expect(result.success).toBe(true);
    });

    it("Date オブジェクトも受け入れる", () => {
      const result = createEventSchema.safeParse({
        name: "キャンプ",
        startDate: new Date("2024-08-01"),
        endDate: new Date("2024-08-03"),
      });
      expect(result.success).toBe(true);
    });
  });

  describe("異常系", () => {
    it("イベント名が空の場合はエラー", () => {
      const result = createEventSchema.safeParse({
        ...validInput,
        name: "",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.name).toContain(
          "イベント名は必須です"
        );
      }
    });

    it("イベント名が100文字を超える場合はエラー", () => {
      const result = createEventSchema.safeParse({
        ...validInput,
        name: "a".repeat(101),
      });
      expect(result.success).toBe(false);
    });

    it("終了日が開始日より前の場合はエラー", () => {
      const result = createEventSchema.safeParse({
        ...validInput,
        startDate: "2024-08-03",
        endDate: "2024-08-01",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.endDate).toContain(
          "終了日は開始日以降にしてください"
        );
      }
    });

    it("開始日が無効な日付の場合はエラー", () => {
      const result = createEventSchema.safeParse({
        ...validInput,
        startDate: "invalid-date",
      });
      expect(result.success).toBe(false);
    });
  });
});

describe("updateEventSchema", () => {
  const validInput = {
    id: "123e4567-e89b-12d3-a456-426614174000",
    name: "秋キャンプ2024",
    startDate: "2024-10-01",
    endDate: "2024-10-03",
    gasPricePerLiter: 170,
  };

  describe("正常系", () => {
    it("有効な入力を受け入れる", () => {
      const result = updateEventSchema.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(validInput.id);
        expect(result.data.name).toBe("秋キャンプ2024");
        expect(result.data.gasPricePerLiter).toBe(170);
      }
    });

    it("ガソリン単価が1〜500の範囲で受け入れる", () => {
      const result1 = updateEventSchema.safeParse({
        ...validInput,
        gasPricePerLiter: 1,
      });
      expect(result1.success).toBe(true);

      const result2 = updateEventSchema.safeParse({
        ...validInput,
        gasPricePerLiter: 500,
      });
      expect(result2.success).toBe(true);
    });

    it("ガソリン単価がない場合はデフォルト値170", () => {
      const { gasPricePerLiter: _, ...inputWithoutGasPrice } = validInput;
      const result = updateEventSchema.safeParse(inputWithoutGasPrice);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.gasPricePerLiter).toBe(170);
      }
    });
  });

  describe("異常系", () => {
    it("IDが無効なUUIDの場合はエラー", () => {
      const result = updateEventSchema.safeParse({
        ...validInput,
        id: "invalid-uuid",
      });
      expect(result.success).toBe(false);
    });

    it("ガソリン単価が0の場合はエラー", () => {
      const result = updateEventSchema.safeParse({
        ...validInput,
        gasPricePerLiter: 0,
      });
      expect(result.success).toBe(false);
    });

    it("ガソリン単価が501の場合はエラー", () => {
      const result = updateEventSchema.safeParse({
        ...validInput,
        gasPricePerLiter: 501,
      });
      expect(result.success).toBe(false);
    });

    it("ガソリン単価が小数の場合はエラー", () => {
      const result = updateEventSchema.safeParse({
        ...validInput,
        gasPricePerLiter: 170.5,
      });
      expect(result.success).toBe(false);
    });

    it("終了日が開始日より前の場合はエラー", () => {
      const result = updateEventSchema.safeParse({
        ...validInput,
        startDate: "2024-10-03",
        endDate: "2024-10-01",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.endDate).toContain(
          "終了日は開始日以降にしてください"
        );
      }
    });
  });
});
