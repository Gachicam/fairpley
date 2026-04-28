import { Set as ImmutableSet } from "shapley/node_modules/immutable";
import { shapley as calculateShapley } from "shapley";
import { calculateOptimalRoute, clearRouteCache, type TollOptions } from "./route";
import type { VehicleClass } from "./schemas/vehicle";

// ============================================
// 型定義
// ============================================

interface Location {
  lat: number;
  lng: number;
}

interface Payment {
  id: string;
  amount: number;
  payerId: string;
  isTransport: boolean;
  description: string;
  beneficiaries: { memberId: string }[];
}

interface Vehicle {
  id: string;
  type: "OWNED" | "RENTAL" | "CARSHARE" | "BIKE";
  vehicleClass: VehicleClass;
  hasEtc: boolean;
  capacity: number;
  fuelEfficiency: number | null;
}

interface Member {
  id: string;
  userId: string;
  nickname: string | null;
  loadingMinutes: number;
  departureLocation: Location | null;
  vehicles: Vehicle[];
  user: {
    id: string;
    name: string | null;
    email: string;
    homeLocation: Location | null;
  };
}

interface Event {
  id: string;
  gasPricePerLiter: number;
  destination: Location | null;
  outboundDate: Date | null;
  returnDate: Date | null;
  checkinTime: number | null;  // 分（0-1439）
  checkoutTime: number | null; // 分（0-1439）
  members: Member[];
  payments: Payment[];
}

interface MemberBalance {
  memberId: string;
  memberName: string;
  userId: string;
  paid: number;
  owed: number;
  balance: number;
}

interface Transfer {
  from: { memberId: string; memberName: string };
  to: { memberId: string; memberName: string };
  amount: number;
}

interface ShapleyValue {
  memberId: string;
  memberName: string;
  value: number;
}

export interface MissingTollCoalition {
  memberNames: string[];
  coalitionKey: string;
  calculatedValue: number;
}

export interface SettlementResult {
  balances: MemberBalance[];
  transfers: Transfer[];
  shapleyValues: ShapleyValue[];
  totalAmount: number;
  transportCost: number;
  missingTollCoalitions: MissingTollCoalition[];
}

// ============================================
// ヘルパー関数
// ============================================

function getMemberDisplayName(member: Member): string {
  return member.nickname ?? member.user.name ?? member.user.email;
}

function getMemberDepartureLocation(member: Member): Location | null {
  return member.departureLocation ?? member.user.homeLocation;
}

function isBikeMember(member: Member): boolean {
  return member.vehicles.some((v) => v.type === "BIKE");
}

function hasCarAccess(member: Member): boolean {
  return member.vehicles.some((v) => v.type !== "BIKE");
}

function isOwnedCarOwner(member: Member): boolean {
  return member.vehicles.some((v) => v.type === "OWNED");
}

/** 連合内で使用する最良の自家用車を返す（燃費が最高の OWNED 車） */
function getBestOwnedCar(coalition: string[], memberMap: Map<string, Member>): Vehicle | null {
  let best: Vehicle | null = null;
  for (const id of coalition) {
    const member = memberMap.get(id);
    if (!member) continue;
    for (const v of member.vehicles) {
      if (v.type !== "OWNED") continue;
      if (!best || (v.fuelEfficiency ?? 0) > (best.fuelEfficiency ?? 0)) {
        best = v;
      }
    }
  }
  return best;
}

/** 連合内に ETC 搭載車があるか */
function coalitionHasEtc(coalition: string[], memberMap: Map<string, Member>): boolean {
  for (const id of coalition) {
    const member = memberMap.get(id);
    if (!member) continue;
    if (member.vehicles.some((v) => v.hasEtc && v.type !== "BIKE")) return true;
  }
  return false;
}

// ============================================
// toll 計算オプション構築
// ============================================

function buildTollOptions(
  event: Event,
  direction: "OUTBOUND" | "RETURN",
  coalition: string[],
  memberMap: Map<string, Member>,
  vehicleClass: VehicleClass,
  hasEtc: boolean
): TollOptions | undefined {
  if (direction === "OUTBOUND") {
    if (!event.outboundDate || event.checkinTime === null) return undefined;
    const loadingMinutesPerStop = coalition.map(
      (id) => memberMap.get(id)?.loadingMinutes ?? 15
    );
    return {
      direction: "OUTBOUND",
      anchorDate: event.outboundDate,
      anchorTimeMinutes: event.checkinTime,
      loadingMinutesPerStop,
      vehicleClass,
      hasEtc,
    };
  } else {
    if (!event.returnDate || event.checkoutTime === null) return undefined;
    const loadingMinutesPerStop = coalition.map(
      (id) => memberMap.get(id)?.loadingMinutes ?? 15
    );
    return {
      direction: "RETURN",
      anchorDate: event.returnDate,
      anchorTimeMinutes: event.checkoutTime,
      loadingMinutesPerStop,
      vehicleClass,
      hasEtc,
    };
  }
}

// ============================================
// Shapley 値計算
// ============================================

interface CoalitionEntry {
  value: number;
  hasMissingToll: boolean;
}

async function buildCharacteristicFunction(
  event: Event,
  carRiderIds: string[],
  memberMap: Map<string, Member>,
  effectiveFuelEfficiency: number
): Promise<{ coalitionValues: Map<string, CoalitionEntry>; missingKeys: Set<string> }> {
  const coalitionValues = new Map<string, CoalitionEntry>();
  const missingKeys = new Set<string>();
  const ownedCarOwnerIds = new Set(
    event.members.filter((m) => isOwnedCarOwner(m)).map((m) => m.id)
  );

  const n = carRiderIds.length;
  for (let mask = 0; mask < 1 << n; mask++) {
    const coalition: string[] = [];
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) coalition.push(carRiderIds[i]);
    }

    const key = coalition.sort().join(",");

    if (coalition.length === 0) {
      coalitionValues.set(key, { value: 0, hasMissingToll: false });
      continue;
    }

    const hasOwnedCarOwner = coalition.some((id) => ownedCarOwnerIds.has(id));

    const departures: Location[] = [];
    for (const id of coalition) {
      const loc = getMemberDepartureLocation(memberMap.get(id)!);
      if (loc) departures.push(loc);
    }

    if (departures.length === 0 || !event.destination) {
      coalitionValues.set(key, { value: 0, hasMissingToll: false });
      continue;
    }

    // 車種・ETC を連合に基づいて決定
    const bestCar = getBestOwnedCar(coalition, memberMap);
    const vehicleClass: VehicleClass = bestCar?.vehicleClass ?? "STANDARD";
    const hasEtc = coalitionHasEtc(coalition, memberMap);

    // 往路・復路のルート計算
    const outboundTollOpts = buildTollOptions(event, "OUTBOUND", coalition, memberMap, vehicleClass, hasEtc);
    const returnTollOpts = buildTollOptions(event, "RETURN", coalition, memberMap, vehicleClass, hasEtc);

    const outbound = await calculateOptimalRoute(departures, event.destination, outboundTollOpts);
    const ret = await calculateOptimalRoute(departures, event.destination, returnTollOpts);

    const totalDistanceKm = outbound.totalDistanceKm + ret.totalDistanceKm;
    const totalTollJpy = outbound.totalTollJpy + ret.totalTollJpy;
    const hasMissingToll = outbound.hasMissingToll || ret.hasMissingToll;

    if (hasMissingToll) missingKeys.add(key);

    let value: number;
    if (!hasOwnedCarOwner) {
      const carShareBaseFee = 12000;
      const carShareDistanceRate = 16;
      value = carShareBaseFee + totalDistanceKm * carShareDistanceRate + totalTollJpy;
    } else {
      const gasCost = (totalDistanceKm / effectiveFuelEfficiency) * event.gasPricePerLiter;
      value = gasCost + totalTollJpy;
    }

    coalitionValues.set(key, { value, hasMissingToll });
  }

  return { coalitionValues, missingKeys };
}

async function computeShapleyValues(
  event: Event,
  carRiderIds: string[],
  memberMap: Map<string, Member>,
  effectiveFuelEfficiency: number
): Promise<{
  shapleyMap: Map<string, number>;
  missingTollCoalitions: MissingTollCoalition[];
}> {
  if (carRiderIds.length === 0) {
    return { shapleyMap: new Map(), missingTollCoalitions: [] };
  }

  const { coalitionValues, missingKeys } = await buildCharacteristicFunction(
    event,
    carRiderIds,
    memberMap,
    effectiveFuelEfficiency
  );

  const players = ImmutableSet(carRiderIds);

  const gainFunc = (S: ImmutableSet<string>): number => {
    const key = S.toArray().sort().join(",");
    return coalitionValues.get(key)?.value ?? 0;
  };

  const shapleyFunc = calculateShapley(players, gainFunc);
  const shapleyMap = new Map<string, number>();
  for (const id of carRiderIds) {
    shapleyMap.set(id, shapleyFunc(id));
  }

  // 欠損連合を MissingTollCoalition に変換
  const missingTollCoalitions: MissingTollCoalition[] = [];
  for (const key of missingKeys) {
    const memberIds = key === "" ? [] : key.split(",");
    const memberNames = memberIds.map((id) => getMemberDisplayName(memberMap.get(id)!));
    const entry = coalitionValues.get(key);
    missingTollCoalitions.push({
      memberNames,
      coalitionKey: key,
      calculatedValue: Math.round(entry?.value ?? 0),
    });
  }
  missingTollCoalitions.sort((a, b) => a.memberNames.length - b.memberNames.length);

  return { shapleyMap, missingTollCoalitions };
}

// ============================================
// メイン計算関数
// ============================================

export async function calculateSettlement(event: Event): Promise<SettlementResult> {
  clearRouteCache();

  const members = event.members;
  const memberMap = new Map(members.map((m) => [m.id, m]));
  const userIdToMemberIdMap = new Map(members.map((m) => [m.userId, m.id]));

  const ownedCarOwners = members.filter((m) => isOwnedCarOwner(m));
  if (ownedCarOwners.length === 0 && event.destination) {
    throw new Error("自家用車を出せる人がいません。車両情報を登録してください。");
  }

  const bikeMembers = members.filter((m) => isBikeMember(m));
  const bikeMemberIds = new Set(bikeMembers.map((m) => m.id));
  const carRiders = members.filter((m) => !isBikeMember(m));
  const carRiderIds = carRiders.map((m) => m.id);

  const transportCost = event.payments
    .filter((p) => p.isTransport)
    .reduce((sum, p) => sum + p.amount, 0);

  // 高速代は payments から抽出（effectiveFuelEfficiency の逆算に使用）
  const highwayCost = event.payments
    .filter((p) => p.isTransport && p.description.includes("高速"))
    .reduce((sum, p) => sum + p.amount, 0);

  // 実効燃費を計算
  let effectiveFuelEfficiency = 10;
  if (event.destination && carRiderIds.length > 0) {
    const allDepartures: Location[] = [];
    for (const id of carRiderIds) {
      const loc = getMemberDepartureLocation(memberMap.get(id)!);
      if (loc) allDepartures.push(loc);
    }

    if (allDepartures.length > 0) {
      const grand = await calculateOptimalRoute(allDepartures, event.destination);
      const totalDistance = grand.totalDistanceKm;
      const gasCost = transportCost - highwayCost;
      if (gasCost > 0 && totalDistance > 0) {
        effectiveFuelEfficiency = (totalDistance * event.gasPricePerLiter) / gasCost;
      }
    }
  }

  // Shapley 値計算
  let shapleyValues = new Map<string, number>();
  let missingTollCoalitions: MissingTollCoalition[] = [];
  if (event.destination && carRiderIds.length > 0) {
    const result = await computeShapleyValues(
      event,
      carRiderIds,
      memberMap,
      effectiveFuelEfficiency
    );
    shapleyValues = result.shapleyMap;
    missingTollCoalitions = result.missingTollCoalitions;
  }

  // 残高計算
  const balanceMap = new Map<
    string,
    { paid: number; owed: number; userId: string; memberName: string }
  >();

  for (const member of members) {
    balanceMap.set(member.id, {
      paid: 0,
      owed: 0,
      userId: member.userId,
      memberName: getMemberDisplayName(member),
    });
  }

  let totalAmount = 0;

  for (const payment of event.payments) {
    totalAmount += payment.amount;

    const payerMemberId = userIdToMemberIdMap.get(payment.payerId);
    if (payerMemberId) {
      const b = balanceMap.get(payerMemberId);
      if (b) b.paid += payment.amount;
    }

    if (payment.isTransport) {
      if (payerMemberId && bikeMemberIds.has(payerMemberId)) {
        const b = balanceMap.get(payerMemberId);
        if (b) b.owed += payment.amount;
      }
    } else {
      const count = payment.beneficiaries.length;
      if (count > 0) {
        const per = payment.amount / count;
        for (const ben of payment.beneficiaries) {
          const b = balanceMap.get(ben.memberId);
          if (b) b.owed += per;
        }
      }
    }
  }

  for (const [memberId, sv] of shapleyValues) {
    const b = balanceMap.get(memberId);
    if (b) b.owed += sv;
  }

  const balances: MemberBalance[] = [];
  for (const [memberId, data] of balanceMap) {
    balances.push({
      memberId,
      memberName: data.memberName,
      userId: data.userId,
      paid: Math.round(data.paid),
      owed: Math.round(data.owed),
      balance: Math.round(data.paid - data.owed),
    });
  }
  balances.sort((a, b) => b.balance - a.balance);

  const shapleyResults: ShapleyValue[] = [];
  for (const [memberId, sv] of shapleyValues) {
    const member = memberMap.get(memberId);
    if (member) {
      shapleyResults.push({
        memberId,
        memberName: getMemberDisplayName(member),
        value: Math.round(sv),
      });
    }
  }

  const transfers = calculateTransfers(balances);

  return {
    balances,
    transfers,
    shapleyValues: shapleyResults,
    totalAmount,
    transportCost,
    missingTollCoalitions,
  };
}

function calculateTransfers(balances: MemberBalance[]): Transfer[] {
  const transfers: Transfer[] = [];
  const creditors = balances.filter((b) => b.balance > 0).map((b) => ({ ...b }));
  const debtors = balances.filter((b) => b.balance < 0).map((b) => ({ ...b }));

  for (const debtor of debtors) {
    let remaining = -debtor.balance;

    for (const creditor of creditors) {
      if (remaining <= 0 || creditor.balance <= 0) continue;

      const amount = Math.min(remaining, creditor.balance);
      if (amount > 0) {
        transfers.push({
          from: { memberId: debtor.memberId, memberName: debtor.memberName },
          to: { memberId: creditor.memberId, memberName: creditor.memberName },
          amount: Math.round(amount),
        });
        remaining -= amount;
        creditor.balance -= amount;
      }
    }
  }

  return transfers;
}

// ============================================
// レガシー互換（シンプル版）
// ============================================

interface SimplePayment {
  id: string;
  amount: number;
  payerId: string;
  beneficiaries: { memberId: string }[];
}

interface SimpleMember {
  id: string;
  userId: string;
  nickname: string | null;
  user: { id: string; name: string | null; email: string };
}

export interface SimpleSettlementResult {
  balances: MemberBalance[];
  transfers: Transfer[];
  totalAmount: number;
}

export function calculateSimpleSettlement(
  payments: SimplePayment[],
  members: SimpleMember[]
): SimpleSettlementResult {
  const memberNameMap = new Map<string, string>();
  const userIdToMemberIdMap = new Map<string, string>();

  for (const member of members) {
    memberNameMap.set(member.id, member.nickname ?? member.user.name ?? member.user.email);
    userIdToMemberIdMap.set(member.userId, member.id);
  }

  const balanceMap = new Map<
    string,
    { paid: number; owed: number; userId: string; memberName: string }
  >();

  for (const member of members) {
    balanceMap.set(member.id, {
      paid: 0,
      owed: 0,
      userId: member.userId,
      memberName: memberNameMap.get(member.id) ?? "",
    });
  }

  let totalAmount = 0;

  for (const payment of payments) {
    totalAmount += payment.amount;

    const payerMemberId = userIdToMemberIdMap.get(payment.payerId);
    if (payerMemberId) {
      const b = balanceMap.get(payerMemberId);
      if (b) b.paid += payment.amount;
    }

    const count = payment.beneficiaries.length;
    if (count > 0) {
      const per = payment.amount / count;
      for (const ben of payment.beneficiaries) {
        const b = balanceMap.get(ben.memberId);
        if (b) b.owed += per;
      }
    }
  }

  const balances: MemberBalance[] = [];
  for (const [memberId, data] of balanceMap) {
    balances.push({
      memberId,
      memberName: data.memberName,
      userId: data.userId,
      paid: Math.round(data.paid),
      owed: Math.round(data.owed),
      balance: Math.round(data.paid - data.owed),
    });
  }
  balances.sort((a, b) => b.balance - a.balance);

  return { balances, transfers: calculateTransfers(balances), totalAmount };
}
