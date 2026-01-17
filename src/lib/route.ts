import { calculateDistance } from "./google-maps";

interface Location {
  lat: number;
  lng: number;
}

/**
 * 2点間の距離をキャッシュするためのMap
 * キー: `${lat1},${lng1}-${lat2},${lng2}`
 */
const distanceCache = new Map<string, number>();

/**
 * 2点間の距離を取得（キャッシュ付き）
 */
async function getDistance(from: Location, to: Location): Promise<number> {
  const cacheKey = `${from.lat},${from.lng}-${to.lat},${to.lng}`;
  const reverseCacheKey = `${to.lat},${to.lng}-${from.lat},${from.lng}`;

  // キャッシュチェック
  const cached = distanceCache.get(cacheKey) ?? distanceCache.get(reverseCacheKey);
  if (cached !== undefined) {
    return cached;
  }

  // API呼び出し
  const result = await calculateDistance(from, to);
  const distanceKm = result?.distanceKm ?? 0;

  // キャッシュに保存
  distanceCache.set(cacheKey, distanceKm);

  return distanceKm;
}

/**
 * 出発地リストと目的地から最短ルートの総距離を計算
 * 最寄り法（Nearest Neighbor）で巡回セールスマン問題を近似解決
 *
 * @param departures 各参加者の出発地リスト
 * @param destination 目的地（キャンプ場など）
 * @returns 総距離（km）
 */
export async function calculateOptimalRoute(
  departures: Location[],
  destination: Location
): Promise<number> {
  if (departures.length === 0) return 0;

  if (departures.length === 1) {
    // 1人の場合: 出発地 → 目的地 → 出発地（往復）
    const oneWay = await getDistance(departures[0], destination);
    return oneWay * 2;
  }

  // 複数人の場合: 最寄り法（Nearest Neighbor）で近似
  // 全地点 = 出発地リスト + 目的地
  const allPoints = [...departures, destination];

  const visited = new Set<number>();
  let current = 0; // 最初の出発地から開始
  let totalDistance = 0;
  visited.add(0);

  // 全地点を訪問するまで繰り返す
  while (visited.size < allPoints.length) {
    let nearestIdx = -1;
    let nearestDist = Infinity;

    for (let i = 0; i < allPoints.length; i++) {
      if (visited.has(i)) continue;

      const dist = await getDistance(allPoints[current], allPoints[i]);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = i;
      }
    }

    if (nearestIdx === -1) break;

    totalDistance += nearestDist;
    visited.add(nearestIdx);
    current = nearestIdx;
  }

  // 目的地から最初の出発地に戻る（往復）
  const returnDist = await getDistance(allPoints[current], departures[0]);
  totalDistance += returnDist;

  return totalDistance;
}

/**
 * 距離キャッシュをクリア
 */
export function clearDistanceCache(): void {
  distanceCache.clear();
}
