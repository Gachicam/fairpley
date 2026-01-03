---
toc:
  depth_from: 2
  depth_to: 3
---

# fairpley テスト仕様書

本ドキュメントは fairpley のテスト戦略と各テストケースを記述する。

[TOC]

---

## 1. 概要

### 1.1 テスト構成

| 項目                 | 技術                         |
| -------------------- | ---------------------------- |
| テストフレームワーク | Vitest                       |
| E2E テスト           | Playwright                   |
| モック               | vitest-mock-extended         |
| DB テスト            | Prisma + テスト用 PostgreSQL |
| カバレッジ           | v8                           |

### 1.2 テスト分類

| 分類             | 対象                               | 実行頻度    |
| ---------------- | ---------------------------------- | ----------- |
| Unit Test        | Server Actions, ユーティリティ関数 | 毎コミット  |
| Integration Test | DB 操作、API 連携                  | 毎コミット  |
| E2E Test         | ユーザーフロー全体                 | PR マージ前 |

### 1.3 ディレクトリ構造

```text
tests/
├── unit/
│   ├── actions/
│   │   ├── event.test.ts
│   │   ├── member.test.ts
│   │   ├── payment.test.ts
│   │   ├── location.test.ts
│   │   ├── vehicle.test.ts
│   │   ├── trip.test.ts
│   │   ├── settlement.test.ts
│   │   └── admin.test.ts
│   ├── data/
│   │   ├── event.test.ts
│   │   ├── location.test.ts
│   │   └── admin.test.ts
│   └── lib/
│       ├── access.test.ts
│       ├── errors.test.ts
│       └── google-maps.test.ts
├── integration/
│   ├── db/
│   │   ├── event.test.ts
│   │   ├── payment.test.ts
│   │   └── settlement.test.ts
│   └── api/
│       └── auth.test.ts
├── e2e/
│   ├── auth.spec.ts
│   ├── event.spec.ts
│   ├── payment.spec.ts
│   ├── settlement.spec.ts
│   └── admin.spec.ts
├── fixtures/
│   ├── users.ts
│   ├── events.ts
│   ├── payments.ts
│   └── locations.ts
├── mocks/
│   ├── auth.ts
│   ├── prisma.ts
│   └── google-maps.ts
└── setup.ts
```

---

## 2. テストユーティリティ

### 2.1 モック設定

#### 認証モック

```typescript
// tests/mocks/auth.ts
import { vi } from "vitest";

export const mockSession = (user: {
  id: string;
  role: "PENDING" | "MEMBER" | "ADMIN";
  email?: string;
  name?: string;
}) => {
  return {
    user: {
      id: user.id,
      role: user.role,
      email: user.email ?? "test@example.com",
      name: user.name ?? "Test User",
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
};

export const mockAuth = (session: ReturnType<typeof mockSession> | null) => {
  vi.mock("@/lib/auth", () => ({
    auth: vi.fn().mockResolvedValue(session),
  }));
};
```

#### Prisma モック

```typescript
// tests/mocks/prisma.ts
import { PrismaClient } from "@prisma/client";
import { mockDeep, mockReset, DeepMockProxy } from "vitest-mock-extended";

export const prismaMock = mockDeep<PrismaClient>();

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

beforeEach(() => {
  mockReset(prismaMock);
});
```

#### Google Maps API モック

```typescript
// tests/mocks/google-maps.ts
import { vi } from "vitest";

export const mockSearchPlaces = vi.fn().mockResolvedValue([
  {
    name: "ふもとっぱらキャンプ場",
    address: "静岡県富士宮市麓156",
    lat: 35.4123,
    lng: 138.5747,
  },
]);

export const mockGetDistance = vi.fn().mockResolvedValue({
  distanceMeters: 120500,
  durationSeconds: 5400,
});

vi.mock("@/lib/google-maps", () => ({
  searchPlaces: mockSearchPlaces,
  getDistance: mockGetDistance,
}));
```

### 2.2 フィクスチャ

#### ユーザーフィクスチャ

```typescript
// tests/fixtures/users.ts
export const testUsers = {
  admin: {
    id: "user-admin-001",
    email: "admin@example.com",
    name: "管理者",
    role: "ADMIN" as const,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
  },
  member: {
    id: "user-member-001",
    email: "member@example.com",
    name: "一般メンバー",
    role: "MEMBER" as const,
    createdAt: new Date("2025-01-02"),
    updatedAt: new Date("2025-01-02"),
  },
  pending: {
    id: "user-pending-001",
    email: "pending@example.com",
    name: "承認待ち",
    role: "PENDING" as const,
    createdAt: new Date("2025-01-03"),
    updatedAt: new Date("2025-01-03"),
  },
};
```

#### イベントフィクスチャ

```typescript
// tests/fixtures/events.ts
import { testUsers } from "./users";

export const testEvents = {
  summerCamp: {
    id: "event-001",
    name: "夏キャンプ2025",
    startDate: new Date("2025-08-01"),
    endDate: new Date("2025-08-03"),
    gasPricePerLiter: 170,
    ownerId: testUsers.admin.id,
    createdAt: new Date("2025-07-01"),
    updatedAt: new Date("2025-07-01"),
  },
};

export const testEventMembers = {
  owner: {
    id: "member-001",
    eventId: testEvents.summerCamp.id,
    userId: testUsers.admin.id,
    nickname: "田中",
    createdAt: new Date("2025-07-01"),
  },
  participant: {
    id: "member-002",
    eventId: testEvents.summerCamp.id,
    userId: testUsers.member.id,
    nickname: "鈴木",
    createdAt: new Date("2025-07-01"),
  },
};
```

#### 支払いフィクスチャ

```typescript
// tests/fixtures/payments.ts
import { testEvents, testEventMembers } from "./events";
import { testUsers } from "./users";

export const testPayments = {
  food: {
    id: "payment-001",
    eventId: testEvents.summerCamp.id,
    payerId: testUsers.admin.id,
    amount: 8000,
    description: "BBQ食材",
    category: "FOOD" as const,
    createdAt: new Date("2025-08-01"),
    updatedAt: new Date("2025-08-01"),
  },
  transport: {
    id: "payment-002",
    eventId: testEvents.summerCamp.id,
    payerId: testUsers.member.id,
    amount: 5000,
    description: "ガソリン代",
    category: "TRANSPORT" as const,
    createdAt: new Date("2025-08-01"),
    updatedAt: new Date("2025-08-01"),
  },
};

export const testBeneficiaries = {
  food_all: [
    { id: "ben-001", paymentId: testPayments.food.id, memberId: testEventMembers.owner.id },
    { id: "ben-002", paymentId: testPayments.food.id, memberId: testEventMembers.participant.id },
  ],
};
```

---

## 3. ユニットテスト

### 3.1 認証機能

#### ミドルウェアテスト

```typescript
// tests/unit/lib/middleware.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Middleware", () => {
  describe("未認証ユーザー", () => {
    it("ログインページ以外にアクセスした場合、/login にリダイレクトされる", async () => {
      // Arrange
      const req = createMockRequest("/");
      mockAuth(null);

      // Act
      const response = await middleware(req);

      // Assert
      expect(response?.headers.get("Location")).toBe("/login");
    });

    it("ログインページにはアクセスできる", async () => {
      // Arrange
      const req = createMockRequest("/login");
      mockAuth(null);

      // Act
      const response = await middleware(req);

      // Assert
      expect(response).toBeUndefined();
    });
  });

  describe("PENDING ユーザー", () => {
    it("/pending 以外にアクセスした場合、/pending にリダイレクトされる", async () => {
      // Arrange
      const req = createMockRequest("/");
      mockAuth(mockSession({ id: "user-1", role: "PENDING" }));

      // Act
      const response = await middleware(req);

      // Assert
      expect(response?.headers.get("Location")).toBe("/pending");
    });

    it("/pending にはアクセスできる", async () => {
      // Arrange
      const req = createMockRequest("/pending");
      mockAuth(mockSession({ id: "user-1", role: "PENDING" }));

      // Act
      const response = await middleware(req);

      // Assert
      expect(response).toBeUndefined();
    });
  });

  describe("MEMBER ユーザー", () => {
    it("管理者ルートにアクセスした場合、/ にリダイレクトされる", async () => {
      // Arrange
      const req = createMockRequest("/admin/users");
      mockAuth(mockSession({ id: "user-1", role: "MEMBER" }));

      // Act
      const response = await middleware(req);

      // Assert
      expect(response?.headers.get("Location")).toBe("/");
    });
  });

  describe("ADMIN ユーザー", () => {
    it("管理者ルートにアクセスできる", async () => {
      // Arrange
      const req = createMockRequest("/admin/users");
      mockAuth(mockSession({ id: "user-1", role: "ADMIN" }));

      // Act
      const response = await middleware(req);

      // Assert
      expect(response).toBeUndefined();
    });
  });
});
```

### 3.2 イベント管理機能

#### createEvent テスト

```typescript
// tests/unit/actions/event.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createEvent } from "@/actions/event";
import { prismaMock } from "../../mocks/prisma";
import { mockAuth, mockSession } from "../../mocks/auth";
import { testUsers } from "../../fixtures/users";

describe("createEvent", () => {
  beforeEach(() => {
    mockAuth(mockSession({ id: testUsers.member.id, role: "MEMBER" }));
  });

  it("有効なデータでイベントを作成できる", async () => {
    // Arrange
    const formData = new FormData();
    formData.set("name", "テストキャンプ");
    formData.set("startDate", "2025-08-01");
    formData.set("endDate", "2025-08-03");

    prismaMock.event.create.mockResolvedValue({
      id: "new-event-id",
      name: "テストキャンプ",
      startDate: new Date("2025-08-01"),
      endDate: new Date("2025-08-03"),
      gasPricePerLiter: 170,
      ownerId: testUsers.member.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Act & Assert
    await expect(createEvent(formData)).rejects.toThrow(); // redirect throws
    expect(prismaMock.event.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "テストキャンプ",
        ownerId: testUsers.member.id,
        members: {
          create: { userId: testUsers.member.id },
        },
      }),
    });
  });

  it("イベント名が空の場合、エラーを返す", async () => {
    // Arrange
    const formData = new FormData();
    formData.set("name", "");
    formData.set("startDate", "2025-08-01");
    formData.set("endDate", "2025-08-03");

    // Act
    const result = await createEvent(formData);

    // Assert
    expect(result?.error?.name).toContain("イベント名は必須です");
  });

  it("終了日が開始日より前の場合、エラーを返す", async () => {
    // Arrange
    const formData = new FormData();
    formData.set("name", "テストキャンプ");
    formData.set("startDate", "2025-08-03");
    formData.set("endDate", "2025-08-01");

    // Act
    const result = await createEvent(formData);

    // Assert
    expect(result?.error?.endDate).toContain("終了日は開始日以降にしてください");
  });

  it("未認証の場合、エラーをスローする", async () => {
    // Arrange
    mockAuth(null);
    const formData = new FormData();
    formData.set("name", "テストキャンプ");
    formData.set("startDate", "2025-08-01");
    formData.set("endDate", "2025-08-03");

    // Act & Assert
    await expect(createEvent(formData)).rejects.toThrow("認証が必要です");
  });
});
```

#### deleteEvent テスト

```typescript
describe("deleteEvent", () => {
  it("オーナーはイベントを削除できる", async () => {
    // Arrange
    mockAuth(mockSession({ id: testUsers.admin.id, role: "ADMIN" }));
    prismaMock.event.findUnique.mockResolvedValue({
      ...testEvents.summerCamp,
      ownerId: testUsers.admin.id,
    });

    // Act & Assert
    await expect(deleteEvent(testEvents.summerCamp.id)).rejects.toThrow(); // redirect
    expect(prismaMock.event.delete).toHaveBeenCalled();
  });

  it("オーナー以外はイベントを削除できない", async () => {
    // Arrange
    mockAuth(mockSession({ id: testUsers.member.id, role: "MEMBER" }));
    prismaMock.event.findUnique.mockResolvedValue({
      ...testEvents.summerCamp,
      ownerId: testUsers.admin.id,
    });

    // Act & Assert
    await expect(deleteEvent(testEvents.summerCamp.id)).rejects.toThrow(
      "イベントの削除権限がありません"
    );
  });
});
```

### 3.3 支払い機能

#### addPayment テスト

```typescript
// tests/unit/actions/payment.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { addPayment, updatePayment, deletePayment } from "@/actions/payment";

describe("addPayment", () => {
  beforeEach(() => {
    mockAuth(mockSession({ id: testUsers.member.id, role: "MEMBER" }));
    prismaMock.event.findFirst.mockResolvedValue(testEvents.summerCamp);
  });

  it("有効なデータで支払いを追加できる", async () => {
    // Arrange
    const formData = new FormData();
    formData.set("eventId", testEvents.summerCamp.id);
    formData.set("payerId", testUsers.member.id);
    formData.set("amount", "8000");
    formData.set("description", "BBQ食材");
    formData.set("category", "FOOD");
    formData.append("beneficiaryIds", testEventMembers.owner.id);
    formData.append("beneficiaryIds", testEventMembers.participant.id);

    prismaMock.payment.create.mockResolvedValue(testPayments.food);

    // Act & Assert
    await expect(addPayment(formData)).rejects.toThrow(); // redirect
    expect(prismaMock.payment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventId: testEvents.summerCamp.id,
        payerId: testUsers.member.id,
        amount: 8000,
        description: "BBQ食材",
        category: "FOOD",
      }),
    });
  });

  it("金額が0以下の場合、エラーを返す", async () => {
    // Arrange
    const formData = new FormData();
    formData.set("eventId", testEvents.summerCamp.id);
    formData.set("payerId", testUsers.member.id);
    formData.set("amount", "0");
    formData.set("description", "テスト");
    formData.set("category", "FOOD");
    formData.append("beneficiaryIds", testEventMembers.owner.id);

    // Act
    const result = await addPayment(formData);

    // Assert
    expect(result?.error?.amount).toContain("金額は1円以上にしてください");
  });

  it("受益者が選択されていない場合、エラーを返す", async () => {
    // Arrange
    const formData = new FormData();
    formData.set("eventId", testEvents.summerCamp.id);
    formData.set("payerId", testUsers.member.id);
    formData.set("amount", "1000");
    formData.set("description", "テスト");
    formData.set("category", "FOOD");
    // beneficiaryIds を設定しない

    // Act
    const result = await addPayment(formData);

    // Assert
    expect(result?.error?.beneficiaryIds).toContain("受益者を選択してください");
  });

  it("イベント参加者でない場合、エラーをスローする", async () => {
    // Arrange
    prismaMock.event.findFirst.mockResolvedValue(null);
    const formData = new FormData();
    formData.set("eventId", "non-existent-event");
    formData.set("payerId", testUsers.member.id);
    formData.set("amount", "1000");
    formData.set("description", "テスト");
    formData.set("category", "FOOD");
    formData.append("beneficiaryIds", testEventMembers.owner.id);

    // Act & Assert
    await expect(addPayment(formData)).rejects.toThrow(
      "イベントにアクセスする権限がありません"
    );
  });
});

describe("updatePayment（性善説）", () => {
  it("イベント参加者であれば誰でも支払いを更新できる", async () => {
    // Arrange - 支払者でない参加者が更新を試みる
    mockAuth(mockSession({ id: testUsers.member.id, role: "MEMBER" }));
    prismaMock.event.findFirst.mockResolvedValue(testEvents.summerCamp);

    const formData = new FormData();
    formData.set("id", testPayments.food.id);
    formData.set("eventId", testEvents.summerCamp.id);
    formData.set("payerId", testUsers.admin.id); // 別のユーザーを支払者に
    formData.set("amount", "10000");
    formData.set("description", "更新後のBBQ食材");
    formData.set("category", "FOOD");
    formData.append("beneficiaryIds", testEventMembers.owner.id);

    // Act
    await updatePayment(formData);

    // Assert
    expect(prismaMock.$transaction).toHaveBeenCalled();
  });
});

describe("deletePayment（性善説）", () => {
  it("イベント参加者であれば誰でも支払いを削除できる", async () => {
    // Arrange
    mockAuth(mockSession({ id: testUsers.member.id, role: "MEMBER" }));
    prismaMock.event.findFirst.mockResolvedValue(testEvents.summerCamp);

    // Act
    await deletePayment(testEvents.summerCamp.id, testPayments.food.id);

    // Assert
    expect(prismaMock.payment.delete).toHaveBeenCalledWith({
      where: { id: testPayments.food.id },
    });
  });
});
```

### 3.4 清算計算機能

#### calculateSettlement テスト

```typescript
// tests/unit/actions/settlement.test.ts
import { describe, it, expect } from "vitest";
import { calculateSettlement } from "@/actions/settlement";

describe("calculateSettlement", () => {
  it("支払いと受益者に基づいて清算額を計算する", async () => {
    // Arrange
    mockAuth(mockSession({ id: testUsers.member.id, role: "MEMBER" }));
    prismaMock.event.findUnique.mockResolvedValue({
      ...testEvents.summerCamp,
      members: [
        { ...testEventMembers.owner, user: testUsers.admin, vehicles: [] },
        { ...testEventMembers.participant, user: testUsers.member, vehicles: [] },
      ],
      payments: [
        {
          ...testPayments.food,
          beneficiaries: [
            { memberId: testEventMembers.owner.id },
            { memberId: testEventMembers.participant.id },
          ],
        },
      ],
      trips: [],
      rentalOptions: [],
    });

    // Act
    const result = await calculateSettlement(testEvents.summerCamp.id);

    // Assert
    expect(result.contributions).toHaveLength(2);
    expect(result.repayments).toBeDefined();

    // 田中が8000円払って、2人で均等割り（4000円ずつ）
    const tanaka = result.contributions.find((c) => c.name === "田中");
    const suzuki = result.contributions.find((c) => c.name === "鈴木");

    expect(tanaka?.paid).toBe(8000);
    expect(tanaka?.shouldPay).toBe(4000);
    expect(suzuki?.paid).toBe(0);
    expect(suzuki?.shouldPay).toBe(4000);
  });

  it("支払いがない場合、空の清算リストを返す", async () => {
    // Arrange
    mockAuth(mockSession({ id: testUsers.member.id, role: "MEMBER" }));
    prismaMock.event.findUnique.mockResolvedValue({
      ...testEvents.summerCamp,
      members: [{ ...testEventMembers.owner, user: testUsers.admin, vehicles: [] }],
      payments: [],
      trips: [],
      rentalOptions: [],
    });

    // Act
    const result = await calculateSettlement(testEvents.summerCamp.id);

    // Assert
    expect(result.repayments).toHaveLength(0);
  });

  it("交通費はシャープレイ値で計算される", async () => {
    // Arrange
    const vehicleOwner = {
      ...testEventMembers.owner,
      user: testUsers.admin,
      vehicles: [
        {
          id: "vehicle-001",
          name: "田中のプリウス",
          type: "OWNED",
          capacity: 5,
          fuelEfficiency: 25,
        },
      ],
    };

    mockAuth(mockSession({ id: testUsers.member.id, role: "MEMBER" }));
    prismaMock.event.findUnique.mockResolvedValue({
      ...testEvents.summerCamp,
      members: [
        vehicleOwner,
        { ...testEventMembers.participant, user: testUsers.member, vehicles: [] },
      ],
      payments: [
        {
          ...testPayments.transport,
          beneficiaries: [
            { memberId: testEventMembers.owner.id },
            { memberId: testEventMembers.participant.id },
          ],
        },
      ],
      trips: [
        {
          id: "trip-001",
          eventId: testEvents.summerCamp.id,
          vehicleId: "vehicle-001",
          vehicle: vehicleOwner.vehicles[0],
          distance: 100,
          passengers: [
            { memberId: testEventMembers.owner.id },
            { memberId: testEventMembers.participant.id },
          ],
        },
      ],
      rentalOptions: [],
    });

    // Act
    const result = await calculateSettlement(testEvents.summerCamp.id);

    // Assert
    expect(result.shapleyValues).toHaveLength(2);
    // 車を提供した田中のシャープレイ値が高い（負担額が低い）ことを確認
    const tanakaShapley = result.shapleyValues.find((s) => s.name === "田中");
    const suzukiShapley = result.shapleyValues.find((s) => s.name === "鈴木");
    expect(tanakaShapley?.value).toBeLessThan(suzukiShapley?.value ?? 0);
  });
});
```

### 3.5 管理者機能

#### approveUser テスト

```typescript
// tests/unit/actions/admin.test.ts
import { describe, it, expect } from "vitest";
import { approveUser, promoteToAdmin, rejectUser } from "@/actions/admin";

describe("approveUser", () => {
  it("管理者はユーザーを承認できる", async () => {
    // Arrange
    mockAuth(mockSession({ id: testUsers.admin.id, role: "ADMIN" }));

    // Act
    await approveUser(testUsers.pending.id);

    // Assert
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: testUsers.pending.id },
      data: { role: "MEMBER" },
    });
  });

  it("管理者以外はユーザーを承認できない", async () => {
    // Arrange
    mockAuth(mockSession({ id: testUsers.member.id, role: "MEMBER" }));

    // Act & Assert
    await expect(approveUser(testUsers.pending.id)).rejects.toThrow(
      "管理者権限が必要です"
    );
  });
});

describe("rejectUser", () => {
  it("管理者はユーザーを拒否（削除）できる", async () => {
    // Arrange
    mockAuth(mockSession({ id: testUsers.admin.id, role: "ADMIN" }));

    // Act
    await rejectUser(testUsers.pending.id);

    // Assert
    expect(prismaMock.user.delete).toHaveBeenCalledWith({
      where: { id: testUsers.pending.id },
    });
  });

  it("自分自身は削除できない", async () => {
    // Arrange
    mockAuth(mockSession({ id: testUsers.admin.id, role: "ADMIN" }));

    // Act & Assert
    await expect(rejectUser(testUsers.admin.id)).rejects.toThrow(
      "自分自身を削除することはできません"
    );
  });
});
```

### 3.6 場所管理機能

```typescript
// tests/unit/actions/location.test.ts
describe("addLocation", () => {
  it("認証済みユーザーは場所を追加できる", async () => {
    // Arrange
    mockAuth(mockSession({ id: testUsers.member.id, role: "MEMBER" }));
    const formData = new FormData();
    formData.set("eventId", testEvents.summerCamp.id);
    formData.set("name", "ふもとっぱらキャンプ場");
    formData.set("address", "静岡県富士宮市麓156");
    formData.set("lat", "35.4123");
    formData.set("lng", "138.5747");
    formData.set("type", "CAMPSITE");

    // Act
    await addLocation(formData);

    // Assert
    expect(prismaMock.location.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "ふもとっぱらキャンプ場",
        type: "CAMPSITE",
      }),
    });
  });
});

describe("getLocations", () => {
  it("全ての場所を取得できる", async () => {
    // Arrange
    mockAuth(mockSession({ id: testUsers.member.id, role: "MEMBER" }));
    const mockLocations = [
      { id: "loc-1", name: "田中家", type: "HOME" },
      { id: "loc-2", name: "ふもとっぱら", type: "CAMPSITE" },
    ];
    prismaMock.location.findMany.mockResolvedValue(mockLocations);

    // Act
    const result = await getLocations();

    // Assert
    expect(result).toHaveLength(2);
    expect(prismaMock.location.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
    });
  });
});
```

---

## 4. 統合テスト

### 4.1 データベース統合テスト

```typescript
// tests/integration/db/event.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

describe("Event DB Integration", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // テストデータをクリーンアップ
    await prisma.event.deleteMany({
      where: { name: { startsWith: "TEST_" } },
    });
  });

  it("イベントを作成し、参加者と支払いを含めて取得できる", async () => {
    // Arrange
    const user = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        name: "テストユーザー",
        role: "MEMBER",
      },
    });

    // Act
    const event = await prisma.event.create({
      data: {
        name: "TEST_統合テストイベント",
        startDate: new Date("2025-08-01"),
        endDate: new Date("2025-08-03"),
        ownerId: user.id,
        members: {
          create: { userId: user.id, nickname: "テスト" },
        },
      },
      include: { members: true },
    });

    // Assert
    expect(event.name).toBe("TEST_統合テストイベント");
    expect(event.members).toHaveLength(1);

    // Cleanup
    await prisma.event.delete({ where: { id: event.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });

  it("カスケード削除が正しく動作する", async () => {
    // Arrange
    const user = await prisma.user.create({
      data: {
        email: `test-cascade-${Date.now()}@example.com`,
        name: "カスケードテスト",
        role: "MEMBER",
      },
    });

    const event = await prisma.event.create({
      data: {
        name: "TEST_カスケード削除テスト",
        startDate: new Date("2025-08-01"),
        endDate: new Date("2025-08-03"),
        ownerId: user.id,
        members: {
          create: { userId: user.id },
        },
        payments: {
          create: {
            payerId: user.id,
            amount: 1000,
            description: "テスト支払い",
            category: "OTHER",
          },
        },
      },
    });

    // Act
    await prisma.event.delete({ where: { id: event.id } });

    // Assert
    const members = await prisma.eventMember.findMany({
      where: { eventId: event.id },
    });
    const payments = await prisma.payment.findMany({
      where: { eventId: event.id },
    });

    expect(members).toHaveLength(0);
    expect(payments).toHaveLength(0);

    // Cleanup
    await prisma.user.delete({ where: { id: user.id } });
  });
});
```

### 4.2 清算計算統合テスト

```typescript
// tests/integration/db/settlement.test.ts
describe("Settlement Calculation Integration", () => {
  it("複数の支払いと移動記録から正しく清算額を計算する", async () => {
    // Arrange - 3人のユーザーを作成
    const users = await Promise.all([
      prisma.user.create({ data: { email: `test1-${Date.now()}@test.com`, name: "A", role: "MEMBER" } }),
      prisma.user.create({ data: { email: `test2-${Date.now()}@test.com`, name: "B", role: "MEMBER" } }),
      prisma.user.create({ data: { email: `test3-${Date.now()}@test.com`, name: "C", role: "MEMBER" } }),
    ]);

    const event = await prisma.event.create({
      data: {
        name: "TEST_清算テスト",
        startDate: new Date(),
        endDate: new Date(),
        ownerId: users[0].id,
        members: {
          create: users.map((u) => ({ userId: u.id })),
        },
      },
      include: { members: true },
    });

    // A が 9000円、B が 3000円支払い、全員が受益者
    await prisma.payment.create({
      data: {
        eventId: event.id,
        payerId: users[0].id,
        amount: 9000,
        description: "食費",
        category: "FOOD",
        beneficiaries: {
          create: event.members.map((m) => ({ memberId: m.id })),
        },
      },
    });

    await prisma.payment.create({
      data: {
        eventId: event.id,
        payerId: users[1].id,
        amount: 3000,
        description: "飲み物",
        category: "FOOD",
        beneficiaries: {
          create: event.members.map((m) => ({ memberId: m.id })),
        },
      },
    });

    // Act
    const result = await calculateSettlement(event.id);

    // Assert
    // 総額 12000円、1人あたり 4000円
    expect(result.contributions).toHaveLength(3);

    const contributionA = result.contributions.find((c) => c.name === "A");
    const contributionB = result.contributions.find((c) => c.name === "B");
    const contributionC = result.contributions.find((c) => c.name === "C");

    expect(contributionA?.paid).toBe(9000);
    expect(contributionA?.shouldPay).toBe(4000);
    expect(contributionB?.paid).toBe(3000);
    expect(contributionB?.shouldPay).toBe(4000);
    expect(contributionC?.paid).toBe(0);
    expect(contributionC?.shouldPay).toBe(4000);

    // 清算リスト: C → A に 4000円、B → A に 1000円
    expect(result.repayments.length).toBeGreaterThan(0);

    // Cleanup
    await prisma.event.delete({ where: { id: event.id } });
    await Promise.all(users.map((u) => prisma.user.delete({ where: { id: u.id } })));
  });
});
```

---

## 5. E2E テスト

### 5.1 認証フロー

```typescript
// tests/e2e/auth.spec.ts
import { test, expect } from "@playwright/test";

test.describe("認証フロー", () => {
  test("未認証ユーザーはログインページにリダイレクトされる", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/login");
  });

  test("Googleログインボタンが表示される", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: /google/i })).toBeVisible();
  });

  test("承認待ちユーザーは /pending にリダイレクトされる", async ({ page }) => {
    // 承認待ちユーザーとしてログイン（テスト用認証をバイパス）
    await page.goto("/");
    // ... 認証状態をモック
    await expect(page).toHaveURL("/pending");
    await expect(page.getByText("承認待ち")).toBeVisible();
  });
});
```

### 5.2 イベント管理フロー

```typescript
// tests/e2e/event.spec.ts
import { test, expect } from "@playwright/test";

test.describe("イベント管理", () => {
  test.beforeEach(async ({ page }) => {
    // テストユーザーでログイン
    await loginAsTestUser(page);
  });

  test("イベントを作成できる", async ({ page }) => {
    await page.goto("/events/new");

    await page.getByLabel("イベント名").fill("E2Eテストキャンプ");
    await page.getByLabel("開始日").fill("2025-08-01");
    await page.getByLabel("終了日").fill("2025-08-03");
    await page.getByRole("button", { name: "作成する" }).click();

    await expect(page).toHaveURL(/\/events\/[a-z0-9-]+/);
    await expect(page.getByText("E2Eテストキャンプ")).toBeVisible();
  });

  test("参加者を追加できる", async ({ page }) => {
    await page.goto("/events/test-event-id");

    await page.getByRole("button", { name: "追加" }).click();
    await page.getByLabel("メールアドレス").fill("new-member@example.com");
    await page.getByLabel("ニックネーム").fill("新メンバー");
    await page.getByRole("button", { name: "追加" }).last().click();

    await expect(page.getByText("新メンバー")).toBeVisible();
  });

  test("イベントを削除できる（オーナーのみ）", async ({ page }) => {
    await page.goto("/events/test-event-id");

    await page.getByRole("button", { name: "削除" }).click();
    await page.getByRole("button", { name: "削除する" }).click();

    await expect(page).toHaveURL("/");
  });
});
```

### 5.3 支払いフロー

```typescript
// tests/e2e/payment.spec.ts
import { test, expect } from "@playwright/test";

test.describe("支払い管理", () => {
  test("支払いを登録できる", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/events/test-event-id/payments/new");

    // 支払者を選択（デフォルトはログインユーザー）
    await page.getByLabel("支払者").selectOption("member-001");
    await page.getByLabel("金額").fill("8000");
    await page.getByLabel("品目").fill("BBQ食材");
    await page.getByLabel("カテゴリ").selectOption("FOOD");
    await page.getByLabel("田中").check();
    await page.getByLabel("鈴木").check();
    await page.getByRole("button", { name: "登録する" }).click();

    await expect(page).toHaveURL(/\/events\/[a-z0-9-]+/);
    await expect(page.getByText("BBQ食材")).toBeVisible();
    await expect(page.getByText("8,000円")).toBeVisible();
  });

  test("支払いを編集できる（性善説: 誰でも編集可能）", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/events/test-event-id/payments");

    await page.getByRole("button", { name: "編集" }).first().click();
    await page.getByLabel("金額").clear();
    await page.getByLabel("金額").fill("10000");
    await page.getByRole("button", { name: "保存" }).click();

    await expect(page.getByText("10,000円")).toBeVisible();
  });

  test("支払いを削除できる（性善説: 誰でも削除可能）", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/events/test-event-id/payments");

    const paymentCount = await page.getByTestId("payment-card").count();
    await page.getByRole("button", { name: "削除" }).first().click();
    await page.getByRole("button", { name: "削除する" }).click();

    await expect(page.getByTestId("payment-card")).toHaveCount(paymentCount - 1);
  });
});
```

### 5.4 清算フロー

```typescript
// tests/e2e/settlement.spec.ts
import { test, expect } from "@playwright/test";

test.describe("清算", () => {
  test("清算結果が表示される", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/events/test-event-id/settlement");

    await expect(page.getByText("負担額計算")).toBeVisible();
    await expect(page.getByText("清算リスト")).toBeVisible();
  });

  test("シャープレイ値が表示される", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/events/test-event-id/settlement");

    // シャープレイ値のセクションが表示されることを確認
    await expect(page.getByText("シャープレイ値")).toBeVisible();
  });
});
```

### 5.5 管理者フロー

```typescript
// tests/e2e/admin.spec.ts
import { test, expect } from "@playwright/test";

test.describe("管理者機能", () => {
  test("管理者はユーザー管理ページにアクセスできる", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/users");

    await expect(page.getByText("ユーザー管理")).toBeVisible();
  });

  test("管理者以外はユーザー管理ページにアクセスできない", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/admin/users");

    await expect(page).toHaveURL("/");
  });

  test("承認待ちユーザーを承認できる", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/users");

    await page.getByRole("button", { name: "承認" }).first().click();

    await expect(page.getByText("承認しました")).toBeVisible();
  });
});
```

---

## 6. テスト実行

### 6.1 コマンド

```bash
# 全テスト実行
npm run test

# ユニットテストのみ
npm run test:unit

# 統合テストのみ
npm run test:integration

# E2E テストのみ
npm run test:e2e

# カバレッジレポート生成
npm run test:coverage

# ウォッチモード
npm run test:watch
```

### 6.2 package.json 設定

```json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration",
    "test:e2e": "playwright test",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest"
  }
}
```

### 6.3 vitest.config.ts

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "tests/"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

### 6.4 playwright.config.ts

```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## 7. テストカバレッジ目標

| 分類           | 目標カバレッジ |
| -------------- | -------------- |
| Server Actions | 90%以上        |
| データ取得関数 | 80%以上        |
| ユーティリティ | 80%以上        |
| 全体           | 70%以上        |

### 7.1 重点テスト項目

| 機能              | 優先度 | 理由                               |
| ----------------- | ------ | ---------------------------------- |
| 認証・認可        | 高     | セキュリティに直結                 |
| 支払い CRUD       | 高     | コアビジネスロジック               |
| 清算計算          | 高     | シャープレイ値の正確性が重要       |
| イベント CRUD     | 中     | 基本機能                           |
| 場所・車両管理    | 中     | 補助機能                           |
| UI コンポーネント | 低     | ビジュアルリグレッションは別途対応 |
