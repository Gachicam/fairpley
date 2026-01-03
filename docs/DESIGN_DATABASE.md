---
toc:
  depth_from: 2
  depth_to: 3
---

# fairpley データベース仕様書

本ドキュメントは fairpley のデータベース設計を記述する。

[TOC]

---

## 1. 概要

### 1.1 データベース構成

| 項目         | 値                |
| ------------ | ----------------- |
| DBMS         | PostgreSQL (Neon) |
| ORM          | Prisma 7          |
| 主キー形式   | UUID v7           |
| 文字コード   | UTF-8             |
| タイムゾーン | UTC               |

### 1.2 命名規則

| 対象         | 規則                    | 例                   |
| ------------ | ----------------------- | -------------------- |
| テーブル名   | PascalCase（単数形）    | User, Event, Payment |
| カラム名     | camelCase               | userId, createdAt    |
| 外部キー     | 参照テーブル名 + Id     | eventId, userId      |
| 中間テーブル | テーブル名 + テーブル名 | TripPassenger        |
| インデックス | idx_テーブル名_カラム名 | idx_event_owner_id   |

---

## 2. ER図

```mermaid
erDiagram
    User ||--o{ Account : has
    User ||--o{ Session : has
    User ||--o{ EventMember : joins
    User ||--o{ Payment : pays

    Event ||--o{ EventMember : has
    Event ||--o{ Payment : contains
    Event ||--o{ Trip : has
    Event ||--o{ RentalOption : has
    Event }o--|| User : owned_by

    EventMember ||--o{ Vehicle : owns
    EventMember ||--o{ TripPassenger : rides
    EventMember ||--o{ PaymentBeneficiary : benefits

    Vehicle ||--o{ Trip : used_in

    Location ||--o{ Trip : from
    Location ||--o{ Trip : to

    Trip ||--o{ TripPassenger : has

    Payment ||--o{ PaymentBeneficiary : has

    User {
        string id PK "UUID v7"
        string email UK "メールアドレス"
        string name "表示名"
        string image "プロフィール画像URL"
        enum role "ロール（PENDING/MEMBER/ADMIN）"
        datetime emailVerified "メール確認日時"
        datetime createdAt "作成日時"
        datetime updatedAt "更新日時"
    }

    Account {
        string id PK "UUID v7"
        string userId FK "User.id"
        string type "oauth"
        string provider "google"
        string providerAccountId "プロバイダ側ID"
        string refresh_token "リフレッシュトークン"
        string access_token "アクセストークン"
        int expires_at "有効期限"
        string token_type "トークン種別"
        string scope "スコープ"
        string id_token "IDトークン"
        string session_state "セッション状態"
    }

    Session {
        string id PK "UUID v7"
        string sessionToken UK "セッショントークン"
        string userId FK "User.id"
        datetime expires "有効期限"
    }

    Event {
        string id PK "UUID v7"
        string name "イベント名"
        datetime startDate "開始日"
        datetime endDate "終了日"
        string ownerId FK "User.id"
        int gasPricePerLiter "ガソリン単価"
        datetime createdAt "作成日時"
        datetime updatedAt "更新日時"
    }

    EventMember {
        string id PK "UUID v7"
        string eventId FK "Event.id"
        string userId FK "User.id"
        string nickname "ニックネーム"
        datetime createdAt "作成日時"
    }

    Location {
        string id PK "UUID v7"
        string name "場所名"
        string address "住所"
        float lat "緯度"
        float lng "経度"
        enum type "場所タイプ"
        datetime createdAt "作成日時"
        datetime updatedAt "更新日時"
    }

    Vehicle {
        string id PK "UUID v7"
        string name "車両名"
        enum type "車両タイプ"
        string ownerId FK "EventMember.id"
        int capacity "乗車定員"
        float fuelEfficiency "燃費"
        datetime createdAt "作成日時"
        datetime updatedAt "更新日時"
    }

    RentalOption {
        string id PK "UUID v7"
        string eventId FK "Event.id"
        string name "プラン名"
        string provider "提供者"
        int baseFee "基本料金"
        int distanceFee "距離料金"
        int insuranceFee "保険料"
        int capacity "乗車定員"
        datetime createdAt "作成日時"
        datetime updatedAt "更新日時"
    }

    Trip {
        string id PK "UUID v7"
        string eventId FK "Event.id"
        string vehicleId FK "Vehicle.id"
        string fromId FK "Location.id"
        string toId FK "Location.id"
        float distance "距離"
        datetime createdAt "作成日時"
        datetime updatedAt "更新日時"
    }

    TripPassenger {
        string id PK "UUID v7"
        string tripId FK "Trip.id"
        string memberId FK "EventMember.id"
    }

    Payment {
        string id PK "UUID v7"
        string eventId FK "Event.id"
        string payerId FK "User.id"
        int amount "金額"
        string description "品目"
        enum category "カテゴリ"
        datetime createdAt "作成日時"
        datetime updatedAt "更新日時"
    }

    PaymentBeneficiary {
        string id PK "UUID v7"
        string paymentId FK "Payment.id"
        string memberId FK "EventMember.id"
    }
```

---

## 3. Prisma スキーマ

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// Auth.js 用モデル
// ============================================

model User {
  id            String    @id @default(uuid(7))
  name          String?
  email         String    @unique
  emailVerified DateTime?
  image         String?
  role          UserRole  @default(PENDING)

  accounts Account[]
  sessions Session[]

  // アプリケーション固有のリレーション
  ownedEvents Event[]       @relation("EventOwner")
  memberships EventMember[]
  payments    Payment[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum UserRole {
  PENDING // 承認待ち
  MEMBER  // 一般メンバー
  ADMIN   // 管理者
}

model Account {
  id                String  @id @default(uuid(7))
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@index([userId])
}

model Session {
  id           String   @id @default(uuid(7))
  sessionToken String   @unique
  userId       String
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

model VerificationToken {
  identifier String
  token      String
  expires    DateTime

  @@unique([identifier, token])
}

// ============================================
// アプリケーションモデル
// ============================================

model Event {
  id              String   @id @default(uuid(7))
  name            String   @db.VarChar(100)
  startDate       DateTime
  endDate         DateTime
  gasPricePerLiter Int     @default(170) // ガソリン単価（円/L）

  ownerId String
  owner   User   @relation("EventOwner", fields: [ownerId], references: [id], onDelete: Cascade)

  members       EventMember[]
  payments      Payment[]
  trips         Trip[]
  rentalOptions RentalOption[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([ownerId])
  @@index([startDate])
}

model EventMember {
  id       String  @id @default(uuid(7))
  eventId  String
  userId   String
  nickname String? @db.VarChar(50)

  event Event @relation(fields: [eventId], references: [id], onDelete: Cascade)
  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)

  vehicles             Vehicle[]
  tripPassengers       TripPassenger[]
  paymentBeneficiaries PaymentBeneficiary[]

  createdAt DateTime @default(now())

  @@unique([eventId, userId])
  @@index([eventId])
  @@index([userId])
}

model Location {
  id      String       @id @default(uuid(7))
  name    String       @db.VarChar(100)
  address String?      @db.VarChar(200)
  lat     Float
  lng     Float
  type    LocationType

  tripsFrom Trip[] @relation("TripFrom")
  tripsTo   Trip[] @relation("TripTo")

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum LocationType {
  HOME     // 自宅（集合場所）
  CAMPSITE // キャンプ場
  STORE    // 店舗（買い出し）
  OTHER    // その他
}

model Vehicle {
  id             String      @id @default(uuid(7))
  name           String      @db.VarChar(100)
  type           VehicleType
  ownerId        String?
  capacity       Int         @db.SmallInt
  fuelEfficiency Float?

  owner EventMember? @relation(fields: [ownerId], references: [id], onDelete: SetNull)

  trips Trip[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([ownerId])
}

enum VehicleType {
  OWNED    // 自家用車
  RENTAL   // レンタカー
  CARSHARE // カーシェア
}

model RentalOption {
  id          String  @id @default(uuid(7))
  eventId     String
  name        String  @db.VarChar(100)
  provider    String  @db.VarChar(100)
  baseFee     Int
  distanceFee Int?
  insuranceFee Int?
  capacity    Int     @db.SmallInt

  event Event @relation(fields: [eventId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([eventId])
}

model Trip {
  id        String @id @default(uuid(7))
  eventId   String
  vehicleId String
  fromId    String
  toId      String
  distance  Float? // km

  event   Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  vehicle Vehicle  @relation(fields: [vehicleId], references: [id], onDelete: Cascade)
  from    Location @relation("TripFrom", fields: [fromId], references: [id], onDelete: Cascade)
  to      Location @relation("TripTo", fields: [toId], references: [id], onDelete: Cascade)

  passengers TripPassenger[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([eventId])
  @@index([vehicleId])
}

model TripPassenger {
  id       String @id @default(uuid(7))
  tripId   String
  memberId String

  trip   Trip        @relation(fields: [tripId], references: [id], onDelete: Cascade)
  member EventMember @relation(fields: [memberId], references: [id], onDelete: Cascade)

  @@unique([tripId, memberId])
  @@index([tripId])
  @@index([memberId])
}

model Payment {
  id          String          @id @default(uuid(7))
  eventId     String
  payerId     String
  amount      Int
  description String          @db.VarChar(200)
  category    PaymentCategory

  event Event @relation(fields: [eventId], references: [id], onDelete: Cascade)
  payer User  @relation(fields: [payerId], references: [id], onDelete: Cascade)

  beneficiaries PaymentBeneficiary[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([eventId])
  @@index([payerId])
  @@index([category])
}

enum PaymentCategory {
  FOOD      // 食費
  TRANSPORT // 交通費
  LODGING   // 宿泊費
  EQUIPMENT // 装備・道具
  OTHER     // その他
}

model PaymentBeneficiary {
  id        String @id @default(uuid(7))
  paymentId String
  memberId  String

  payment Payment     @relation(fields: [paymentId], references: [id], onDelete: Cascade)
  member  EventMember @relation(fields: [memberId], references: [id], onDelete: Cascade)

  @@unique([paymentId, memberId])
  @@index([paymentId])
  @@index([memberId])
}
```

---

## 4. テーブル詳細

### 4.1 User（ユーザー）

Auth.js のアダプターが管理するユーザーテーブル。

| カラム        | 型           | NULL | デフォルト | 説明                   |
| ------------- | ------------ | ---- | ---------- | ---------------------- |
| id            | VARCHAR(36)  | NO   | uuid(7)    | 主キー                 |
| name          | VARCHAR(255) | YES  | -          | 表示名                 |
| email         | VARCHAR(255) | NO   | -          | メールアドレス（一意） |
| emailVerified | TIMESTAMP    | YES  | -          | メール確認日時         |
| image         | TEXT         | YES  | -          | プロフィール画像URL    |
| role          | ENUM         | NO   | PENDING    | ロール                 |
| createdAt     | TIMESTAMP    | NO   | now()      | 作成日時               |
| updatedAt     | TIMESTAMP    | NO   | -          | 更新日時               |

**UserRole enum**:

- `PENDING`: 承認待ち
- `MEMBER`: 一般メンバー
- `ADMIN`: 管理者

### 4.2 Event（イベント）

キャンプなどのイベント情報を格納。

| カラム           | 型           | NULL | デフォルト | 説明                 |
| ---------------- | ------------ | ---- | ---------- | -------------------- |
| id               | VARCHAR(36)  | NO   | uuid(7)    | 主キー               |
| name             | VARCHAR(100) | NO   | -          | イベント名           |
| startDate        | TIMESTAMP    | NO   | -          | 開始日               |
| endDate          | TIMESTAMP    | NO   | -          | 終了日               |
| ownerId          | VARCHAR(36)  | NO   | -          | オーナーのUser.id    |
| gasPricePerLiter | INT          | NO   | 170        | ガソリン単価（円/L） |
| createdAt        | TIMESTAMP    | NO   | now()      | 作成日時             |
| updatedAt        | TIMESTAMP    | NO   | -          | 更新日時             |

**制約**:

- endDate >= startDate（アプリ層でバリデーション）
- ownerId は User.id への外部キー

### 4.3 EventMember（イベント参加者）

イベントへの参加者を管理する中間テーブル。

| カラム    | 型          | NULL | デフォルト | 説明                 |
| --------- | ----------- | ---- | ---------- | -------------------- |
| id        | VARCHAR(36) | NO   | uuid(7)    | 主キー               |
| eventId   | VARCHAR(36) | NO   | -          | Event.id             |
| userId    | VARCHAR(36) | NO   | -          | User.id              |
| nickname  | VARCHAR(50) | YES  | -          | イベント内での表示名 |
| createdAt | TIMESTAMP   | NO   | now()      | 作成日時             |

**制約**:

- (eventId, userId) は一意
- eventId と userId は外部キー

### 4.4 Location（場所）

キャンプ場や集合場所などの位置情報。

| カラム    | 型           | NULL | デフォルト | 説明       |
| --------- | ------------ | ---- | ---------- | ---------- |
| id        | VARCHAR(36)  | NO   | uuid(7)    | 主キー     |
| name      | VARCHAR(100) | NO   | -          | 場所名     |
| address   | VARCHAR(200) | YES  | -          | 住所       |
| lat       | DOUBLE       | NO   | -          | 緯度       |
| lng       | DOUBLE       | NO   | -          | 経度       |
| type      | ENUM         | NO   | -          | 場所タイプ |
| createdAt | TIMESTAMP    | NO   | now()      | 作成日時   |
| updatedAt | TIMESTAMP    | NO   | -          | 更新日時   |

**LocationType enum**:

- `HOME`: 自宅（集合場所）
- `CAMPSITE`: キャンプ場
- `STORE`: 店舗（買い出し）
- `OTHER`: その他

### 4.5 Vehicle（車両）

自家用車やレンタカーの情報。

| カラム         | 型           | NULL | デフォルト | 説明                               |
| -------------- | ------------ | ---- | ---------- | ---------------------------------- |
| id             | VARCHAR(36)  | NO   | uuid(7)    | 主キー                             |
| name           | VARCHAR(100) | NO   | -          | 車両名                             |
| type           | ENUM         | NO   | -          | 車両タイプ                         |
| ownerId        | VARCHAR(36)  | YES  | -          | EventMember.id（レンタカーはNULL） |
| capacity       | SMALLINT     | NO   | -          | 乗車定員（2-10）                   |
| fuelEfficiency | DOUBLE       | YES  | -          | 燃費（km/L）                       |
| createdAt      | TIMESTAMP    | NO   | now()      | 作成日時                           |
| updatedAt      | TIMESTAMP    | NO   | -          | 更新日時                           |

**VehicleType enum**:

- `OWNED`: 自家用車
- `RENTAL`: レンタカー
- `CARSHARE`: カーシェア

**注意**: バイク（1人乗り）は非対応。capacity >= 2 とする。

### 4.6 RentalOption（レンタカー料金オプション）

レンタカーやカーシェアの料金プラン。

| カラム       | 型           | NULL | デフォルト | 説明              |
| ------------ | ------------ | ---- | ---------- | ----------------- |
| id           | VARCHAR(36)  | NO   | uuid(7)    | 主キー            |
| eventId      | VARCHAR(36)  | NO   | -          | Event.id          |
| name         | VARCHAR(100) | NO   | -          | プラン名          |
| provider     | VARCHAR(100) | NO   | -          | 提供者（Times等） |
| baseFee      | INT          | NO   | -          | 基本料金（円）    |
| distanceFee  | INT          | YES  | -          | 距離料金（円/km） |
| insuranceFee | INT          | YES  | -          | 保険料（円）      |
| capacity     | SMALLINT     | NO   | -          | 乗車定員          |
| createdAt    | TIMESTAMP    | NO   | now()      | 作成日時          |
| updatedAt    | TIMESTAMP    | NO   | -          | 更新日時          |

### 4.7 Trip（移動記録）

誰がどの車でどこへ移動したかの記録。

| カラム    | 型          | NULL | デフォルト | 説明                 |
| --------- | ----------- | ---- | ---------- | -------------------- |
| id        | VARCHAR(36) | NO   | uuid(7)    | 主キー               |
| eventId   | VARCHAR(36) | NO   | -          | Event.id             |
| vehicleId | VARCHAR(36) | NO   | -          | Vehicle.id           |
| fromId    | VARCHAR(36) | NO   | -          | 出発地の Location.id |
| toId      | VARCHAR(36) | NO   | -          | 目的地の Location.id |
| distance  | DOUBLE      | YES  | -          | 距離（km）           |
| createdAt | TIMESTAMP   | NO   | now()      | 作成日時             |
| updatedAt | TIMESTAMP   | NO   | -          | 更新日時             |

### 4.8 TripPassenger（乗車記録）

各移動での乗車者を管理する中間テーブル。

| カラム   | 型          | NULL | デフォルト | 説明           |
| -------- | ----------- | ---- | ---------- | -------------- |
| id       | VARCHAR(36) | NO   | uuid(7)    | 主キー         |
| tripId   | VARCHAR(36) | NO   | -          | Trip.id        |
| memberId | VARCHAR(36) | NO   | -          | EventMember.id |

**制約**:

- (tripId, memberId) は一意

### 4.9 Payment（支払い）

各参加者の支払い記録。

| カラム      | 型           | NULL | デフォルト | 説明             |
| ----------- | ------------ | ---- | ---------- | ---------------- |
| id          | VARCHAR(36)  | NO   | uuid(7)    | 主キー           |
| eventId     | VARCHAR(36)  | NO   | -          | Event.id         |
| payerId     | VARCHAR(36)  | NO   | -          | 支払者の User.id |
| amount      | INT          | NO   | -          | 金額（円）       |
| description | VARCHAR(200) | NO   | -          | 品目             |
| category    | ENUM         | NO   | -          | カテゴリ         |
| createdAt   | TIMESTAMP    | NO   | now()      | 作成日時         |
| updatedAt   | TIMESTAMP    | NO   | -          | 更新日時         |

**PaymentCategory enum**:

- `FOOD`: 食費
- `TRANSPORT`: 交通費
- `LODGING`: 宿泊費
- `EQUIPMENT`: 装備・道具
- `OTHER`: その他

### 4.10 PaymentBeneficiary（支払いの受益者）

支払いの恩恵を受けた人を管理する中間テーブル。

| カラム    | 型          | NULL | デフォルト | 説明           |
| --------- | ----------- | ---- | ---------- | -------------- |
| id        | VARCHAR(36) | NO   | uuid(7)    | 主キー         |
| paymentId | VARCHAR(36) | NO   | -          | Payment.id     |
| memberId  | VARCHAR(36) | NO   | -          | EventMember.id |

**制約**:

- (paymentId, memberId) は一意

---

## 5. インデックス設計

### 5.1 主キーインデックス

すべてのテーブルの `id` カラムに主キーインデックスが自動作成される。

### 5.2 一意インデックス

| テーブル           | カラム                        | 目的                           |
| ------------------ | ----------------------------- | ------------------------------ |
| User               | email                         | メールアドレスの重複防止       |
| Account            | (provider, providerAccountId) | OAuth プロバイダ ID の重複防止 |
| Session            | sessionToken                  | セッショントークン検索         |
| EventMember        | (eventId, userId)             | 同一ユーザーの重複参加防止     |
| TripPassenger      | (tripId, memberId)            | 同一移動での重複乗車防止       |
| PaymentBeneficiary | (paymentId, memberId)         | 受益者の重複防止               |

### 5.3 外部キーインデックス

| テーブル           | カラム    | 目的                                   |
| ------------------ | --------- | -------------------------------------- |
| Account            | userId    | ユーザーのアカウント一覧取得           |
| Session            | userId    | ユーザーのセッション一覧取得           |
| Event              | ownerId   | ユーザーの所有イベント一覧取得         |
| Event              | startDate | イベントの日付順ソート                 |
| EventMember        | eventId   | イベントの参加者一覧取得               |
| EventMember        | userId    | ユーザーの参加イベント一覧取得         |
| Vehicle            | ownerId   | 参加者の車両一覧取得                   |
| RentalOption       | eventId   | イベントのレンタカーオプション一覧取得 |
| Trip               | eventId   | イベントの移動一覧取得                 |
| Trip               | vehicleId | 車両の使用履歴取得                     |
| TripPassenger      | tripId    | 移動の乗車者一覧取得                   |
| TripPassenger      | memberId  | 参加者の乗車履歴取得                   |
| Payment            | eventId   | イベントの支払い一覧取得               |
| Payment            | payerId   | 支払者の支払い一覧取得                 |
| Payment            | category  | カテゴリ別支払い集計                   |
| PaymentBeneficiary | paymentId | 支払いの受益者一覧取得                 |
| PaymentBeneficiary | memberId  | 参加者の受益履歴取得                   |

---

## 6. マイグレーション戦略

### 6.1 初期マイグレーション

```bash
# 開発環境
npx prisma migrate dev --name init

# 本番環境
npx prisma migrate deploy
```

### 6.2 マイグレーションファイル構成

```text
prisma/
├── schema.prisma          # スキーマ定義
├── migrations/
│   └── 20250103000000_init/
│       └── migration.sql  # 初期マイグレーション
└── seed.ts               # シードデータ（開発用）
```

### 6.3 シードデータ

```typescript
// prisma/seed.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 開発用テストユーザー
  const user1 = await prisma.user.upsert({
    where: { email: "test1@example.com" },
    update: {},
    create: {
      email: "test1@example.com",
      name: "テストユーザー1",
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: "test2@example.com" },
    update: {},
    create: {
      email: "test2@example.com",
      name: "テストユーザー2",
    },
  });

  const user3 = await prisma.user.upsert({
    where: { email: "test3@example.com" },
    update: {},
    create: {
      email: "test3@example.com",
      name: "テストユーザー3",
    },
  });

  // サンプルイベント
  const event = await prisma.event.create({
    data: {
      name: "夏キャンプ2025",
      startDate: new Date("2025-08-01"),
      endDate: new Date("2025-08-03"),
      ownerId: user1.id,
      members: {
        create: [
          { userId: user1.id, nickname: "田中" },
          { userId: user2.id, nickname: "鈴木" },
          { userId: user3.id, nickname: "佐藤" },
        ],
      },
    },
    include: { members: true },
  });

  // サンプル場所（グローバル）
  const home = await prisma.location.create({
    data: {
      name: "田中家",
      address: "東京都渋谷区...",
      lat: 35.6762,
      lng: 139.6503,
      type: "HOME",
    },
  });

  const campsite = await prisma.location.create({
    data: {
      name: "ふもとっぱらキャンプ場",
      address: "静岡県富士宮市...",
      lat: 35.4123,
      lng: 138.5747,
      type: "CAMPSITE",
    },
  });

  // サンプル車両（田中の車）
  const vehicle = await prisma.vehicle.create({
    data: {
      name: "田中のプリウス",
      type: "OWNED",
      ownerId: event.members[0].id,
      capacity: 5,
      fuelEfficiency: 25.0,
    },
  });

  // サンプル移動記録
  await prisma.trip.create({
    data: {
      eventId: event.id,
      vehicleId: vehicle.id,
      fromId: home.id,
      toId: campsite.id,
      distance: 120.5,
      passengers: {
        create: event.members.map((m) => ({ memberId: m.id })),
      },
    },
  });

  // サンプル支払い
  await prisma.payment.create({
    data: {
      eventId: event.id,
      payerId: user1.id,
      amount: 5000,
      description: "ガソリン代",
      category: "TRANSPORT",
      beneficiaries: {
        create: event.members.map((m) => ({ memberId: m.id })),
      },
    },
  });

  await prisma.payment.create({
    data: {
      eventId: event.id,
      payerId: user2.id,
      amount: 8000,
      description: "食材（BBQ用肉）",
      category: "FOOD",
      beneficiaries: {
        create: event.members.map((m) => ({ memberId: m.id })),
      },
    },
  });

  console.log("シードデータを作成しました");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### 6.4 本番運用時の注意

1. **破壊的変更の回避**: カラム削除や型変更は段階的に行う
2. **ダウンタイム最小化**: 大規模なマイグレーションは低トラフィック時に実施
3. **バックアップ**: マイグレーション前に必ずバックアップを取得
4. **ロールバック計画**: マイグレーション失敗時のロールバック SQL を準備

### 6.5 Neon との統合

```typescript
// prisma.config.ts
import path from "node:path";
import type { PrismaConfig } from "prisma";

export default {
  earlyAccess: true,
  schema: path.join("prisma", "schema.prisma"),
} satisfies PrismaConfig;
```

```bash
# Neon への接続設定
DATABASE_URL="postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/fairpley?sslmode=require"
```
