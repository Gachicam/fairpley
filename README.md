# Fairpley

キャンプなどのグループイベントにおける費用をシャープレイ値で公平に分担するアプリケーション。

**本番URL:** https://fairpley.gachicam.com

## 機能

- イベント管理（作成・編集・削除）
- メンバー管理
- 支払い記録
- 移動記録（車両・場所管理）
- シャープレイ値による清算計算
- Discord認証

## 技術スタック

- Next.js 16 (App Router)
- TypeScript
- Prisma 7 + PostgreSQL
- Auth.js v5 (Discord OAuth)
- Tailwind CSS + shadcn/ui
- Google Maps API

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env` ファイルを作成:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5433/fairpley"

# Auth.js
AUTH_SECRET="your-auth-secret"

# Discord OAuth
DISCORD_CLIENT_ID="your-discord-client-id"
DISCORD_CLIENT_SECRET="your-discord-client-secret"

# Google Maps API（任意）
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="your-google-maps-api-key"
```

### 3. データベースのセットアップ

```bash
# Docker で PostgreSQL を起動
docker compose up -d

# マイグレーション実行
npx prisma migrate dev
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

http://localhost:3000 でアクセス可能。

## Google Maps API 設定

場所登録で地図検索・選択機能を使用する場合、Google Maps API の設定が必要です。

### 有効化が必要なAPI

[Google Cloud Console](https://console.cloud.google.com/) で以下のAPIを有効化:

| API名 | 用途 |
|-------|------|
| Maps JavaScript API | 地図の表示 |
| Places API (New) | 場所検索・オートコンプリート |
| Geocoding API | 住所から座標を取得 |
| Routes API | ルート・距離計算（将来機能） |

### APIキーの作成と制限

1. 「認証情報」→「認証情報を作成」→「APIキー」
2. 作成したAPIキーをクリックして制限を設定:

**アプリケーションの制限（HTTPリファラー）:**
```
localhost:3000/*
fairpley.gachicam.com/*
```

**APIの制限:**
- Maps JavaScript API
- Places API (New)
- Geocoding API
- Routes API

### 料金

各APIに月10,000リクエストまでの無料枠があります。
小〜中規模の利用であれば無料枠内で収まります。

詳細: [Google Maps Platform Pricing](https://mapsplatform.google.com/pricing/)

## デプロイ

### SST (AWS)

```bash
# 開発環境
npx sst dev

# 本番デプロイ
npx sst deploy --stage production
```

環境変数は `sst.config.ts` または AWS Systems Manager Parameter Store で設定。

## ライセンス

MIT License
