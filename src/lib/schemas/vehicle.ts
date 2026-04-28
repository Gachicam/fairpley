import { z } from "zod";

export const vehicleTypeEnum = z.enum(["OWNED", "RENTAL", "CARSHARE", "BIKE"]);
export const vehicleClassEnum = z.enum(["LIGHT", "STANDARD", "MEDIUM", "LARGE", "EXTRA"]);

export type VehicleType = z.infer<typeof vehicleTypeEnum>;
export type VehicleClass = z.infer<typeof vehicleClassEnum>;

export const vehicleTypeLabels: Record<VehicleType, string> = {
  OWNED: "自家用車",
  RENTAL: "レンタカー",
  CARSHARE: "カーシェア",
  BIKE: "バイク",
};

export const vehicleClassLabels: Record<VehicleClass, string> = {
  LIGHT: "軽自動車・二輪車",
  STANDARD: "普通車",
  MEDIUM: "中型車",
  LARGE: "大型車",
  EXTRA: "特大車",
};

const vehicleBaseFields = {
  name: z.string().min(1, "車名は必須です").max(100),
  type: vehicleTypeEnum,
  vehicleClass: vehicleClassEnum.default("STANDARD"),
  hasEtc: z.boolean().default(true),
  capacity: z.number().int().min(1, "定員は1人以上にしてください").max(20),
  fuelEfficiency: z.number().min(1).max(50).optional(),
};

export const createVehicleSchema = z.object({
  eventId: z.string().uuid(),
  ownerId: z.string().uuid().optional(),
  ...vehicleBaseFields,
});

export const updateVehicleSchema = z.object({
  id: z.string().uuid(),
  ownerId: z.string().uuid().optional(),
  ...vehicleBaseFields,
});

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;

export const createGlobalVehicleSchema = z.object(vehicleBaseFields);
export const updateGlobalVehicleSchema = z.object({
  id: z.string().uuid(),
  ...vehicleBaseFields,
});

export type CreateGlobalVehicleInput = z.infer<typeof createGlobalVehicleSchema>;
export type UpdateGlobalVehicleInput = z.infer<typeof updateGlobalVehicleSchema>;
