# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

NexCBT は QTI 3.0 (Question and Test Interoperability) アセスメントプラットフォームのデモ実装です。Vue 3 プレイヤーを Next.js アプリケーションに iframe で埋め込み、QTI 準拠のアセスメントアイテムを表示・採点します。

## コマンド

```bash
# 開発 - 両パッケージを同時起動
npm run dev

# 開発 - 個別起動
npm run dev:player  # Vue Player: http://localhost:5173
npm run dev:web     # Next.js: http://localhost:3000

# ビルド
npm run build

# リント
npm run lint
```

## アーキテクチャ

npm workspaces を使用した Turborepo モノレポ構成です。

### パッケージ構成

**packages/qti-player** (Vue 3 + Vite)
- `qti3-item-player-vue3` ライブラリを使用した QTI 3.0 アイテムレンダラー
- URL駆動方式: `?item=<xml-url>&callback=<api-url>&session=<id>` を受け取る
- XML読み込み、アイテム表示、採点を処理
- postMessage で親ウィンドウに結果を送信

**packages/web** (Next.js 15 + TypeScript)
- メインアプリケーション
- `TestInProgress` / `TestResults` コンポーネントでテスト実行・結果表示
- `/api/results` で採点結果を受信し、問題シーケンスを管理
- `public/items/` から QTI XML ファイルを配信

### データフロー

1. Next.js の `/test` ページで `TestInProgress` をレンダリング
2. iframe が URL パラメータ付きで Vue Player を読み込み
3. Vue Player が Next.js から QTI XML を fetch (`/items/*.xml`)
4. ユーザーが回答、Vue Player がローカルで採点
5. Vue Player が postMessage で結果を親ウィンドウに送信
6. `TestInProgress` が結果を受信し、状態を更新
7. 全問完了後 `TestResults` でサマリーを表示

### postMessage API

**受信メッセージ (qti-player → web)**
- `ITEM_LOADED`: 問題読み込み完了 (`{ type, itemId }`)
- `ITEM_ANSWERED`: 回答完了 (`{ type, itemId, score, maxScore, isExternalScored, response, duration }`)

**送信メッセージ (web → qti-player)**
- `CHANGE_ITEM`: 問題切り替え (`{ type, itemUrl }`)

### 主要ファイル

- `packages/qti-player/src/App.vue` - メインプレイヤーコンポーネント（採点ロジック、回答抽出）
- `packages/qti-player/src/composables/useItemLoader.js` - XML 読み込みロジック
- `packages/qti-player/src/composables/useResultSubmit.js` - 結果送信ロジック
- `packages/web/src/components/test/TestInProgress.tsx` - テスト実行画面（サイドバー＋iframe）
- `packages/web/src/components/test/TestResults.tsx` - 結果表示画面（回答・時間・スコア）
- `packages/web/src/app/api/results/route.ts` - 結果受信 API
- `packages/web/src/types/test.ts` - 型定義（ItemResult, ItemInfo等）
- `packages/web/next.config.ts` - CORS ヘッダー設定

### 環境変数 (packages/web/.env.local)

```
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_PLAYER_URL=http://localhost:5173
PLAYER_URL=http://localhost:5173
```

## QTI アイテム形式

QTI 3.0 XML ファイルを `packages/web/public/items/` に配置。サポートするインタラクション:
- `choiceInteraction` (単一/複数選択)
- `inlineChoiceInteraction` (インライン選択)
- `matchInteraction` (マッチング)
- `orderInteraction` (並べ替え)
- `textEntryInteraction` (テキスト入力)
- `extendedTextInteraction` (長文入力 - 外部採点)
- `graphicChoiceInteraction` (画像選択)

## テスト

http://localhost:3000/test にアクセスすると、9問のデモテストを実行できます。問題番号にホバーでタイトル・インタラクションタイプを表示。結果画面で回答内容・所要時間・スコアを確認できます。

## 外部連携

qti-player は独立したサービスとして外部アプリから利用可能です。詳細は `tech-guide.md` を参照。
