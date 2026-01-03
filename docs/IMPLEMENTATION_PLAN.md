# fairpley 実装計画書

本ドキュメントは fairpley の実装計画を記述する。

---

## 1. 概要

### 1.1 実装方針

| 項目     | 方針                                               |
| -------- | -------------------------------------------------- |
| 開発手法 | フェーズ分割による段階的実装                       |
| 優先順位 | コア機能（認証・イベント・支払い・清算）を先に実装 |
| テスト   | 各フェーズ完了時にテストを実装                     |
| デプロイ | Phase 3 完了後に初回デプロイ、以降は継続的デプロイ |

### 1.2 フェーズ構成

```mermaid
gantt
    title fairpley 実装フェーズ
    dateFormat  YYYY-MM-DD
    section Phase 1
    プロジェクトセットアップ     :p1-1, 2025-01-01, 1d
    認証機能                    :p1-2, after p1-1, 2d
    section Phase 2
    イベント管理                :p2-1, after p1-2, 2d
    参加者管理                  :p2-2, after p2-1, 1d
    section Phase 3
    支払い機能                  :p3-1, after p2-2, 2d
    清算計算                    :p3-2, after p3-1, 2d
    section Phase 4
    場所管理                    :p4-1, after p3-2, 1d
    車両管理                    :p4-2, after p4-1, 1d
    移動記録                    :p4-3, after p4-2, 2d
    section Phase 5
    管理者機能                  :p5-1, after p4-3, 1d
    テスト・最終調整            :p5-2, after p5-1, 2d
```

### 1.3 依存関係

```mermaid
flowchart TD
    subgraph Phase1[Phase 1: 基盤]
        A[プロジェクトセットアップ] --> B[認証機能]
    end

    subgraph Phase2[Phase 2: イベント]
        C[イベント管理] --> D[参加者管理]
    end

    subgraph Phase3[Phase 3: 支払い]
        E[支払い機能] --> F[清算計算]
    end

    subgraph Phase4[Phase 4: 交通]
        G[場所管理] --> I[移動記録]
        H[車両管理] --> I
    end

    subgraph Phase5[Phase 5: 管理]
        J[管理者機能]
        K[テスト・最終調整]
    end

    B --> C
    D --> E
    F --> G
    F --> H
    I --> J
    J --> K
```

---

## 2. Phase 1: プロジェクトセットアップ・認証

### 2.1 タスク一覧

| #    | タスク                          | 成果物                             | 参照                   |
| ---- | ------------------------------- | ---------------------------------- | ---------------------- |
| 1.1  | Next.js プロジェクト作成        | プロジェクト基盤                   | SPEC.md                |
| 1.2  | 依存パッケージインストール      | package.json                       | SPEC.md                |
| 1.3  | Tailwind CSS 4 + shadcn/ui 設定 | スタイル基盤                       | DESIGN_UI.md           |
| 1.4  | Prisma スキーマ作成             | prisma/schema.prisma               | DESIGN_DATABASE.md     |
| 1.5  | Neon PostgreSQL 接続設定        | .env, prisma/schema.prisma         | DESIGN_DATABASE.md     |
| 1.6  | Auth.js 設定                    | src/lib/auth.ts                    | DESIGN_FUNCTION.md 1.3 |
| 1.7  | ミドルウェア実装                | src/middleware.ts                  | DESIGN_FUNCTION.md 1.4 |
| 1.8  | ログイン画面実装                | app/login/page.tsx                 | DESIGN_UI.md 3.1       |
| 1.9  | 承認待ち画面実装                | app/pending/page.tsx               | DESIGN_UI.md 3.2       |
| 1.10 | 共通レイアウト実装              | app/layout.tsx, components/layout/ | DESIGN_UI.md 2         |

### 2.2 詳細手順

#### 1.1 Next.js プロジェクト作成

```bash
npx create-next-app@latest fairpley --typescript --tailwind --eslint --app --src-dir
cd fairpley
```

#### 1.2 依存パッケージインストール

```bash
# 認証
npm install next-auth@beta @auth/prisma-adapter

# データベース
npm install prisma @prisma/client

# バリデーション
npm install zod

# 計算ライブラリ
npm install shapley warikan

# UI
npx shadcn@latest init

# 開発ツール
npm install -D @types/node
```

#### 1.3 Tailwind CSS 4 + shadcn/ui 設定

```bash
# shadcn/ui コンポーネント追加
npx shadcn@latest add button card dialog form input select checkbox table tabs avatar dropdown-menu toast skeleton
```

#### 1.4 Prisma スキーマ作成

`DESIGN_DATABASE.md` の「3. Prisma スキーマ」をそのまま使用。

```bash
npx prisma init
# prisma/schema.prisma を編集
```

#### 1.5 Neon PostgreSQL 接続設定

```bash
# .env
DATABASE_URL="postgresql://user:password@ep-xxx.neon.tech/fairpley?sslmode=require"

# マイグレーション実行
npx prisma migrate dev --name init
npx prisma generate
```

#### 1.6 Auth.js 設定

`DESIGN_FUNCTION.md` の「1.3 Auth.js 設定」を実装。

**作成ファイル**:

- `src/lib/auth.ts`
- `src/lib/prisma.ts`
- `src/app/api/auth/[...nextauth]/route.ts`

#### 1.7 ミドルウェア実装

`DESIGN_FUNCTION.md` の「1.4 ミドルウェア」を実装。

**作成ファイル**:

- `src/middleware.ts`

#### 1.8-1.10 画面実装

`DESIGN_UI.md` のワイヤーフレームに従って実装。

**作成ファイル**:

- `src/app/layout.tsx`
- `src/app/login/page.tsx`
- `src/app/pending/page.tsx`
- `src/components/layout/header.tsx`

### 2.3 完了条件

- [ ] Google OAuth でログインできる
- [ ] 初回ユーザーが ADMIN として登録される
- [ ] 2回目以降のユーザーが PENDING として登録される
- [ ] PENDING ユーザーは /pending にリダイレクトされる
- [ ] MEMBER/ADMIN ユーザーはダッシュボードにアクセスできる

---

## 3. Phase 2: イベント管理・参加者管理

### 3.1 タスク一覧

| #    | タスク                     | 成果物                     | 参照                                  |
| ---- | -------------------------- | -------------------------- | ------------------------------------- |
| 2.1  | イベント作成 Server Action | src/actions/event.ts       | DESIGN_FUNCTION.md 2.2.1              |
| 2.2  | イベント更新 Server Action | src/actions/event.ts       | DESIGN_FUNCTION.md 2.2.2              |
| 2.3  | イベント削除 Server Action | src/actions/event.ts       | DESIGN_FUNCTION.md 2.2.3              |
| 2.4  | イベントデータ取得関数     | src/data/event.ts          | DESIGN_FUNCTION.md 2.3                |
| 2.5  | ダッシュボード画面         | app/page.tsx               | DESIGN_UI.md 3.3                      |
| 2.6  | イベント作成画面           | app/events/new/page.tsx    | DESIGN_UI.md 3.4                      |
| 2.7  | イベント詳細画面           | app/events/[id]/page.tsx   | DESIGN_UI.md 3.5                      |
| 2.8  | イベント詳細レイアウト     | app/events/[id]/layout.tsx | DESIGN_UI.md 2.2                      |
| 2.9  | 参加者追加 Server Action   | src/actions/member.ts      | DESIGN_FUNCTION.md 3.2.1              |
| 2.10 | 参加者削除 Server Action   | src/actions/member.ts      | DESIGN_FUNCTION.md 3.2.2              |
| 2.11 | アクセス権チェック関数     | src/lib/access.ts          | DESIGN_FUNCTION.md 共通ユーティリティ |

### 3.2 作成ファイル

```text
src/
├── actions/
│   ├── event.ts          # createEvent, updateEvent, deleteEvent
│   └── member.ts         # addMember, removeMember
├── data/
│   └── event.ts          # getMyEvents, getEventById, getEventPayments
├── lib/
│   └── access.ts         # checkEventAccess, checkEventOwner
├── app/
│   ├── page.tsx          # ダッシュボード
│   └── events/
│       ├── new/
│       │   └── page.tsx  # イベント作成
│       └── [id]/
│           ├── layout.tsx
│           └── page.tsx  # イベント詳細
└── components/
    └── event/
        ├── event-card.tsx
        ├── event-form.tsx
        ├── member-list.tsx
        └── member-form.tsx
```

### 3.3 完了条件

- [ ] イベントを作成できる
- [ ] 作成者が自動的にイベントオーナーになる
- [ ] イベント一覧がダッシュボードに表示される
- [ ] イベント詳細画面で参加者一覧が表示される
- [ ] 参加者をメールアドレスで追加できる
- [ ] オーナーのみがイベントを編集・削除できる
- [ ] オーナーのみが参加者を削除できる（支払い記録がない場合）

---

## 4. Phase 3: 支払い・清算

### 4.1 タスク一覧

| #   | タスク                   | 成果物                                | 参照                     |
| --- | ------------------------ | ------------------------------------- | ------------------------ |
| 3.1 | 支払い追加 Server Action | src/actions/payment.ts                | DESIGN_FUNCTION.md 7.2.1 |
| 3.2 | 支払い更新 Server Action | src/actions/payment.ts                | DESIGN_FUNCTION.md 7.2.2 |
| 3.3 | 支払い削除 Server Action | src/actions/payment.ts                | DESIGN_FUNCTION.md 7.2.3 |
| 3.4 | 支払い登録画面           | app/events/[id]/payments/new/page.tsx | DESIGN_UI.md 3.6         |
| 3.5 | 支払い一覧画面           | app/events/[id]/payments/page.tsx     | DESIGN_UI.md 3.7         |
| 3.6 | 清算計算 Server Action   | src/actions/settlement.ts             | DESIGN_FUNCTION.md 8.3.1 |
| 3.7 | 清算結果画面             | app/events/[id]/settlement/page.tsx   | DESIGN_UI.md 3.8         |

### 4.2 作成ファイル

```text
src/
├── actions/
│   ├── payment.ts        # addPayment, updatePayment, deletePayment
│   └── settlement.ts     # calculateSettlement
├── app/
│   └── events/
│       └── [id]/
│           ├── payments/
│           │   ├── page.tsx      # 支払い一覧
│           │   └── new/
│           │       └── page.tsx  # 支払い登録
│           └── settlement/
│               └── page.tsx      # 清算結果
└── components/
    ├── payment/
    │   ├── payment-list.tsx
    │   ├── payment-form.tsx
    │   └── payment-card.tsx
    └── settlement/
        ├── contribution-table.tsx
        └── repayment-list.tsx
```

### 4.3 支払い機能の実装ポイント

#### 支払者選択（性善説）

- 支払い登録時に「支払者」をイベント参加者から選択可能
- デフォルトはログインユーザー
- 誰でも他の人の分の支払いを登録可能

```typescript
// 支払い登録フォームの payerId フィールド
<Select name="payerId" defaultValue={session.user.id}>
  {members.map((member) => (
    <SelectItem key={member.userId} value={member.userId}>
      {member.nickname || member.user.name}
    </SelectItem>
  ))}
</Select>
```

#### 編集・削除権限（性善説）

- イベント参加者全員が編集・削除可能
- ボタンは全員に表示

### 4.4 清算計算の実装ポイント

#### shapley ライブラリ連携

```typescript
import { calculateShapleyValues } from "shapley";

// 特性関数を定義
const characteristicFunction = (coalition: string[]) => {
  // 交通費計算ロジック
};

// シャープレイ値計算
const shapleyValues = calculateShapleyValues(memberIds, characteristicFunction);
```

#### warikan ライブラリ連携

```typescript
import { solve } from "warikan";

// 支払いデータを変換
const payments = contributions.map((c) => ({
  amount: Math.abs(c.paid - c.shouldPay),
  payer: c.paid > c.shouldPay ? c.memberId : BANK,
  beneficiaries: c.paid > c.shouldPay ? [BANK] : [c.memberId],
}));

// 清算リスト生成
const repayments = solve(payments);
```

### 4.5 完了条件

- [ ] 支払いを登録できる（支払者選択可能）
- [ ] 支払いを編集できる（イベント参加者全員）
- [ ] 支払いを削除できる（イベント参加者全員）
- [ ] 受益者を複数選択できる
- [ ] カテゴリを選択できる
- [ ] 清算結果が正しく計算される
- [ ] 誰が誰にいくら払うかが表示される

---

## 5. Phase 4: 場所・車両・移動記録

### 5.1 タスク一覧

| #    | タスク                       | 成果物                             | 参照                     |
| ---- | ---------------------------- | ---------------------------------- | ------------------------ |
| 4.1  | 場所追加 Server Action       | src/actions/location.ts            | DESIGN_FUNCTION.md 4.2.1 |
| 4.2  | 場所データ取得関数           | src/data/location.ts               | DESIGN_FUNCTION.md 4.3   |
| 4.3  | 場所更新・削除 Server Action | src/actions/location.ts            | DESIGN_FUNCTION.md 4.4   |
| 4.4  | Google Maps API 連携         | src/lib/google-maps.ts             | DESIGN_FUNCTION.md 4.5   |
| 4.5  | 場所管理画面                 | app/events/[id]/locations/page.tsx | DESIGN_UI.md 3.9         |
| 4.6  | 車両追加 Server Action       | src/actions/vehicle.ts             | DESIGN_FUNCTION.md 5.2   |
| 4.7  | レンタカーオプション追加     | src/actions/vehicle.ts             | DESIGN_FUNCTION.md 5.2.2 |
| 4.8  | 車両管理画面                 | app/events/[id]/vehicles/page.tsx  | DESIGN_UI.md 3.10        |
| 4.9  | 移動記録追加 Server Action   | src/actions/trip.ts                | DESIGN_FUNCTION.md 6.2.1 |
| 4.10 | 移動記録画面                 | app/events/[id]/trips/page.tsx     | DESIGN_UI.md 3.11        |

### 5.2 作成ファイル

```text
src/
├── actions/
│   ├── location.ts       # addLocation, updateLocation, deleteLocation
│   ├── vehicle.ts        # addOwnedVehicle, addRentalOption
│   └── trip.ts           # addTrip
├── data/
│   └── location.ts       # getLocations
├── lib/
│   └── google-maps.ts    # searchPlaces, getDistance
├── app/
│   └── events/
│       └── [id]/
│           ├── locations/
│           │   └── page.tsx
│           ├── vehicles/
│           │   └── page.tsx
│           └── trips/
│               └── page.tsx
└── components/
    ├── location/
    │   ├── location-list.tsx
    │   ├── location-form.tsx
    │   └── place-search.tsx
    ├── vehicle/
    │   ├── vehicle-list.tsx
    │   ├── vehicle-form.tsx
    │   └── rental-form.tsx
    └── trip/
        ├── trip-list.tsx
        └── trip-form.tsx
```

### 5.3 Google Maps API 設定

```bash
# .env に追加
GOOGLE_MAPS_API_KEY="your-api-key"
```

必要な API:

- Places API（場所検索）
- Distance Matrix API（距離計算）

### 5.4 完了条件

- [ ] 場所を Google Maps で検索して追加できる
- [ ] 場所一覧が表示される（グローバル共有）
- [ ] 自家用車を登録できる（所有者、定員、燃費）
- [ ] レンタカーオプションを登録できる
- [ ] 移動記録を追加できる（出発地、目的地、車両、乗車者）
- [ ] 距離が自動計算される
- [ ] 清算計算に交通費が反映される

---

## 6. Phase 5: 管理者機能・テスト・最終調整

### 6.1 タスク一覧

| #    | タスク                     | 成果物                   | 参照                                  |
| ---- | -------------------------- | ------------------------ | ------------------------------------- |
| 5.1  | 承認待ちユーザー取得       | src/data/admin.ts        | DESIGN_FUNCTION.md 9.2.1              |
| 5.2  | ユーザー承認 Server Action | src/actions/admin.ts     | DESIGN_FUNCTION.md 9.2.2              |
| 5.3  | 管理者昇格 Server Action   | src/actions/admin.ts     | DESIGN_FUNCTION.md 9.2.3              |
| 5.4  | ユーザー拒否 Server Action | src/actions/admin.ts     | DESIGN_FUNCTION.md 9.2.4              |
| 5.5  | ユーザー管理画面           | app/admin/users/page.tsx | DESIGN_UI.md 3.12                     |
| 5.6  | ユニットテスト実装         | tests/unit/              | TEST_SPEC.md 3                        |
| 5.7  | 統合テスト実装             | tests/integration/       | TEST_SPEC.md 4                        |
| 5.8  | E2E テスト実装             | tests/e2e/               | TEST_SPEC.md 5                        |
| 5.9  | エラーハンドリング強化     | src/lib/errors.ts        | DESIGN_FUNCTION.md 共通ユーティリティ |
| 5.10 | レスポンシブ対応確認       | -                        | DESIGN_UI.md 4                        |

### 6.2 作成ファイル

```text
src/
├── actions/
│   └── admin.ts          # approveUser, promoteToAdmin, rejectUser
├── data/
│   └── admin.ts          # getPendingUsers, getAllUsers
├── lib/
│   └── errors.ts         # AppError, UnauthorizedError, etc.
├── app/
│   └── admin/
│       └── users/
│           └── page.tsx
tests/
├── unit/
│   └── ...
├── integration/
│   └── ...
└── e2e/
    └── ...
```

### 6.3 完了条件

- [ ] 管理者がユーザー一覧を閲覧できる
- [ ] 管理者が承認待ちユーザーを承認できる
- [ ] 管理者がユーザーを拒否（削除）できる
- [ ] 管理者が他のユーザーを管理者に昇格できる
- [ ] 管理者以外は管理画面にアクセスできない
- [ ] ユニットテストがパスする（カバレッジ 70%以上）
- [ ] E2E テストがパスする
- [ ] モバイル表示が正しく動作する

---

## 7. デプロイ

### 7.1 SST v3 設定

```typescript
// sst.config.ts
export default $config({
  app(input) {
    return {
      name: "fairpley",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    new sst.aws.Nextjs("Fairpley", {
      environment: {
        DATABASE_URL: process.env.DATABASE_URL!,
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID!,
        GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET!,
        GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY!,
        AUTH_SECRET: process.env.AUTH_SECRET!,
      },
    });
  },
});
```

### 7.2 デプロイ手順

```bash
# 1. SST インストール
npm install sst@latest

# 2. AWS 認証設定
aws configure

# 3. 開発環境デプロイ
npx sst dev

# 4. 本番環境デプロイ
npx sst deploy --stage production
```

### 7.3 環境変数

| 変数名               | 説明                                  | 取得元                    |
| -------------------- | ------------------------------------- | ------------------------- |
| DATABASE_URL         | Neon PostgreSQL 接続文字列            | Neon Dashboard            |
| GOOGLE_CLIENT_ID     | Google OAuth クライアント ID          | Google Cloud Console      |
| GOOGLE_CLIENT_SECRET | Google OAuth クライアントシークレット | Google Cloud Console      |
| GOOGLE_MAPS_API_KEY  | Google Maps API キー                  | Google Cloud Console      |
| AUTH_SECRET          | Auth.js シークレット                  | `openssl rand -base64 32` |

---

## 8. ファイル構成（最終形）

```text
fairpley/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # ダッシュボード
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── pending/
│   │   │   └── page.tsx
│   │   ├── admin/
│   │   │   └── users/
│   │   │       └── page.tsx
│   │   ├── events/
│   │   │   ├── new/
│   │   │   │   └── page.tsx
│   │   │   └── [id]/
│   │   │       ├── layout.tsx
│   │   │       ├── page.tsx            # イベント詳細
│   │   │       ├── payments/
│   │   │       │   ├── page.tsx
│   │   │       │   └── new/
│   │   │       │       └── page.tsx
│   │   │       ├── settlement/
│   │   │       │   └── page.tsx
│   │   │       ├── locations/
│   │   │       │   └── page.tsx
│   │   │       ├── vehicles/
│   │   │       │   └── page.tsx
│   │   │       └── trips/
│   │   │           └── page.tsx
│   │   └── api/
│   │       └── auth/
│   │           └── [...nextauth]/
│   │               └── route.ts
│   ├── actions/
│   │   ├── event.ts
│   │   ├── member.ts
│   │   ├── payment.ts
│   │   ├── settlement.ts
│   │   ├── location.ts
│   │   ├── vehicle.ts
│   │   ├── trip.ts
│   │   └── admin.ts
│   ├── data/
│   │   ├── event.ts
│   │   ├── location.ts
│   │   └── admin.ts
│   ├── components/
│   │   ├── ui/                         # shadcn/ui
│   │   ├── layout/
│   │   │   ├── header.tsx
│   │   │   ├── sidebar.tsx
│   │   │   └── bottom-nav.tsx
│   │   ├── event/
│   │   ├── payment/
│   │   ├── settlement/
│   │   ├── location/
│   │   ├── vehicle/
│   │   └── trip/
│   └── lib/
│       ├── auth.ts
│       ├── prisma.ts
│       ├── access.ts
│       ├── errors.ts
│       └── google-maps.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   ├── fixtures/
│   ├── mocks/
│   └── setup.ts
├── public/
├── .env
├── .env.example
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── vitest.config.ts
├── playwright.config.ts
├── sst.config.ts
└── package.json
```

---

## 9. チェックリスト

### Phase 1 完了チェック

- [ ] Next.js プロジェクトが起動する
- [ ] Prisma マイグレーションが成功する
- [ ] Google OAuth でログインできる
- [ ] ロール別のアクセス制御が動作する

### Phase 2 完了チェック

- [ ] イベント CRUD が動作する
- [ ] 参加者の追加・削除が動作する
- [ ] 権限チェックが正しく動作する

### Phase 3 完了チェック

- [ ] 支払い CRUD が動作する（性善説）
- [ ] 清算計算が正しく動作する
- [ ] シャープレイ値が計算される

### Phase 4 完了チェック

- [ ] 場所管理が動作する
- [ ] 車両管理が動作する
- [ ] 移動記録が動作する
- [ ] 距離が自動計算される

### Phase 5 完了チェック

- [ ] 管理者機能が動作する
- [ ] テストカバレッジが 70% 以上
- [ ] E2E テストがパスする
- [ ] 本番デプロイが成功する

---

## 10. リスクと対策

| リスク                         | 影響 | 対策                                    |
| ------------------------------ | ---- | --------------------------------------- |
| Google Maps API の料金超過     | 高   | 無料枠（$200/月）を監視、キャッシュ活用 |
| シャープレイ値計算の精度       | 中   | shapley ライブラリのテストケース確認    |
| Neon 無料枠の制限              | 低   | 0.5GB で十分だが、監視を設定            |
| Auth.js v5 の breaking changes | 中   | バージョン固定、ドキュメント確認        |

---

## 参照ドキュメント

| ドキュメント                               | 内容                                           |
| ------------------------------------------ | ---------------------------------------------- |
| [SPEC.md](./SPEC.md)                       | 仕様書（データモデル、画面構成、技術スタック） |
| [DESIGN_DATABASE.md](./DESIGN_DATABASE.md) | データベース設計（ER図、Prisma スキーマ）      |
| [DESIGN_FUNCTION.md](./DESIGN_FUNCTION.md) | 機能設計（Server Actions、データ取得関数）     |
| [DESIGN_UI.md](./DESIGN_UI.md)             | UI 設計（ワイヤーフレーム、コンポーネント）    |
| [TEST_SPEC.md](./TEST_SPEC.md)             | テスト仕様（ユニット、統合、E2E）              |
