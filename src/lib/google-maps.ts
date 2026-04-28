import type { VehicleClass } from "./schemas/vehicle";

// 車種別の高速料金係数（普通車レートを基準とする）
export const VEHICLE_CLASS_MULTIPLIER: Record<VehicleClass, number> = {
  LIGHT: 0.80,
  STANDARD: 1.00,
  MEDIUM: 1.20,
  LARGE: 1.65,
  EXTRA: 2.75,
};

interface RouteResult {
  distanceKm: number;
  durationMinutes: number;
  tollJpy: number | null; // null = データ欠損、0 = 有料道路なし
}

/**
 * Google Routes API を使用して2点間の距離・所要時間・高速料金を計算
 *
 * @param departureTime 指定すると時間帯別 toll を考慮する
 * @param vehicleClass 車種区分（toll 係数計算に使用）
 * @param hasEtc ETC 搭載有無（ETC/現金料金の選択）
 */
export async function calculateDistance(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  departureTime?: Date,
  vehicleClass?: VehicleClass,
  hasEtc?: boolean
): Promise<RouteResult | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    console.warn("Google Maps API key is not configured");
    return null;
  }

  const fetchToll = departureTime !== undefined;

  try {
    const body: Record<string, unknown> = {
      origin: {
        location: { latLng: { latitude: origin.lat, longitude: origin.lng } },
      },
      destination: {
        location: { latLng: { latitude: destination.lat, longitude: destination.lng } },
      },
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_UNAWARE",
    };

    if (fetchToll) {
      body.extraComputations = ["TOLLS"];
      body.departureTime = departureTime.toISOString();
    }

    const fieldMask = fetchToll
      ? "routes.distanceMeters,routes.duration,routes.travelAdvisory.tollInfo"
      : "routes.distanceMeters,routes.duration";

    const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": fieldMask,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error("Routes API error:", response.status, await response.text());
      return null;
    }

    const data = await response.json();

    if (!Array.isArray(data.routes) || data.routes.length === 0) {
      console.warn("No routes found");
      return null;
    }

    const route = data.routes[0];
    const distanceMeters = route.distanceMeters ?? 0;
    const durationSeconds = parseInt(route.duration?.replace("s", "") ?? "0", 10);
    const distanceKm = Math.round((distanceMeters / 1000) * 10) / 10;
    const durationMinutes = Math.round(durationSeconds / 60);

    if (!fetchToll) {
      return { distanceKm, durationMinutes, tollJpy: 0 };
    }

    const tollJpy = extractTollJpy(route, vehicleClass ?? "STANDARD", hasEtc ?? true);
    return { distanceKm, durationMinutes, tollJpy };
  } catch (error) {
    console.error("Failed to calculate distance:", error);
    return null;
  }
}

/**
 * Routes API レスポンスから toll 料金を抽出し車種係数を適用する
 * - tollInfo なし → 0（有料道路なし）
 * - estimatedPrice 空配列 → null（データ欠損）
 * - JPY エントリあり → ETC: 最小値、現金: 最大値 に係数を掛けた値
 * - JPY エントリなし → null（データ欠損）
 */
function extractTollJpy(
  route: { travelAdvisory?: { tollInfo?: { estimatedPrice?: { currencyCode: string; units: string }[] } } },
  vehicleClass: VehicleClass,
  hasEtc: boolean
): number | null {
  const tollInfo = route.travelAdvisory?.tollInfo;

  if (!tollInfo) return 0;

  const prices = tollInfo.estimatedPrice;
  if (!prices || prices.length === 0) return null;

  const jpyPrices = prices
    .filter((p) => p.currencyCode === "JPY")
    .map((p) => parseInt(p.units, 10))
    .filter((n) => !isNaN(n));

  if (jpyPrices.length === 0) return null;

  const baseToll = hasEtc ? Math.min(...jpyPrices) : Math.max(...jpyPrices);
  return Math.round(baseToll * VEHICLE_CLASS_MULTIPLIER[vehicleClass]);
}
