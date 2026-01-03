import { describe, it, expect } from "vitest";
import {
  createVehicleSchema,
  updateVehicleSchema,
  vehicleTypeEnum,
} from "@/lib/schemas/vehicle";

describe("vehicleTypeEnum", () => {
  it("有効なタイプを受け入れる", () => {
    const validTypes = ["OWNED", "RENTAL", "CARSHARE"];
    for (const type of validTypes) {
      const result = vehicleTypeEnum.safeParse(type);
      expect(result.success).toBe(true);
    }
  });

  it("無効なタイプを拒否する", () => {
    const result = vehicleTypeEnum.safeParse("INVALID");
    expect(result.success).toBe(false);
  });
});

describe("createVehicleSchema", () => {
  const validInput = {
    eventId: "123e4567-e89b-12d3-a456-426614174000",
    name: "プリウス",
    type: "OWNED",
    capacity: 5,
  };

  describe("正常系", () => {
    it("有効な入力を受け入れる", () => {
      const result = createVehicleSchema.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("プリウス");
        expect(result.data.type).toBe("OWNED");
        expect(result.data.capacity).toBe(5);
      }
    });

    it("オーナーID付きで受け入れる", () => {
      const result = createVehicleSchema.safeParse({
        ...validInput,
        ownerId: "123e4567-e89b-12d3-a456-426614174001",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.ownerId).toBe("123e4567-e89b-12d3-a456-426614174001");
      }
    });

    it("燃費付きで受け入れる", () => {
      const result = createVehicleSchema.safeParse({
        ...validInput,
        fuelEfficiency: 20.5,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.fuelEfficiency).toBe(20.5);
      }
    });

    it("全タイプを受け入れる", () => {
      const types = ["OWNED", "RENTAL", "CARSHARE"];
      for (const type of types) {
        const result = createVehicleSchema.safeParse({
          ...validInput,
          type,
        });
        expect(result.success).toBe(true);
      }
    });

    it("定員1人を受け入れる", () => {
      const result = createVehicleSchema.safeParse({
        ...validInput,
        capacity: 1,
      });
      expect(result.success).toBe(true);
    });

    it("定員20人を受け入れる", () => {
      const result = createVehicleSchema.safeParse({
        ...validInput,
        capacity: 20,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("異常系", () => {
    it("イベントIDが無効なUUIDの場合はエラー", () => {
      const result = createVehicleSchema.safeParse({
        ...validInput,
        eventId: "invalid-uuid",
      });
      expect(result.success).toBe(false);
    });

    it("名前が空の場合はエラー", () => {
      const result = createVehicleSchema.safeParse({
        ...validInput,
        name: "",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.name).toContain("車名は必須です");
      }
    });

    it("名前が100文字を超える場合はエラー", () => {
      const result = createVehicleSchema.safeParse({
        ...validInput,
        name: "あ".repeat(101),
      });
      expect(result.success).toBe(false);
    });

    it("定員が0の場合はエラー", () => {
      const result = createVehicleSchema.safeParse({
        ...validInput,
        capacity: 0,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.capacity).toContain(
          "定員は1人以上にしてください"
        );
      }
    });

    it("定員が21人の場合はエラー", () => {
      const result = createVehicleSchema.safeParse({
        ...validInput,
        capacity: 21,
      });
      expect(result.success).toBe(false);
    });

    it("燃費が1未満の場合はエラー", () => {
      const result = createVehicleSchema.safeParse({
        ...validInput,
        fuelEfficiency: 0.5,
      });
      expect(result.success).toBe(false);
    });

    it("燃費が50を超える場合はエラー", () => {
      const result = createVehicleSchema.safeParse({
        ...validInput,
        fuelEfficiency: 51,
      });
      expect(result.success).toBe(false);
    });

    it("無効なタイプの場合はエラー", () => {
      const result = createVehicleSchema.safeParse({
        ...validInput,
        type: "INVALID",
      });
      expect(result.success).toBe(false);
    });

    it("オーナーIDが無効なUUIDの場合はエラー", () => {
      const result = createVehicleSchema.safeParse({
        ...validInput,
        ownerId: "invalid-uuid",
      });
      expect(result.success).toBe(false);
    });
  });
});

describe("updateVehicleSchema", () => {
  const validInput = {
    id: "123e4567-e89b-12d3-a456-426614174000",
    name: "アクア",
    type: "RENTAL",
    capacity: 4,
  };

  describe("正常系", () => {
    it("有効な入力を受け入れる", () => {
      const result = updateVehicleSchema.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(validInput.id);
      }
    });
  });

  describe("異常系", () => {
    it("IDが無効なUUIDの場合はエラー", () => {
      const result = updateVehicleSchema.safeParse({
        ...validInput,
        id: "invalid-uuid",
      });
      expect(result.success).toBe(false);
    });
  });
});
