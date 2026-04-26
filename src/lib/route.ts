import { calculateDistance } from "./google-maps";
import { prisma } from "./prisma";

interface Location {
  lat: number;
  lng: number;
}

/**
 * 緯度経度を丸める（小数点4桁 ≒ 約11m精度）
 */
function roundCoord(value: number): number {
  return Math.round(value * 10000) / 10000;
}

// メモリ内キャッシュ（DBキャッシュが使えない場合のフォールバック）
const memoryCache = new Map<string, number>();

/**
 * DBキャッシュから距離を取得
 */
async function getDistanceFromDb(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): Promise<number | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = prisma as any;
    if (!db?.distanceCache) {
      return null;
    }

    const cached = await db.distanceCache.findUnique({
      where: {
        fromLat_fromLng_toLat_toLng: { fromLat, fromLng, toLat, toLng },
      },
    });

    if (cached) {
      return cached.distanceKm;
    }

    // 逆方向もチェック
    const reverseCached = await db.distanceCache.findUnique({
      where: {
        fromLat_fromLng_toLat_toLng: {
          fromLat: toLat,
          fromLng: toLng,
          toLat: fromLat,
          toLng: fromLng,
        },
      },
    });

    if (reverseCached) {
      return reverseCached.distanceKm;
    }

    return null;
  } catch {
    // DBキャッシュが使えない場合はnullを返す
    return null;
  }
}

/**
 * DBキャッシュに距離を保存
 */
async function saveDistanceToDb(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  distanceKm: number,
  durationMin: number
): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = prisma as any;
    if (!db?.distanceCache) {
      return;
    }

    await db.distanceCache.create({
      data: { fromLat, fromLng, toLat, toLng, distanceKm, durationMin },
    });
  } catch {
    // ユニーク制約違反や他のエラーは無視
  }
}

/**
 * 2点間の距離を取得（DB永続化キャッシュ付き）
 */
async function getDistance(from: Location, to: Location): Promise<number> {
  const fromLat = roundCoord(from.lat);
  const fromLng = roundCoord(from.lng);
  const toLat = roundCoord(to.lat);
  const toLng = roundCoord(to.lng);

  // メモリキャッシュのキー
  const cacheKey = `${fromLat},${fromLng}-${toLat},${toLng}`;
  const reverseCacheKey = `${toLat},${toLng}-${fromLat},${fromLng}`;

  // 1. メモリキャッシュを確認
  const memoryCached = memoryCache.get(cacheKey) ?? memoryCache.get(reverseCacheKey);
  if (memoryCached !== undefined) {
    return memoryCached;
  }

  // 2. DBキャッシュを確認
  const dbCached = await getDistanceFromDb(fromLat, fromLng, toLat, toLng);
  if (dbCached !== null) {
    memoryCache.set(cacheKey, dbCached);
    return dbCached;
  }

  // 3. API呼び出し
  const result = await calculateDistance(from, to);
  const distanceKm = result?.distanceKm ?? 0;
  const durationMin = result?.durationMinutes ?? 0;

  // 4. キャッシュに保存
  memoryCache.set(cacheKey, distanceKm);
  await saveDistanceToDb(fromLat, fromLng, toLat, toLng, distanceKm, durationMin);

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
