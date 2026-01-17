import { Set as ImmutableSet } from "shapley/node_modules/immutable";
import { shapley as calculateShapley } from "shapley";
import { calculateOptimalRoute, clearDistanceCache } from "./route";

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
  capacity: number;
  fuelEfficiency: number | null;
}

interface Member {
  id: string;
  userId: string;
  nickname: string | null;
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

export interface SettlementResult {
  balances: MemberBalance[];
  transfers: Transfer[];
  shapleyValues: ShapleyValue[];
  totalAmount: number;
  transportCost: number;
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

/**
 * 車で移動できる手段を持つか（OWNED, RENTAL, CARSHARE）
 * 連合が車で移動可能かの判定に使用
 */
function hasCarAccess(member: Member): boolean {
  return member.vehicles.some((v) => v.type !== "BIKE");
}

/**
 * 自家用車を持つか（OWNED のみ）
 * 「車を出した貢献」として負担軽減の対象
 */
function isOwnedCarOwner(member: Member): boolean {
  return member.vehicles.some((v) => v.type === "OWNED");
}

// ============================================
// Shapley値計算
// ============================================

/**
 * 特性関数v(S)を計算するための準備
 * 連合Sに対して、交通費コストを返す
 */
async function buildCharacteristicFunction(
  event: Event,
  carRiderIds: string[],
  memberMap: Map<string, Member>,
  effectiveFuelEfficiency: number,
  highwayCost: number
): Promise<Map<string, number>> {
  const coalitionValues = new Map<string, number>();
  // 自家用車を持つ人のみが「車を出した貢献」として扱われる
  const ownedCarOwnerIds = new Set(event.members.filter((m) => isOwnedCarOwner(m)).map((m) => m.id));

  // 全部分集合について特性関数を計算
  const n = carRiderIds.length;
  for (let mask = 0; mask < 1 << n; mask++) {
    const coalition: string[] = [];
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        coalition.push(carRiderIds[i]);
      }
    }

    const key = coalition.sort().join(",");

    if (coalition.length === 0) {
      coalitionValues.set(key, 0);
      continue;
    }

    // 連合に自家用車所有者がいるか
    const hasOwnedCarOwner = coalition.some((id) => ownedCarOwnerIds.has(id));

    // 各メンバーの出発地を取得
    const departures: Location[] = [];
    for (const id of coalition) {
      const member = memberMap.get(id);
      if (member) {
        const loc = getMemberDepartureLocation(member);
        if (loc) {
          departures.push(loc);
        }
      }
    }

    if (departures.length === 0 || !event.destination) {
      coalitionValues.set(key, 0);
      continue;
    }

    // 最短ルートを計算
    const routeDistance = await calculateOptimalRoute(departures, event.destination);

    // 高速代は全員で共有するため、連合サイズに比例して配分
    const coalitionHighwayCost = (highwayCost * coalition.length) / carRiderIds.length;

    if (!hasOwnedCarOwner) {
      // 自家用車がない場合はカーシェアを借りるコスト
      // タイムズカーシェア 36時間パック: ¥12,000 + 距離料金 ¥16/km
      const carShareBaseFee = 12000;
      const carShareDistanceRate = 16;
      const carShareCost = carShareBaseFee + routeDistance * carShareDistanceRate;
      coalitionValues.set(key, carShareCost + coalitionHighwayCost);
      continue;
    }

    // 自家用車がある場合はガソリン代のみ
    const gasPrice = event.gasPricePerLiter;
    const gasCost = (routeDistance / effectiveFuelEfficiency) * gasPrice;
    coalitionValues.set(key, gasCost + coalitionHighwayCost);
  }

  return coalitionValues;
}

/**
 * Shapley値を計算
 */
async function computeShapleyValues(
  event: Event,
  carRiderIds: string[],
  memberMap: Map<string, Member>,
  effectiveFuelEfficiency: number,
  highwayCost: number
): Promise<Map<string, number>> {
  if (carRiderIds.length === 0) {
    return new Map();
  }

  // 特性関数の値をプリ計算
  const coalitionValues = await buildCharacteristicFunction(
    event,
    carRiderIds,
    memberMap,
    effectiveFuelEfficiency,
    highwayCost
  );

  // shapleyパッケージを使用
  const players = ImmutableSet(carRiderIds);

  const gainFunc = (S: ImmutableSet<string>): number => {
    const coalition = S.toArray().sort();
    const key = coalition.join(",");
    const value = coalitionValues.get(key);
    return value ?? 0;
  };

  const shapleyFunc = calculateShapley(players, gainFunc);

  const result = new Map<string, number>();
  for (const playerId of carRiderIds) {
    result.set(playerId, shapleyFunc(playerId));
  }

  return result;
}

// ============================================
// メイン計算関数
// ============================================

/**
 * 清算を計算する（Shapley値対応版）
 */
export async function calculateSettlement(event: Event): Promise<SettlementResult> {
  // キャッシュをクリア
  clearDistanceCache();

  const members = event.members;
  const memberMap = new Map(members.map((m) => [m.id, m]));
  const userIdToMemberIdMap = new Map(members.map((m) => [m.userId, m.id]));

  // 1. 自家用車を出せる人がいるかチェック
  const ownedCarOwners = members.filter((m) => isOwnedCarOwner(m));
  if (ownedCarOwners.length === 0 && event.destination) {
    throw new Error("自家用車を出せる人がいません。車両情報を登録してください。");
  }

  // 2. バイクの人と車に乗る人を分離
  const bikeMembers = members.filter((m) => isBikeMember(m));
  const bikeMemberIds = new Set(bikeMembers.map((m) => m.id));
  const carRiders = members.filter((m) => !isBikeMember(m));
  const carRiderIds = carRiders.map((m) => m.id);

  // 3. 交通費の合計と高速代を計算
  const transportCost = event.payments
    .filter((p) => p.isTransport)
    .reduce((sum, p) => sum + p.amount, 0);

  const highwayCost = event.payments
    .filter((p) => p.isTransport && p.description.includes("高速"))
    .reduce((sum, p) => sum + p.amount, 0);

  // 4. 実効燃費を計算（全員の連合での総距離から逆算）
  let effectiveFuelEfficiency = 10; // デフォルト値
  if (event.destination && carRiderIds.length > 0) {
    // 全員の出発地を取得
    const allDepartures: Location[] = [];
    for (const id of carRiderIds) {
      const member = memberMap.get(id);
      if (member) {
        const loc = getMemberDepartureLocation(member);
        if (loc) {
          allDepartures.push(loc);
        }
      }
    }

    if (allDepartures.length > 0) {
      // 全員の連合での総距離を計算
      const totalDistance = await calculateOptimalRoute(allDepartures, event.destination);

      // 実効燃費を逆算: ガソリン代 = (距離 / 燃費) × 単価
      // よって: 燃費 = 距離 × 単価 / ガソリン代
      const gasCost = transportCost - highwayCost;
      if (gasCost > 0 && totalDistance > 0) {
        effectiveFuelEfficiency = (totalDistance * event.gasPricePerLiter) / gasCost;
      }
    }
  }

  // 5. Shapley値を計算（目的地が設定されている場合のみ）
  let shapleyValues = new Map<string, number>();
  if (event.destination && carRiderIds.length > 0) {
    shapleyValues = await computeShapleyValues(
      event,
      carRiderIds,
      memberMap,
      effectiveFuelEfficiency,
      highwayCost
    );
  }

  // 6. 各メンバーの残高を計算
  const balanceMap = new Map<
    string,
    { paid: number; owed: number; userId: string; memberName: string }
  >();

  // 初期化
  for (const member of members) {
    balanceMap.set(member.id, {
      paid: 0,
      owed: 0,
      userId: member.userId,
      memberName: getMemberDisplayName(member),
    });
  }

  let totalAmount = 0;

  // 支払いを処理
  for (const payment of event.payments) {
    totalAmount += payment.amount;

    // 支払者のMemberIdを取得
    const payerMemberId = userIdToMemberIdMap.get(payment.payerId);
    if (payerMemberId) {
      const payerBalance = balanceMap.get(payerMemberId);
      if (payerBalance) {
        payerBalance.paid += payment.amount;
      }
    }

    if (payment.isTransport) {
      // 交通費: Shapley値で分配（バイクの人は自分の支払い分のみ）
      // バイクの人の交通費支払いは自分自身への負担
      if (payerMemberId && bikeMemberIds.has(payerMemberId)) {
        const balance = balanceMap.get(payerMemberId);
        if (balance) {
          balance.owed += payment.amount;
        }
      }
      // 車に乗る人の交通費はShapley値で後で分配
    } else {
      // 交通費以外: 受益者で均等割り
      const beneficiaryCount = payment.beneficiaries.length;
      if (beneficiaryCount > 0) {
        const amountPerPerson = payment.amount / beneficiaryCount;
        for (const beneficiary of payment.beneficiaries) {
          const beneficiaryBalance = balanceMap.get(beneficiary.memberId);
          if (beneficiaryBalance) {
            beneficiaryBalance.owed += amountPerPerson;
          }
        }
      }
    }
  }

  // 7. 車に乗る人にShapley値による交通費負担を追加
  // Shapley値は各プレイヤーの公平な負担額を表す
  // 効率性（Efficiency）により、Shapley値の合計は自動的に v(N) = 交通費と等しくなる
  for (const [memberId, shapleyValue] of shapleyValues) {
    const balance = balanceMap.get(memberId);
    if (balance) {
      balance.owed += shapleyValue;
    }
  }

  // 8. 残高を計算
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

  // 残高でソート（受取額が多い順）
  balances.sort((a, b) => b.balance - a.balance);

  // 9. Shapley値の結果を整形
  const shapleyResults: ShapleyValue[] = [];
  for (const [memberId, shapleyValue] of shapleyValues) {
    const member = memberMap.get(memberId);
    if (member) {
      shapleyResults.push({
        memberId,
        memberName: getMemberDisplayName(member),
        value: Math.round(shapleyValue),
      });
    }
  }

  // 10. warikanで清算リストを計算
  const transfers = calculateTransfers(balances);

  return {
    balances,
    transfers,
    shapleyValues: shapleyResults,
    totalAmount,
    transportCost,
  };
}

/**
 * 貪欲法で清算リストを計算
 */
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
          from: {
            memberId: debtor.memberId,
            memberName: debtor.memberName,
          },
          to: {
            memberId: creditor.memberId,
            memberName: creditor.memberName,
          },
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
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

export interface SimpleSettlementResult {
  balances: MemberBalance[];
  transfers: Transfer[];
  totalAmount: number;
}

/**
 * シンプルな清算計算（Shapley値なし、均等割りのみ）
 */
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
      const payerBalance = balanceMap.get(payerMemberId);
      if (payerBalance) {
        payerBalance.paid += payment.amount;
      }
    }

    const beneficiaryCount = payment.beneficiaries.length;
    if (beneficiaryCount > 0) {
      const amountPerPerson = payment.amount / beneficiaryCount;
      for (const beneficiary of payment.beneficiaries) {
        const beneficiaryBalance = balanceMap.get(beneficiary.memberId);
        if (beneficiaryBalance) {
          beneficiaryBalance.owed += amountPerPerson;
        }
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

  const transfers = calculateTransfers(balances);

  return {
    balances,
    transfers,
    totalAmount,
  };
}
