import { z } from "zod";

export const vehicleTypeEnum = z.enum(["OWNED", "RENTAL", "CARSHARE"]);

export type VehicleType = z.infer<typeof vehicleTypeEnum>;

export const vehicleTypeLabels: Record<VehicleType, string> = {
  OWNED: "自家用車",
  RENTAL: "レンタカー",
  CARSHARE: "カーシェア",
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
