import { describe, it, expect } from "vitest";
import {
  createLocationSchema,
  updateLocationSchema,
  locationTypeEnum,
} from "@/lib/schemas/location";

describe("locationTypeEnum", () => {
  it("有効なタイプを受け入れる", () => {
    const validTypes = ["HOME", "CAMPSITE", "STORE", "OTHER"];
    for (const type of validTypes) {
      const result = locationTypeEnum.safeParse(type);
      expect(result.success).toBe(true);
    }
  });

  it("無効なタイプを拒否する", () => {
    const result = locationTypeEnum.safeParse("INVALID");
    expect(result.success).toBe(false);
  });
});

describe("createLocationSchema", () => {
  const validInput = {
    name: "キャンプ場A",
    lat: 35.6762,
    lng: 139.6503,
    type: "CAMPSITE",
  };

  describe("正常系", () => {
    it("有効な入力を受け入れる", () => {
      const result = createLocationSchema.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("キャンプ場A");
        expect(result.data.lat).toBe(35.6762);
        expect(result.data.lng).toBe(139.6503);
        expect(result.data.type).toBe("CAMPSITE");
      }
    });

    it("住所付きで受け入れる", () => {
      const result = createLocationSchema.safeParse({
        ...validInput,
        address: "東京都渋谷区1-1-1",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.address).toBe("東京都渋谷区1-1-1");
      }
    });

    it("全タイプを受け入れる", () => {
      const types = ["HOME", "CAMPSITE", "STORE", "OTHER"];
      for (const type of types) {
        const result = createLocationSchema.safeParse({
          ...validInput,
          type,
        });
        expect(result.success).toBe(true);
      }
    });

    it("緯度の境界値を受け入れる", () => {
      const result1 = createLocationSchema.safeParse({
        ...validInput,
        lat: -90,
      });
      expect(result1.success).toBe(true);

      const result2 = createLocationSchema.safeParse({
        ...validInput,
        lat: 90,
      });
      expect(result2.success).toBe(true);
    });

    it("経度の境界値を受け入れる", () => {
      const result1 = createLocationSchema.safeParse({
        ...validInput,
        lng: -180,
      });
      expect(result1.success).toBe(true);

      const result2 = createLocationSchema.safeParse({
        ...validInput,
        lng: 180,
      });
      expect(result2.success).toBe(true);
    });
  });

  describe("異常系", () => {
    it("名前が空の場合はエラー", () => {
      const result = createLocationSchema.safeParse({
        ...validInput,
        name: "",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.name).toContain("名前は必須です");
      }
    });

    it("名前が100文字を超える場合はエラー", () => {
      const result = createLocationSchema.safeParse({
        ...validInput,
        name: "あ".repeat(101),
      });
      expect(result.success).toBe(false);
    });

    it("緯度が-90未満の場合はエラー", () => {
      const result = createLocationSchema.safeParse({
        ...validInput,
        lat: -91,
      });
      expect(result.success).toBe(false);
    });

    it("緯度が90を超える場合はエラー", () => {
      const result = createLocationSchema.safeParse({
        ...validInput,
        lat: 91,
      });
      expect(result.success).toBe(false);
    });

    it("経度が-180未満の場合はエラー", () => {
      const result = createLocationSchema.safeParse({
        ...validInput,
        lng: -181,
      });
      expect(result.success).toBe(false);
    });

    it("経度が180を超える場合はエラー", () => {
      const result = createLocationSchema.safeParse({
        ...validInput,
        lng: 181,
      });
      expect(result.success).toBe(false);
    });

    it("無効なタイプの場合はエラー", () => {
      const result = createLocationSchema.safeParse({
        ...validInput,
        type: "INVALID",
      });
      expect(result.success).toBe(false);
    });
  });
});

describe("updateLocationSchema", () => {
  const validInput = {
    id: "123e4567-e89b-12d3-a456-426614174000",
    name: "更新されたキャンプ場",
    lat: 36.0,
    lng: 140.0,
    type: "CAMPSITE",
  };

  describe("正常系", () => {
    it("有効な入力を受け入れる", () => {
      const result = updateLocationSchema.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(validInput.id);
      }
    });
  });

  describe("異常系", () => {
    it("IDが無効なUUIDの場合はエラー", () => {
      const result = updateLocationSchema.safeParse({
        ...validInput,
        id: "invalid-uuid",
      });
      expect(result.success).toBe(false);
    });
  });
});
