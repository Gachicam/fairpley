import { describe, it, expect } from "vitest";
import { createTripSchema, updateTripSchema } from "@/lib/schemas/trip";

describe("createTripSchema", () => {
  const validInput = {
    eventId: "123e4567-e89b-12d3-a456-426614174000",
    vehicleId: "123e4567-e89b-12d3-a456-426614174001",
    fromId: "123e4567-e89b-12d3-a456-426614174002",
    toId: "123e4567-e89b-12d3-a456-426614174003",
    passengerIds: [
      "123e4567-e89b-12d3-a456-426614174004",
      "123e4567-e89b-12d3-a456-426614174005",
    ],
  };

  describe("正常系", () => {
    it("有効な入力を受け入れる", () => {
      const result = createTripSchema.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.eventId).toBe(validInput.eventId);
        expect(result.data.vehicleId).toBe(validInput.vehicleId);
        expect(result.data.fromId).toBe(validInput.fromId);
        expect(result.data.toId).toBe(validInput.toId);
        expect(result.data.passengerIds).toHaveLength(2);
      }
    });

    it("距離付きで受け入れる", () => {
      const result = createTripSchema.safeParse({
        ...validInput,
        distance: 50.5,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.distance).toBe(50.5);
      }
    });

    it("乗客1人で受け入れる", () => {
      const result = createTripSchema.safeParse({
        ...validInput,
        passengerIds: ["123e4567-e89b-12d3-a456-426614174004"],
      });
      expect(result.success).toBe(true);
    });

    it("距離0kmを受け入れる", () => {
      const result = createTripSchema.safeParse({
        ...validInput,
        distance: 0,
      });
      expect(result.success).toBe(true);
    });

    it("距離10000kmを受け入れる", () => {
      const result = createTripSchema.safeParse({
        ...validInput,
        distance: 10000,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("異常系", () => {
    it("イベントIDが無効なUUIDの場合はエラー", () => {
      const result = createTripSchema.safeParse({
        ...validInput,
        eventId: "invalid-uuid",
      });
      expect(result.success).toBe(false);
    });

    it("車両IDが無効なUUIDの場合はエラー", () => {
      const result = createTripSchema.safeParse({
        ...validInput,
        vehicleId: "invalid-uuid",
      });
      expect(result.success).toBe(false);
    });

    it("出発地IDが無効なUUIDの場合はエラー", () => {
      const result = createTripSchema.safeParse({
        ...validInput,
        fromId: "invalid-uuid",
      });
      expect(result.success).toBe(false);
    });

    it("到着地IDが無効なUUIDの場合はエラー", () => {
      const result = createTripSchema.safeParse({
        ...validInput,
        toId: "invalid-uuid",
      });
      expect(result.success).toBe(false);
    });

    it("乗客が0人の場合はエラー", () => {
      const result = createTripSchema.safeParse({
        ...validInput,
        passengerIds: [],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.passengerIds).toContain(
          "乗客を1人以上選択してください"
        );
      }
    });

    it("乗客IDが無効なUUIDの場合はエラー", () => {
      const result = createTripSchema.safeParse({
        ...validInput,
        passengerIds: ["invalid-uuid"],
      });
      expect(result.success).toBe(false);
    });

    it("距離がマイナスの場合はエラー", () => {
      const result = createTripSchema.safeParse({
        ...validInput,
        distance: -1,
      });
      expect(result.success).toBe(false);
    });

    it("距離が10000kmを超える場合はエラー", () => {
      const result = createTripSchema.safeParse({
        ...validInput,
        distance: 10001,
      });
      expect(result.success).toBe(false);
    });
  });
});

describe("updateTripSchema", () => {
  const validInput = {
    id: "123e4567-e89b-12d3-a456-426614174000",
    vehicleId: "123e4567-e89b-12d3-a456-426614174001",
    fromId: "123e4567-e89b-12d3-a456-426614174002",
    toId: "123e4567-e89b-12d3-a456-426614174003",
    passengerIds: ["123e4567-e89b-12d3-a456-426614174004"],
  };

  describe("正常系", () => {
    it("有効な入力を受け入れる", () => {
      const result = updateTripSchema.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(validInput.id);
      }
    });
  });

  describe("異常系", () => {
    it("IDが無効なUUIDの場合はエラー", () => {
      const result = updateTripSchema.safeParse({
        ...validInput,
        id: "invalid-uuid",
      });
      expect(result.success).toBe(false);
    });
  });
});
