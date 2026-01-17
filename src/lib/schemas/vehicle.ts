import { z } from "zod";

export const vehicleTypeEnum = z.enum(["OWNED", "RENTAL", "CARSHARE", "BIKE"]);

export type VehicleType = z.infer<typeof vehicleTypeEnum>;

export const vehicleTypeLabels: Record<VehicleType, string> = {
  OWNED: "自家用車",
  RENTAL: "レンタカー",
  CARSHARE: "カーシェア",
  BIKE: "バイク",
};

export const createVehicleSchema = z.object({
  eventId: z.string().uuid(),
  name: z.string().min(1, "車名は必須です").max(100),
  type: vehicleTypeEnum,
  ownerId: z.string().uuid().optional(),
  capacity: z.number().int().min(1, "定員は1人以上にしてください").max(20),
  fuelEfficiency: z.number().min(1).max(50).optional(),
});

export const updateVehicleSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "車名は必須です").max(100),
  type: vehicleTypeEnum,
  ownerId: z.string().uuid().optional(),
  capacity: z.number().int().min(1, "定員は1人以上にしてください").max(20),
  fuelEfficiency: z.number().min(1).max(50).optional(),
});

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;

// グローバル車両用スキーマ（eventId不要）
export const createGlobalVehicleSchema = z.object({
  name: z.string().min(1, "車名は必須です").max(100),
  type: vehicleTypeEnum,
  capacity: z.number().int().min(1, "定員は1人以上にしてください").max(20),
  fuelEfficiency: z.number().min(1).max(50).optional(),
});

export const updateGlobalVehicleSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "車名は必須です").max(100),
  type: vehicleTypeEnum,
  capacity: z.number().int().min(1, "定員は1人以上にしてください").max(20),
  fuelEfficiency: z.number().min(1).max(50).optional(),
});

export type CreateGlobalVehicleInput = z.infer<typeof createGlobalVehicleSchema>;
export type UpdateGlobalVehicleInput = z.infer<typeof updateGlobalVehicleSchema>;
