import { describe, it, expect } from "vitest";
import { calculateSimpleSettlement } from "@/lib/settlement";

const createMember = (
  id: string,
  userId: string,
  name: string,
  nickname: string | null = null
) => ({
  id,
  userId,
  nickname,
  user: {
    id: userId,
    name,
    email: `${name.toLowerCase()}@example.com`,
  },
});

const createPayment = (
  id: string,
  amount: number,
  payerId: string,
  beneficiaryMemberIds: string[]
) => ({
  id,
  amount,
  payerId,
  beneficiaries: beneficiaryMemberIds.map((memberId) => ({ memberId })),
});

describe("calculateSimpleSettlement", () => {
  describe("基本的なシナリオ", () => {
    it("支払いがない場合は空の結果を返す", () => {
      const members = [
        createMember("m1", "u1", "Alice"),
        createMember("m2", "u2", "Bob"),
      ];
      const payments: ReturnType<typeof createPayment>[] = [];

      const result = calculateSimpleSettlement(payments, members);

      expect(result.totalAmount).toBe(0);
      expect(result.transfers).toHaveLength(0);
      expect(result.balances).toHaveLength(2);
      expect(result.balances.every((b) => b.balance === 0)).toBe(true);
    });

    it("1人が全員分を払った場合の計算が正しい", () => {
      const members = [
        createMember("m1", "u1", "Alice"),
        createMember("m2", "u2", "Bob"),
      ];
      const payments = [createPayment("p1", 1000, "u1", ["m1", "m2"])];

      const result = calculateSimpleSettlement(payments, members);

      expect(result.totalAmount).toBe(1000);

      // Aliceは1000円払って500円負担 = +500
      const aliceBalance = result.balances.find((b) => b.memberId === "m1");
      expect(aliceBalance?.paid).toBe(1000);
      expect(aliceBalance?.owed).toBe(500);
      expect(aliceBalance?.balance).toBe(500);

      // Bobは0円払って500円負担 = -500
      const bobBalance = result.balances.find((b) => b.memberId === "m2");
      expect(bobBalance?.paid).toBe(0);
      expect(bobBalance?.owed).toBe(500);
      expect(bobBalance?.balance).toBe(-500);

      // BobがAliceに500円送金
      expect(result.transfers).toHaveLength(1);
      expect(result.transfers[0].from.memberName).toBe("Bob");
      expect(result.transfers[0].to.memberName).toBe("Alice");
      expect(result.transfers[0].amount).toBe(500);
    });

    it("全員が同額を払った場合は送金なし", () => {
      const members = [
        createMember("m1", "u1", "Alice"),
        createMember("m2", "u2", "Bob"),
      ];
      const payments = [
        createPayment("p1", 1000, "u1", ["m1", "m2"]),
        createPayment("p2", 1000, "u2", ["m1", "m2"]),
      ];

      const result = calculateSimpleSettlement(payments, members);

      expect(result.totalAmount).toBe(2000);
      expect(result.transfers).toHaveLength(0);

      // 各自1000円払って1000円負担 = 0
      for (const balance of result.balances) {
        expect(balance.balance).toBe(0);
      }
    });
  });

  describe("複数人のシナリオ", () => {
    it("3人での割り勘が正しく計算される", () => {
      const members = [
        createMember("m1", "u1", "Alice"),
        createMember("m2", "u2", "Bob"),
        createMember("m3", "u3", "Charlie"),
      ];
      const payments = [createPayment("p1", 3000, "u1", ["m1", "m2", "m3"])];

      const result = calculateSimpleSettlement(payments, members);

      expect(result.totalAmount).toBe(3000);

      // Aliceは3000円払って1000円負担 = +2000
      const aliceBalance = result.balances.find((b) => b.memberId === "m1");
      expect(aliceBalance?.balance).toBe(2000);

      // Bob, Charlieはそれぞれ1000円をAliceに送金
      expect(result.transfers).toHaveLength(2);
      const totalTransferToAlice = result.transfers
        .filter((t) => t.to.memberName === "Alice")
        .reduce((sum, t) => sum + t.amount, 0);
      expect(totalTransferToAlice).toBe(2000);
    });

    it("部分的な受益者がいる場合の計算が正しい", () => {
      const members = [
        createMember("m1", "u1", "Alice"),
        createMember("m2", "u2", "Bob"),
        createMember("m3", "u3", "Charlie"),
      ];
      // AliceがBobとCharlie分の食事を払う（Aliceは食べてない）
      const payments = [createPayment("p1", 2000, "u1", ["m2", "m3"])];

      const result = calculateSimpleSettlement(payments, members);

      // Aliceは2000円払って0円負担 = +2000
      const aliceBalance = result.balances.find((b) => b.memberId === "m1");
      expect(aliceBalance?.paid).toBe(2000);
      expect(aliceBalance?.owed).toBe(0);
      expect(aliceBalance?.balance).toBe(2000);

      // Bob, Charlieはそれぞれ1000円負担
      const bobBalance = result.balances.find((b) => b.memberId === "m2");
      expect(bobBalance?.owed).toBe(1000);

      const charlieBalance = result.balances.find((b) => b.memberId === "m3");
      expect(charlieBalance?.owed).toBe(1000);
    });
  });

  describe("ニックネーム", () => {
    it("ニックネームが設定されている場合はニックネームを表示名に使う", () => {
      const members = [
        createMember("m1", "u1", "Alice", "アリス"),
        createMember("m2", "u2", "Bob"),
      ];
      const payments = [createPayment("p1", 1000, "u1", ["m1", "m2"])];

      const result = calculateSimpleSettlement(payments, members);

      const aliceBalance = result.balances.find((b) => b.memberId === "m1");
      expect(aliceBalance?.memberName).toBe("アリス");

      const bobBalance = result.balances.find((b) => b.memberId === "m2");
      expect(bobBalance?.memberName).toBe("Bob");
    });
  });

  describe("端数処理", () => {
    it("割り切れない金額も正しく丸められる", () => {
      const members = [
        createMember("m1", "u1", "Alice"),
        createMember("m2", "u2", "Bob"),
        createMember("m3", "u3", "Charlie"),
      ];
      // 1000 / 3 = 333.33...
      const payments = [createPayment("p1", 1000, "u1", ["m1", "m2", "m3"])];

      const result = calculateSimpleSettlement(payments, members);

      // 各メンバーの負担額は丸められる
      for (const balance of result.balances) {
        expect(Number.isInteger(balance.owed)).toBe(true);
        expect(Number.isInteger(balance.balance)).toBe(true);
      }
    });
  });
});
