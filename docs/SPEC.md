# fairpley 仕様書

**fairpley** は、キャンプなどのグループイベントにおける費用分担を公平に計算するアプリケーション。シャープレイ値を用いて各参加者の貢献度を評価し、公平な費用分担と清算を行う。

## ユースケース

### メインユースケース: キャンプ費用分担

1. イベント（キャンプ）を作成
2. 参加者を登録
3. 各参加者の支払い（食材、交通費、キャンプ場代など）を記録
4. 各参加者が受けた恩恵（食事、送迎など）を記録
5. シャープレイ値で公平な負担額を計算
6. 清算（誰が誰にいくら払うか）を算出

## 機能要件

### 認証

- **方式**: Auth.js v5 + Google OAuth
- ログイン必須（イベント作成・閲覧に認証が必要）
- ユーザー情報は Google アカウントから取得
- **管理者承認制**: 新規ユーザーは管理者の承認が必要
  - 初回登録ユーザーは自動的に管理者（ADMIN）になる
  - 以降のユーザーは承認待ち（PENDING）で登録
  - 管理者が承認すると一般メンバー（MEMBER）になる
  - 管理者は他のユーザーを管理者に昇格可能

### イベント管理

| 機能         | 説明                             |
| ------------ | -------------------------------- |
| イベント作成 | 名前、開始日、終了日を設定       |
| 参加者追加   | イベントに参加するメンバーを登録 |
| イベント共有 | 他のユーザーを招待（将来対応）   |

### 支払い記録

| フィールド | 型       | 説明                     |
| ---------- | -------- | ------------------------ |
| 支払者     | Person   | 誰が支払ったか           |
| 金額       | number   | 支払い金額（円）         |
| 受益者     | Person[] | 誰がその恩恵を受けたか   |
| 品目       | string   | 何に対する支払いか       |
| カテゴリ   | Category | 食費、交通費、宿泊費など |

### 交通費計算

#### 概要

交通費は単純な割り勘ではなく、**シャープレイ値で公平に分担**する。
車を所有している人がいることで、全員のコストが下がる。この「貢献度」を評価する。

#### シャープレイ値による交通費分担の例

**状況**: A, B, C の3人でキャンプに行く。Aだけが車を持っている。

| 提携      | 移動手段   | コスト                |
| --------- | ---------- | --------------------- |
| {}        | -          | 0円                   |
| {A}       | Aの車      | 5,000円（ガソリン代） |
| {B}       | レンタカー | 15,000円              |
| {C}       | レンタカー | 15,000円              |
| {A, B}    | Aの車      | 5,000円               |
| {A, C}    | Aの車      | 5,000円               |
| {B, C}    | レンタカー | 15,000円              |
| {A, B, C} | Aの車      | 5,000円               |

**結果**: Aがいることで10,000円節約できる → Aの貢献度が高い → Aの負担額は少なくなる

#### 距離・燃料代計算

| 項目         | 説明                                 |
| ------------ | ------------------------------------ |
| 距離取得     | Google Maps API で場所間の距離を取得 |
| 燃費         | 車両ごとに燃費（km/L）を登録         |
| ガソリン単価 | 全国平均 or ユーザー入力             |
| 計算式       | `(距離 / 燃費) × ガソリン単価`       |

#### カーシェア・レンタカー料金

| 項目     | 説明                               |
| -------- | ---------------------------------- |
| 時間料金 | 利用時間に応じた料金               |
| 距離料金 | 走行距離に応じた料金（オプション） |
| 保険料   | 追加保険料（オプション）           |

#### 乗車記録

誰がどの車に乗ったかを記録し、受益者を自動設定。

### 計算ロジック

#### 1. シャープレイ値計算（shapley）

各参加者の「貢献度」を計算する。

- **入力**: 参加者リスト、特性関数（各提携の価値）
- **出力**: 各参加者のシャープレイ値（公平な負担比率）

**特性関数の構築**:

- 各提携（参加者の部分集合）に対して、その提携で発生するコストを計算
- 交通費: 車を持っている人がいれば車、いなければレンタカー
- 食費・宿泊費: 人数に応じたコスト

#### 2. 割り勘計算（warikan）

実際の支払いと負担すべき金額の差分から清算額を計算。

- **入力**: 支払いリスト（支払者、金額、受益者）
- **出力**: 清算リスト（誰が誰にいくら払うか）

#### 3. 計算フロー

```text
1. 場所・車両・参加者を登録
    ↓
2. 支払いを記録（食費、宿泊費、ガソリン代など）
    ↓
3. 特性関数を構築
   - 交通費: 各提携での移動手段とコストを計算
   - その他: 受益者に応じたコスト
    ↓
4. シャープレイ値で公平な負担額を計算
    ↓
5. 各人の「払った額」と「負担すべき額」の差分を算出
    ↓
6. warikan で最小の送金回数で清算
```

## データモデル

### User（ユーザー）

```prisma
model User {
  id        String   @id @default(uuid(7))
  email     String   @unique
  name      String
  image     String?
  role      UserRole @default(PENDING)
  events    EventMember[]
  payments  Payment[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum UserRole {
  PENDING  // 承認待ち
  MEMBER   // 一般メンバー
  ADMIN    // 管理者
}
```

### Event（イベント）

```prisma
model Event {
  id               String         @id @default(uuid(7))
  name             String
  startDate        DateTime
  endDate          DateTime
  gasPricePerLiter Int            @default(170) // ガソリン単価（円/L）
  ownerId          String
  owner            User           @relation(fields: [ownerId], references: [id])
  members          EventMember[]
  payments         Payment[]
  trips            Trip[]
  rentalOptions    RentalOption[]
  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt
}
```

### EventMember（イベント参加者）

```prisma
model EventMember {
  id       String @id @default(uuid(7))
  eventId  String
  event    Event  @relation(fields: [eventId], references: [id])
  userId   String
  user     User   @relation(fields: [userId], references: [id])
  nickname String? // イベント内での表示名
  vehicles Vehicle[] // この参加者が提供できる車両

  @@unique([eventId, userId])
}
```

### Location（場所）

```prisma
model Location {
  id        String   @id @default(uuid(7))
  name      String
  address   String?
  lat       Float    // 緯度（Google Maps API用）
  lng       Float    // 経度（Google Maps API用）
  type      LocationType
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum LocationType {
  HOME       // 自宅（集合場所）
  CAMPSITE   // キャンプ場
  STORE      // 店舗（買い出し）
  OTHER      // その他
}
```

### Vehicle（車両）

```prisma
model Vehicle {
  id           String      @id @default(uuid(7))
  name         String      // 車両名（例: "田中の車"）
  type         VehicleType
  ownerId      String?     // 所有者（EventMember）。レンタカーの場合はnull
  owner        EventMember? @relation(fields: [ownerId], references: [id])
  capacity     Int         // 乗車定員（2人以上）
  fuelEfficiency Float?    // 燃費（km/L）。レンタカーの場合はnull可
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
}

enum VehicleType {
  OWNED       // 自家用車
  RENTAL      // レンタカー
  CARSHARE    // カーシェア（Times等）
}
```

**注意**: バイク（1人乗り）は対応しない。バイクの交通費は「その他」カテゴリで手動入力する。
理由: 1人乗りの乗り物はシャープレイ値に影響しないため（他者への貢献度が0）。

### RentalOption（レンタカー/カーシェアの料金オプション）

```prisma
model RentalOption {
  id            String   @id @default(uuid(7))
  eventId       String
  event         Event    @relation(fields: [eventId], references: [id])
  name          String   // プラン名（例: "Times 12時間パック"）
  provider      String   // 提供者（例: "Times", "ニッポンレンタカー"）
  baseFee       Int      // 基本料金（円）
  distanceFee   Int?     // 距離料金（円/km）。なければnull
  insuranceFee  Int?     // 保険料（円）
  capacity      Int      // 乗車定員
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

### Trip（移動記録）

```prisma
model Trip {
  id          String   @id @default(uuid(7))
  eventId     String
  event       Event    @relation(fields: [eventId], references: [id])
  vehicleId   String
  vehicle     Vehicle  @relation(fields: [vehicleId], references: [id])
  fromId      String
  from        Location @relation("TripFrom", fields: [fromId], references: [id])
  toId        String
  to          Location @relation("TripTo", fields: [toId], references: [id])
  distance    Float?   // 距離（km）。Google Maps APIから取得
  passengers  TripPassenger[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### TripPassenger（乗車記録）

```prisma
model TripPassenger {
  id       String      @id @default(uuid(7))
  tripId   String
  trip     Trip        @relation(fields: [tripId], references: [id])
  memberId String
  member   EventMember @relation(fields: [memberId], references: [id])

  @@unique([tripId, memberId])
}
```

### Payment（支払い）

```prisma
model Payment {
  id           String              @id @default(uuid(7))
  eventId      String
  event        Event               @relation(fields: [eventId], references: [id])
  payerId      String
  payer        User                @relation(fields: [payerId], references: [id])
  amount       Int                 // 円単位
  description  String
  category     PaymentCategory
  beneficiaries PaymentBeneficiary[]
  createdAt    DateTime            @default(now())
  updatedAt    DateTime            @updatedAt
}

enum PaymentCategory {
  FOOD        // 食費
  TRANSPORT   // 交通費
  LODGING     // 宿泊費
  EQUIPMENT   // 装備・道具
  OTHER       // その他
}
```

### PaymentBeneficiary（支払いの受益者）

```prisma
model PaymentBeneficiary {
  id        String  @id @default(uuid(7))
  paymentId String
  payment   Payment @relation(fields: [paymentId], references: [id])
  memberId  String  // EventMember の id

  @@unique([paymentId, memberId])
}
```

## 画面構成

### 1. ログイン画面 (`/login`)

- Google ログインボタン

### 2. 承認待ち画面 (`/pending`)

- 管理者の承認を待っている旨を表示
- ログアウトボタン

### 3. ユーザー管理 (`/admin/users`)

- ユーザー一覧（承認待ち、一般メンバー、管理者）
- 承認待ちユーザーの承認/拒否
- 管理者への昇格/降格
- 管理者のみアクセス可能

### 4. ダッシュボード (`/`)

- 自分が参加しているイベント一覧
- イベント作成ボタン

### 5. イベント詳細 (`/events/[id]`)

- イベント情報
- 参加者一覧
- 支払い一覧
- 計算結果（シャープレイ値、清算額）

### 6. 支払い一覧 (`/events/[id]/payments`)

- 支払い一覧表示
- 支払い編集・削除

### 7. 支払い登録 (`/events/[id]/payments/new`)

- 支払い情報入力フォーム

### 8. 清算結果 (`/events/[id]/settlement`)

- 誰が誰にいくら払うか
- 清算完了チェック

### 9. 場所管理 (`/events/[id]/locations`)

- 場所一覧（キャンプ場、集合場所など）
- 場所追加（Google Maps で検索・選択）
- 場所間の距離表示

### 10. 車両管理 (`/events/[id]/vehicles`)

- 車両一覧（自家用車、レンタカーオプション）
- 車両追加
  - 自家用車: 所有者、定員、燃費
  - レンタカー: 料金プラン、定員

### 11. 移動記録 (`/events/[id]/trips`)

- 移動一覧
- 移動追加（出発地、目的地、車両、乗車者）
- 距離自動計算（Google Maps API）

## 技術スタック

| 項目              | 技術                                       |
| ----------------- | ------------------------------------------ |
| フレームワーク    | Next.js 16 (App Router)                    |
| 言語              | TypeScript 5                               |
| スタイリング      | Tailwind CSS 4                             |
| UI コンポーネント | shadcn/ui                                  |
| 認証              | Auth.js v5 (next-auth@beta) + Google OAuth |
| ORM               | Prisma 7                                   |
| データベース      | Neon PostgreSQL（無料枠）                  |
| 地図・距離計算    | Google Maps API (Places, Distance Matrix)  |
| 計算ライブラリ    | shapley, warikan（GitHub パッケージ）      |
| デプロイ          | SST v3 + AWS Lambda + CloudFront           |

## デプロイ構成

### アーキテクチャ

```text
ユーザー
    ↓
CloudFront (CDN)
    ↓
┌─────────────────────────────────┐
│  AWS Lambda (SST + OpenNext)   │
│  - Server Components           │
│  - Server Actions              │
│  - API Routes                  │
└─────────────────────────────────┘
    ↓
Neon PostgreSQL (外部)
```

### サービス構成

| サービス        | 用途           | コスト                            |
| --------------- | -------------- | --------------------------------- |
| AWS Lambda      | サーバー処理   | $0〜（無料枠: 月100万リクエスト） |
| AWS S3          | 静的ファイル   | $0〜（無料枠: 5GB）               |
| AWS CloudFront  | CDN            | $0〜（無料枠: 1TB/月）            |
| Neon PostgreSQL | データベース   | $0（無料枠: 0.5GB）               |
| Google OAuth    | 認証           | $0                                |
| Google Maps API | 地図・距離計算 | $0（無料枠: 月$200相当）          |

### 月額コスト見積もり

| 規模     | 月間アクセス | 推定コスト |
| -------- | ------------ | ---------- |
| 個人利用 | 〜1,000      | **$0**     |
| 小規模   | 〜10,000     | **$0**     |
| 中規模   | 〜100,000    | **〜$1**   |

### デプロイ手順

```bash
# 1. SST 初期化
npx sst@latest init

# 2. 環境変数設定
# .env に DATABASE_URL, GOOGLE_CLIENT_ID 等を設定

# 3. デプロイ
npx sst deploy --stage production
```

## 非機能要件

- レスポンシブデザイン（モバイル対応）
- 日本語 UI
- プレイヤー数: 最大10人程度

## 将来の拡張（スコープ外）

- イベント共有・招待機能
- 通知機能
- 支払い履歴のエクスポート
- 多言語対応
