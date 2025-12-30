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
- 採点後に callback URL へ結果を POST

**packages/web** (Next.js 15 + TypeScript)
- メインアプリケーション
- `QtiPlayerFrame` コンポーネントで Vue Player を iframe 埋め込み
- `/api/results` で採点結果を受信し、問題シーケンスを管理
- `public/items/` から QTI XML ファイルを配信

### データフロー

1. Next.js ページが `QtiPlayerFrame` をレンダリング（item URL と session ID を渡す）
2. iframe が URL パラメータ付きで Vue Player を読み込み
3. Vue Player が Next.js から QTI XML を fetch (`/items/*.xml`)
4. ユーザーが回答、Vue Player がローカルで採点
5. Vue Player が `/api/results` へ結果を POST
6. API が次の問題 URL または完了サマリーを返却
7. Vue Player が次の問題へ遷移またはサマリーを表示

### 主要ファイル

- `packages/qti-player/src/App.vue` - メインプレイヤーコンポーネント（採点ロジック含む）
- `packages/qti-player/src/composables/useItemLoader.js` - XML 読み込みロジック
- `packages/qti-player/src/composables/useResultSubmit.js` - 結果送信ロジック
- `packages/web/src/components/QtiPlayerFrame/index.tsx` - iframe ラッパー
- `packages/web/src/app/api/results/route.ts` - 結果受信 API（セッション管理）
- `packages/web/next.config.ts` - CORS ヘッダー設定

### 環境変数 (packages/web/.env.local)

```
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_PLAYER_URL=http://localhost:5173
PLAYER_URL=http://localhost:5173
```

## QTI アイテム形式

QTI 3.0 XML ファイルを `packages/web/public/items/` に配置。サポートするインタラクション:
- `qti-choice-interaction` (単一/複数選択)
- `qti-order-interaction` (並べ替え)
- `qti-text-entry-interaction` (テキスト入力)

## テスト

http://localhost:3000/test にアクセスすると、3問のデモテストを実行できます。全インタラクションタイプを試し、最終的にスコアサマリーが表示されます。
