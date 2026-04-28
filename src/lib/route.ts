import { calculateDistance } from "./google-maps";
import type { VehicleClass } from "./schemas/vehicle";

interface Location {
  lat: number;
  lng: number;
}

interface DistanceDuration {
  distanceKm: number;
  durationMinutes: number;
}

// 距離・所要時間キャッシュ（時刻非依存）
// キー: `${lat1},${lng1}-${lat2},${lng2}`（双方向共通）
const distanceCache = new Map<string, DistanceDuration>();

// toll キャッシュ（時刻・車種・ETC 依存）
// キー: `${lat1},${lng1}-${lat2},${lng2}-${tollPeriod}-${vehicleClass}-${hasEtc}`
const tollCache = new Map<string, number | null>();

// ============================================
// ETC 割引期間区分
// ============================================

type TollPeriod = "MIDNIGHT" | "HOLIDAY_DAY" | "WEEKDAY_RUSH" | "NORMAL";

const JAPANESE_HOLIDAY_MONTHS_DAYS = new Set([
  "1-1", "1-2", "1-3", // 元日・三が日
  "2-11", "2-23",       // 建国記念・天皇誕生日
  "3-20",               // 春分（近似）
  "4-29",               // 昭和の日
  "5-3", "5-4", "5-5",  // ゴールデンウィーク
  "7-15",               // 海の日（第3月曜、近似）
  "8-11",               // 山の日
  "9-21",               // 敬老の日（近似）
  "9-23",               // 秋分（近似）
  "10-14",              // 体育の日（近似）
  "11-3", "11-23",      // 文化の日・勤労感謝の日
]);

function isJapaneseHoliday(date: Date): boolean {
  const dow = date.getDay(); // 0=Sun, 6=Sat
  if (dow === 0 || dow === 6) return true;
  const key = `${date.getMonth() + 1}-${date.getDate()}`;
  return JAPANESE_HOLIDAY_MONTHS_DAYS.has(key);
}

function getTollPeriod(departureTime: Date): TollPeriod {
  const h = departureTime.getHours();
  const m = departureTime.getMinutes();
  const totalMinutes = h * 60 + m;

  // 深夜割引: 0:00-4:00
  if (totalMinutes < 240) return "MIDNIGHT";

  if (isJapaneseHoliday(departureTime)) {
    // 休日割引: 6:00-22:00
    if (totalMinutes >= 360 && totalMinutes < 1320) return "HOLIDAY_DAY";
    return "NORMAL";
  }

  // 平日朝夕割引: 6:00-9:00 または 17:00-20:00
  const isRush =
    (totalMinutes >= 360 && totalMinutes < 540) ||
    (totalMinutes >= 1020 && totalMinutes < 1200);
  if (isRush) return "WEEKDAY_RUSH";

  return "NORMAL";
}

// ============================================
// キャッシュ付き距離・所要時間取得
// ============================================

function distanceCacheKey(from: Location, to: Location): string {
  const k1 = `${from.lat},${from.lng}-${to.lat},${to.lng}`;
  const k2 = `${to.lat},${to.lng}-${from.lat},${from.lng}`;
  return distanceCache.has(k1) ? k1 : k2;
}

async function getDistanceDuration(from: Location, to: Location): Promise<DistanceDuration> {
  const k1 = `${from.lat},${from.lng}-${to.lat},${to.lng}`;
  const k2 = `${to.lat},${to.lng}-${from.lat},${from.lng}`;

  const cached = distanceCache.get(k1) ?? distanceCache.get(k2);
  if (cached !== undefined) return cached;

  const result = await calculateDistance(from, to);
  const value: DistanceDuration = {
    distanceKm: result?.distanceKm ?? 0,
    durationMinutes: result?.durationMinutes ?? 0,
  };
  distanceCache.set(k1, value);
  return value;
}

// ============================================
// キャッシュ付き toll 取得
// ============================================

async function getToll(
  from: Location,
  to: Location,
  departureTime: Date,
  vehicleClass: VehicleClass,
  hasEtc: boolean
): Promise<number | null> {
  const period = getTollPeriod(departureTime);
  const baseKey = `${from.lat},${from.lng}-${to.lat},${to.lng}`;
  const reverseKey = `${to.lat},${to.lng}-${from.lat},${from.lng}`;
  const suffix = `-${period}-${vehicleClass}-${hasEtc}`;

  const cached =
    tollCache.get(baseKey + suffix) ?? tollCache.get(reverseKey + suffix);
  if (cached !== undefined) return cached;

  const result = await calculateDistance(from, to, departureTime, vehicleClass, hasEtc);
  const value = result?.tollJpy ?? null;
  tollCache.set(baseKey + suffix, value);
  return value;
}

// ============================================
// ルート計算の型定義
// ============================================

export interface TollOptions {
  direction: "OUTBOUND" | "RETURN";
  anchorDate: Date;         // 往路: outboundDate、復路: returnDate
  anchorTimeMinutes: number; // 往路: checkinTime、復路: checkoutTime（分）
  loadingMinutesPerStop: number[]; // departures[i] に対応する荷積み時間
  vehicleClass: VehicleClass;
  hasEtc: boolean;
}

export interface RouteResult {
  totalDistanceKm: number;
  totalTollJpy: number;
  hasMissingToll: boolean;
}

// ============================================
// 最近傍法によるルート順序の決定
// ============================================

/**
 * 出発地リストを最近傍法で並び替え、訪問順インデックスを返す
 * OUTBOUND: departures のみを最近傍法で並び替える（目的地は最後に固定）
 * RETURN: 目的地を起点として departures を最近傍法で並び替える（dep[0] を最後に固定）
 */
async function buildRouteOrder(
  departures: Location[],
  destination: Location,
  direction: "OUTBOUND" | "RETURN"
): Promise<number[]> {
  if (direction === "OUTBOUND") {
    if (departures.length === 1) return [0];

    const visited = new Set<number>([0]);
    const order = [0];
    let current = departures[0];

    while (order.length < departures.length) {
      let nearestIdx = -1;
      let nearestDist = Infinity;

      for (let i = 0; i < departures.length; i++) {
        if (visited.has(i)) continue;
        const { distanceKm } = await getDistanceDuration(current, departures[i]);
        if (distanceKm < nearestDist) {
          nearestDist = distanceKm;
          nearestIdx = i;
        }
      }

      if (nearestIdx === -1) break;
      visited.add(nearestIdx);
      order.push(nearestIdx);
      current = departures[nearestIdx];
    }

    return order;
  } else {
    // RETURN: 目的地から出発し、dep[0] を除く departures を最近傍法で訪問、最後に dep[0]
    if (departures.length === 1) return [0];

    const candidates = new Set<number>();
    for (let i = 1; i < departures.length; i++) candidates.add(i);

    const order: number[] = [];
    let current = destination;

    while (candidates.size > 0) {
      let nearestIdx = -1;
      let nearestDist = Infinity;

      for (const i of candidates) {
        const { distanceKm } = await getDistanceDuration(current, departures[i]);
        if (distanceKm < nearestDist) {
          nearestDist = distanceKm;
          nearestIdx = i;
        }
      }

      if (nearestIdx === -1) break;
      candidates.delete(nearestIdx);
      order.push(nearestIdx);
      current = departures[nearestIdx];
    }

    order.push(0); // 運転者（dep[0]）は最後
    return order;
  }
}

// ============================================
// 出発時刻の逆算・順算
// ============================================

function combineDateAndMinutes(date: Date, minutesSinceMidnight: number): Date {
  const result = new Date(date);
  result.setUTCHours(
    Math.floor(minutesSinceMidnight / 60),
    minutesSinceMidnight % 60,
    0,
    0
  );
  return result;
}

/**
 * OUTBOUND: チェックイン時刻からの逆算で各区間の出発時刻を計算
 * ルート: dep[order[0]] → dep[order[1]] → ... → destination
 * 戻り値: legs[i] の出発時刻（departures のインデックスで管理）
 */
function calcOutboundDepartureTimes(
  departures: Location[],
  destination: Location,
  order: number[],
  checkinTime: Date,
  loadingMinutesPerStop: number[],
  durationMap: Map<string, number>
): Map<string, Date> {
  // legs は order[i] → order[i+1] → destination の順
  // キー: `${fromIdx}-${toIdx}`（-1 = destination）
  const departureTimes = new Map<string, Date>();

  const getDuration = (fromLoc: Location, toLoc: Location): number => {
    const k1 = `${fromLoc.lat},${fromLoc.lng}-${toLoc.lat},${toLoc.lng}`;
    const k2 = `${toLoc.lat},${toLoc.lng}-${fromLoc.lat},${fromLoc.lng}`;
    return durationMap.get(k1) ?? durationMap.get(k2) ?? 0;
  };

  // 最後の区間: order[k-1] → destination
  const lastIdx = order[order.length - 1];
  const lastLeg = `${lastIdx}--1`;
  const lastDuration = getDuration(departures[lastIdx], destination);
  // チェックイン時刻から逆算
  const lastDeparture = new Date(checkinTime.getTime() - lastDuration * 60 * 1000);
  departureTimes.set(lastLeg, lastDeparture);

  // 逆順に残りの区間を計算
  for (let i = order.length - 2; i >= 0; i--) {
    const fromIdx = order[i];
    const toIdx = order[i + 1];
    const legKey = `${fromIdx}-${toIdx}`;
    // toIdx での到着時刻 = lastDeparture[i+1] - loadingMinutes[toIdx]
    const nextLegDeparture = departureTimes.get(
      i + 1 === order.length - 1 ? `${toIdx}--1` : `${toIdx}-${order[i + 2]}`
    )!;
    const arrivalAtTo = new Date(
      nextLegDeparture.getTime() - loadingMinutesPerStop[toIdx] * 60 * 1000
    );
    const segDuration = getDuration(departures[fromIdx], departures[toIdx]);
    const departure = new Date(arrivalAtTo.getTime() - segDuration * 60 * 1000);
    departureTimes.set(legKey, departure);
  }

  return departureTimes;
}

/**
 * RETURN: チェックアウト時刻からの順算で各区間の出発時刻を計算
 * ルート: destination → dep[order[0]] → ... → dep[order[k-1]=0]
 */
function calcReturnDepartureTimes(
  departures: Location[],
  destination: Location,
  order: number[],
  checkoutTime: Date,
  loadingMinutesPerStop: number[],
  durationMap: Map<string, number>
): Map<string, Date> {
  const departureTimes = new Map<string, Date>();

  const getDuration = (fromLoc: Location, toLoc: Location): number => {
    const k1 = `${fromLoc.lat},${fromLoc.lng}-${toLoc.lat},${toLoc.lng}`;
    const k2 = `${toLoc.lat},${toLoc.lng}-${fromLoc.lat},${fromLoc.lng}`;
    return durationMap.get(k1) ?? durationMap.get(k2) ?? 0;
  };

  // 最初の区間: destination → order[0]
  const firstLeg = `-1-${order[0]}`;
  departureTimes.set(firstLeg, checkoutTime);

  let currentDeparture = checkoutTime;
  let currentLoc = destination;

  for (let i = 0; i < order.length; i++) {
    const toIdx = order[i];
    const arrival = new Date(
      currentDeparture.getTime() + getDuration(currentLoc, departures[toIdx]) * 60 * 1000
    );
    // i が最後（driver's home）は荷積みなし
    const isDriverHome = i === order.length - 1;
    const departureFromStop = isDriverHome
      ? arrival
      : new Date(arrival.getTime() + loadingMinutesPerStop[toIdx] * 60 * 1000);

    if (i + 1 < order.length) {
      const legKey = `${toIdx}-${order[i + 1]}`;
      departureTimes.set(legKey, departureFromStop);
    }

    currentDeparture = departureFromStop;
    currentLoc = departures[toIdx];
  }

  return departureTimes;
}

// ============================================
// メイン計算関数
// ============================================

/**
 * 出発地リストと目的地から往路・復路の総距離と toll を計算
 *
 * tollOptions が指定された場合に toll を計算する。
 * 往路 (OUTBOUND): departures を最近傍法でピックアップしながら destination へ
 * 復路 (RETURN): destination から出発し departures をドロップオフしながら dep[0] へ
 */
export async function calculateOptimalRoute(
  departures: Location[],
  destination: Location,
  tollOptions?: TollOptions
): Promise<RouteResult> {
  if (departures.length === 0) {
    return { totalDistanceKm: 0, totalTollJpy: 0, hasMissingToll: false };
  }

  if (departures.length === 1) {
    const { distanceKm } = await getDistanceDuration(departures[0], destination);
    const roundTripKm = distanceKm * 2;

    let totalTollJpy = 0;
    let hasMissingToll = false;

    if (tollOptions) {
      const { anchorDate, anchorTimeMinutes, vehicleClass, hasEtc } = tollOptions;

      if (tollOptions.direction === "OUTBOUND") {
        // 往路: destination 到着 = checkinTime → dep[0] 出発を逆算
        const checkinDt = combineDateAndMinutes(anchorDate, anchorTimeMinutes);
        const { durationMinutes } = await getDistanceDuration(departures[0], destination);
        const outDeparture = new Date(checkinDt.getTime() - durationMinutes * 60 * 1000);
        const t = await getToll(departures[0], destination, outDeparture, vehicleClass, hasEtc);
        if (t === null) hasMissingToll = true;
        else totalTollJpy += t;
      } else {
        // 復路: dep[0] 到着 = checkoutTime + duration
        const checkoutDt = combineDateAndMinutes(anchorDate, anchorTimeMinutes);
        const t = await getToll(destination, departures[0], checkoutDt, vehicleClass, hasEtc);
        if (t === null) hasMissingToll = true;
        else totalTollJpy += t;
      }
    }

    return { totalDistanceKm: roundTripKm, totalTollJpy, hasMissingToll };
  }

  // 複数人の場合
  if (!tollOptions) {
    // toll 不要: 往路 + 復路を同じ最近傍法で計算（往来で距離のみ）
    const outOrder = await buildRouteOrder(departures, destination, "OUTBOUND");
    const retOrder = await buildRouteOrder(departures, destination, "RETURN");

    let totalDistanceKm = 0;

    // 往路 legs
    for (let i = 0; i < outOrder.length - 1; i++) {
      const { distanceKm } = await getDistanceDuration(departures[outOrder[i]], departures[outOrder[i + 1]]);
      totalDistanceKm += distanceKm;
    }
    const { distanceKm: lastOut } = await getDistanceDuration(
      departures[outOrder[outOrder.length - 1]],
      destination
    );
    totalDistanceKm += lastOut;

    // 復路 legs
    const { distanceKm: firstRet } = await getDistanceDuration(destination, departures[retOrder[0]]);
    totalDistanceKm += firstRet;
    for (let i = 0; i < retOrder.length - 1; i++) {
      const { distanceKm } = await getDistanceDuration(departures[retOrder[i]], departures[retOrder[i + 1]]);
      totalDistanceKm += distanceKm;
    }

    return { totalDistanceKm, totalTollJpy: 0, hasMissingToll: false };
  }

  const { direction, anchorDate, anchorTimeMinutes, loadingMinutesPerStop, vehicleClass, hasEtc } =
    tollOptions;

  const order = await buildRouteOrder(departures, destination, direction);

  // 全区間の所要時間を事前取得してマップ化
  const durationMap = new Map<string, number>();
  const collectDuration = async (a: Location, b: Location): Promise<void> => {
    const { durationMinutes, distanceKm } = await getDistanceDuration(a, b);
    const k = `${a.lat},${a.lng}-${b.lat},${b.lng}`;
    durationMap.set(k, durationMinutes);
    // distanceKm も蓄積（後の距離合算に使用）
    void distanceKm;
  };

  if (direction === "OUTBOUND") {
    for (let i = 0; i < order.length - 1; i++) {
      await collectDuration(departures[order[i]], departures[order[i + 1]]);
    }
    await collectDuration(departures[order[order.length - 1]], destination);
  } else {
    await collectDuration(destination, departures[order[0]]);
    for (let i = 0; i < order.length - 1; i++) {
      await collectDuration(departures[order[i]], departures[order[i + 1]]);
    }
  }

  const anchorDt = combineDateAndMinutes(anchorDate, anchorTimeMinutes);

  const departureTimes =
    direction === "OUTBOUND"
      ? calcOutboundDepartureTimes(departures, destination, order, anchorDt, loadingMinutesPerStop, durationMap)
      : calcReturnDepartureTimes(departures, destination, order, anchorDt, loadingMinutesPerStop, durationMap);

  // 距離と toll を合算
  let totalDistanceKm = 0;
  let totalTollJpy = 0;
  let hasMissingToll = false;

  if (direction === "OUTBOUND") {
    for (let i = 0; i < order.length - 1; i++) {
      const fromIdx = order[i];
      const toIdx = order[i + 1];
      const { distanceKm } = await getDistanceDuration(departures[fromIdx], departures[toIdx]);
      totalDistanceKm += distanceKm;
      const depTime = departureTimes.get(`${fromIdx}-${toIdx}`);
      if (depTime) {
        const t = await getToll(departures[fromIdx], departures[toIdx], depTime, vehicleClass, hasEtc);
        if (t === null) hasMissingToll = true;
        else totalTollJpy += t;
      }
    }
    const lastIdx = order[order.length - 1];
    const { distanceKm: dLast } = await getDistanceDuration(departures[lastIdx], destination);
    totalDistanceKm += dLast;
    const lastDepTime = departureTimes.get(`${lastIdx}--1`);
    if (lastDepTime) {
      const t = await getToll(departures[lastIdx], destination, lastDepTime, vehicleClass, hasEtc);
      if (t === null) hasMissingToll = true;
      else totalTollJpy += t;
    }
  } else {
    const { distanceKm: dFirst } = await getDistanceDuration(destination, departures[order[0]]);
    totalDistanceKm += dFirst;
    const firstDepTime = departureTimes.get(`-1-${order[0]}`);
    if (firstDepTime) {
      const t = await getToll(destination, departures[order[0]], firstDepTime, vehicleClass, hasEtc);
      if (t === null) hasMissingToll = true;
      else totalTollJpy += t;
    }
    for (let i = 0; i < order.length - 1; i++) {
      const fromIdx = order[i];
      const toIdx = order[i + 1];
      const { distanceKm } = await getDistanceDuration(departures[fromIdx], departures[toIdx]);
      totalDistanceKm += distanceKm;
      const depTime = departureTimes.get(`${fromIdx}-${toIdx}`);
      if (depTime) {
        const t = await getToll(departures[fromIdx], departures[toIdx], depTime, vehicleClass, hasEtc);
        if (t === null) hasMissingToll = true;
        else totalTollJpy += t;
      }
    }
  }

  return { totalDistanceKm, totalTollJpy, hasMissingToll };
}

// キャッシュを両方クリア
export function clearRouteCache(): void {
  distanceCache.clear();
  tollCache.clear();
}

// 後方互換のエイリアス
export const clearDistanceCache = clearRouteCache;

// durationMap への distanceCacheKey 再エクスポート（内部使用）
export { distanceCacheKey };
