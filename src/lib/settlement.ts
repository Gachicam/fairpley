interface Payment {
  id: string;
  amount: number;
  payerId: string;
  beneficiaries: { memberId: string }[];
}

interface Member {
  id: string;
  userId: string;
  nickname: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface MemberBalance {
  memberId: string;
  memberName: string;
  userId: string;
  paid: number;
  owed: number;
  balance: number; // paid - owed (positive = should receive, negative = should pay)
}

interface Transfer {
  from: {
    memberId: string;
    memberName: string;
  };
  to: {
    memberId: string;
    memberName: string;
  };
  amount: number;
}

export interface SettlementResult {
  balances: MemberBalance[];
  transfers: Transfer[];
  totalAmount: number;
}

/**
 * メンバーの表示名を取得
 */
function getMemberDisplayName(member: Member): string {
  return member.nickname ?? member.user.name ?? member.user.email;
}

/**
 * 清算を計算する
 * シンプルな割り勘計算を行う
 */
export function calculateSettlement(payments: Payment[], members: Member[]): SettlementResult {
  const memberNameMap = new Map<string, string>();
  const userIdToMemberIdMap = new Map<string, string>();

  for (const member of members) {
    memberNameMap.set(member.id, getMemberDisplayName(member));
    userIdToMemberIdMap.set(member.userId, member.id);
  }

  // 各メンバーの支払い額と負担額を計算
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
  for (const payment of payments) {
    totalAmount += payment.amount;

    // 支払者のMemberIdを取得
    const payerMemberId = userIdToMemberIdMap.get(payment.payerId);
    if (payerMemberId) {
      const payerBalance = balanceMap.get(payerMemberId);
      if (payerBalance) {
        payerBalance.paid += payment.amount;
      }
    }

    // 受益者ごとに負担額を計算
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

  // 残高を計算
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

  // 送金計算（貪欲法）
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

  return {
    balances,
    transfers,
    totalAmount,
  };
}
