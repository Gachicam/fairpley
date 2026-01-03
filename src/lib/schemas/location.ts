import { z } from "zod";

export const locationTypeEnum = z.enum(["HOME", "CAMPSITE", "STORE", "OTHER"]);

export type LocationType = z.infer<typeof locationTypeEnum>;

export const locationTypeLabels: Record<LocationType, string> = {
  HOME: "自宅（集合場所）",
  CAMPSITE: "キャンプ場",
  STORE: "店舗（買い出し）",
  OTHER: "その他",
};

export const createLocationSchema = z.object({
  name: z.string().min(1, "名前は必須です").max(100),
  address: z.string().max(200).optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  type: locationTypeEnum,
});

export const updateLocationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "名前は必須です").max(100),
  address: z.string().max(200).optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  type: locationTypeEnum,
});

export type CreateLocationInput = z.infer<typeof createLocationSchema>;
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;
