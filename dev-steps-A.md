# QTI3 Assessment Platform 開発手順書 (Plan A: Web Request方式)

このドキュメントは `plan-A.md` に基づく開発手順を、ステップバイステップで記載しています。

---

## Phase 1: 基盤構築

### Step 1.1: モノレポ構造への変換

現在のプロジェクトをモノレポ構造に変換します。

#### 1.1.1 ディレクトリ作成

```bash
# プロジェクトルートで実行
mkdir -p packages/qti-player
```

#### 1.1.2 ファイル移動

以下のファイル・フォルダを `packages/qti-player/` に移動します：

- `src/`
- `public/`
- `index.html`
- `vite.config.js`
- `package.json`

**注意**: `node_modules/` は移動しない（後で再インストール）

```bash
# 手動または以下のコマンドで移動
mv src packages/qti-player/
mv public packages/qti-player/
mv index.html packages/qti-player/
mv vite.config.js packages/qti-player/
mv package.json packages/qti-player/
```

#### 1.1.3 node_modules削除

```bash
# 古いnode_modulesを削除
rm -rf node_modules
rm -f package-lock.json
```

---

### Step 1.2: ルート設定ファイル作成

#### 1.2.1 ルート package.json

プロジェクトルートに新しい `package.json` を作成します：

```json
{
  "name": "nexcbt",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo run dev",
    "dev:player": "npm -w @nexcbt/qti-player run dev",
    "dev:web": "npm -w @nexcbt/web run dev",
    "build": "turbo run build",
    "lint": "turbo run lint"
  },
  "devDependencies": {
    "turbo": "^2.3.0"
  }
}
```

#### 1.2.2 turbo.json

Turborepo設定ファイルを作成します：

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "dev": {
      "cache": false,
      "persistent": true
    },
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
    },
    "lint": {
      "dependsOn": ["^lint"]
    }
  }
}
```

#### 1.2.3 .gitignore 更新

既存の `.gitignore` に以下を追加：

```gitignore
# Turborepo
.turbo

# 各パッケージのnode_modules
packages/*/node_modules
```

---

### Step 1.3: packages/qti-player の調整

#### 1.3.1 package.json 更新

`packages/qti-player/package.json` を編集し、名前を変更します：

```json
{
  "name": "@nexcbt/qti-player",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite --port 5173",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "qti3-item-player-vue3": "^0.2.21",
    "vue": "^3.5.24"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^6.0.1",
    "vite": "^7.2.4"
  }
}
```

#### 1.3.2 依存関係インストール

プロジェクトルートで実行：

```bash
npm install
```

#### 1.3.3 動作確認

```bash
npm run dev:player
```

ブラウザで `http://localhost:5173` を開き、現在のデモが動作することを確認。

---

### Step 1.4: packages/web の作成（Next.js）

#### 1.4.1 Next.jsプロジェクト作成

```bash
cd packages
npx create-next-app@latest web --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

プロンプトへの回答：
- Would you like to use Turbopack? → No（または好みで）

#### 1.4.2 package.json の名前変更

`packages/web/package.json` を編集：

```json
{
  "name": "@nexcbt/web",
  ...
}
```

#### 1.4.3 Material UI インストール

```bash
cd packages/web
npm install @mui/material @emotion/react @emotion/styled @mui/icons-material
```

#### 1.4.4 環境変数ファイル作成

`packages/web/.env.local` を作成：

```bash
# アプリケーションURL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# QTI PlayerのURL
NEXT_PUBLIC_PLAYER_URL=http://localhost:5173

# サーバー側のみで使用
PLAYER_URL=http://localhost:5173
```

---

### Step 1.5: 開発環境整備

#### 1.5.1 ルートから並列起動

プロジェクトルートに戻り、Turborepoをインストール：

```bash
cd ../..  # プロジェクトルートへ
npm install
```

並列起動：

```bash
npm run dev
```

これにより、以下が同時に起動します：
- Next.js (web): http://localhost:3000
- Vue Player (qti-player): http://localhost:5173

#### 1.5.2 確認事項

- [ ] `http://localhost:5173` でVue Playerが動作
- [ ] `http://localhost:3000` でNext.jsのデフォルトページが表示

---

## Phase 2: コア機能実装

### Step 2.1: Vue Player - コンポーザブル作成

#### 2.1.1 useItemLoader.js

`packages/qti-player/src/composables/useItemLoader.js` を作成：

URLパラメータから問題XMLのURLを取得し、fetchで読み込む機能を実装します。

主な機能：
- `item` パラメータからXML URLを取得
- fetchでXMLを取得
- ローディング状態とエラー状態の管理

#### 2.1.2 useResultSubmit.js

`packages/qti-player/src/composables/useResultSubmit.js` を作成：

採点結果をcallback URLにPOSTする機能を実装します。

主な機能：
- `callback` パラメータからURLを取得
- `session` パラメータを含めて送信
- 次の問題URLをレスポンスから取得

---

### Step 2.2: Vue Player - App.vue改修

#### 2.2.1 URL駆動方式への変更

`packages/qti-player/src/App.vue` を改修：

- ハードコードされたXMLを削除
- URLパラメータ（`?item=...&callback=...&session=...`）から情報を取得
- コンポーザブルを使用してXML読み込み・結果送信

#### 2.2.2 動作モード

- パラメータなし: エラーメッセージ表示
- パラメータあり: 問題を読み込み、採点後に結果送信

---

### Step 2.3: Next.js - QtiPlayerFrame作成

#### 2.3.1 コンポーネント作成

`packages/web/src/components/QtiPlayerFrame/index.tsx` を作成：

iframe でVue Playerを埋め込むラッパーコンポーネントを実装します。

主な機能：
- itemUrl, sessionId をpropsで受け取り
- iframe srcにURLパラメータとして渡す
- ローディング状態の表示

---

### Step 2.4: Next.js - API Route作成

#### 2.4.1 結果受信API

`packages/web/src/app/api/results/route.ts` を作成：

Vue Playerからの採点結果を受信するAPIを実装します。

主な機能：
- POST リクエストを受信
- Origin検証（セキュリティ）
- 結果の保存（この段階ではコンソール出力）
- 次の問題URLを返す（あれば）

#### 2.4.2 CORS設定

`packages/web/next.config.ts` にCORS設定を追加：

```typescript
const nextConfig = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: 'http://localhost:5173' },
          { key: 'Access-Control-Allow-Methods', value: 'POST, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' }
        ]
      }
    ]
  }
}
```

---

### Step 2.5: 統合テスト

#### 2.5.1 XMLファイル配置

`packages/web/public/items/` ディレクトリを作成し、テスト用XMLを配置：

- `choice-item-001.xml` - 選択問題
- `text-item-001.xml` - 記述問題

#### 2.5.2 テスト画面作成

`packages/web/src/app/test/page.tsx` を作成：

QtiPlayerFrameを使用したテスト画面を実装します。

#### 2.5.3 動作確認手順

1. `npm run dev` で両方のアプリを起動
2. `http://localhost:3000/test` にアクセス
3. 問題が表示されることを確認
4. 回答して採点
5. コンソールで結果送信を確認

---

## Phase 3: ETL構築（オプション）

このフェーズは後回しにできます。

### Step 3.1: Python環境

`packages/etl/` ディレクトリを作成し、Python環境をセットアップ。

必要に応じて以下を実装：
- QTI XML変換ロジック
- データベーススキーマ設計
- 問題インポート機能

---

## Phase 4: デプロイ

### Step 4.1: Vercel設定

#### 4.1.1 プロジェクト作成

Vercelで2つのプロジェクトを作成：

| プロジェクト | ディレクトリ | ドメイン例 |
|-------------|-------------|-----------|
| nexcbt-web | packages/web | app.nexcbt.com |
| nexcbt-player | packages/qti-player | player.nexcbt.com |

#### 4.1.2 環境変数設定

**nexcbt-web:**
```
NEXT_PUBLIC_APP_URL=https://app.nexcbt.com
NEXT_PUBLIC_PLAYER_URL=https://player.nexcbt.com
PLAYER_URL=https://player.nexcbt.com
```

**nexcbt-player:**
```
VITE_APP_URL=https://app.nexcbt.com
```

#### 4.1.3 CORS設定更新

本番環境用にCORS設定を更新（環境変数を使用）。

---

## Phase 5: 本番運用準備

### Step 5.1: 監視・ログ設定

- エラー追跡サービス（Sentry等）の導入
- パフォーマンスモニタリング
- ログ収集

### Step 5.2: ドキュメント整備

- API仕様書（OpenAPI）
- 運用手順書

---

## 完了チェックリスト

### Phase 1
- [ ] モノレポ構造に変換
- [ ] packages/qti-player が動作
- [ ] packages/web が動作
- [ ] turbo run dev で並列起動

### Phase 2
- [ ] useItemLoader 実装
- [ ] useResultSubmit 実装
- [ ] App.vue をURL駆動に改修
- [ ] QtiPlayerFrame 実装
- [ ] /api/results 実装
- [ ] 統合テスト完了

### Phase 4
- [ ] Vercel にデプロイ
- [ ] 本番CORS設定

### Phase 5
- [ ] 監視設定
- [ ] ドキュメント整備

---

## 参考リンク

- [plan-A.md](./plan-A.md) - 詳細な設計書
- [qti3-item-player-vue3](https://github.com/amp-up-io/qti3-item-player-vue3)
- [Turborepo](https://turbo.build/repo)
- [Vercel Monorepo Guide](https://vercel.com/docs/monorepos)
