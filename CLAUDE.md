# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

NexCBT は QTI 3.0 (Question and Test Interoperability) アセスメントプラットフォームのデモ実装です。Vue 3 プレイヤーを Next.js アプリケーションに iframe で埋め込み、QTI 準拠のアセスメントアイテムを表示・採点します。

## 必要環境

- Node.js 20.x 以上
- npm 11.x 以上

## コマンド

```bash
# 開発 - 両パッケージを同時起動（Turborepo）
npm run dev

# 開発 - 個別起動
npm run dev:player  # Vue Player: http://localhost:5173
npm run dev:web     # Next.js: http://localhost:3000

# ビルド・リント
npm run build
npm run lint

# 型チェック（web パッケージのみ、ビルド時に実行される）
npm -w @nexcbt/web run build

# 個別パッケージでのコマンド実行
npm -w @nexcbt/web run <script>      # web パッケージ
npm -w @nexcbt/qti-player run <script>  # qti-player パッケージ

# ビルド後のプレビュー（qti-player のみ）
npm -w @nexcbt/qti-player run preview
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
- `/home` - ホームページ（Basic Run / Playground への導線）
- `/basic` - Basic Run（プリセット問題でのテスト実行）
- `/playground` - Playground（QTI XML を自由に入力してテスト）
- `public/items/` から QTI XML ファイルを配信

### データフロー

1. Next.js の `/basic` ページで `BasicRunInProgress` をレンダリング
2. iframe が URL パラメータ付きで Vue Player を読み込み
3. Vue Player が Next.js から QTI XML を fetch (`/items/*.xml`)
4. ユーザーが回答、Vue Player がローカルで採点
5. Vue Player が postMessage で結果を親ウィンドウに送信
6. `BasicRunInProgress` が結果を受信し、状態を更新
7. 全問完了後 `BasicRunResults` でサマリーを表示

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
- `packages/web/src/app/basic/page.tsx` - Basic Run ページ（3フェーズ: initial → testing → results）
- `packages/web/src/components/basic-run/BasicRunInProgress.tsx` - テスト実行画面（サイドバー＋iframe）
- `packages/web/src/components/basic-run/BasicRunResults.tsx` - 結果表示画面（回答・時間・スコア）
- `packages/web/src/components/playground/PlaygroundPage.tsx` - Playground（XML入力でテスト）
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

## 動作確認

http://localhost:3000/basic にアクセスすると、デモテストを実行できます。問題番号にホバーでタイトル・インタラクションタイプを表示。結果画面で回答内容・所要時間・スコアを確認できます。

http://localhost:3000/playground では QTI XML を直接入力またはドラッグ＆ドロップしてテストを実行できます。

## 外部連携

qti-player は独立したサービスとして外部アプリから利用可能です。

### 統合方法
1. **postMessage API**: iframe 経由でリアルタイムに結果を受信（推奨）
2. **Callback API**: `callback` パラメータで採点結果をサーバーに直接送信

### iframe URL パラメータ

| パラメータ | 必須 | 説明 |
|-----------|------|------|
| `item` | ○ | QTI XMLファイルのURL（URLエンコード必須） |
| `session` | ○ | セッションID |
| `callback` | - | 結果送信先のAPI URL |
| `token` | - | 認証トークン（Authorizationヘッダーに付与） |
| `font` | - | フォント設定（`noto-sans-jp`, `noto-serif-jp` 等） |

### Callback API リクエスト/レスポンス形式

**リクエスト (POST)**
```json
{
  "sessionId": "session-xxx",
  "itemId": "choice-item-001",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "result": { "score": 1, "maxScore": 1, "isExternalScored": false, ... },
  "accumulatedResults": [...]
}
```

**レスポンス（次の問題がある場合）**
```json
{ "success": true, "nextItem": "https://example.com/items/question-002.xml", "isComplete": false }
```

詳細は `tech-guide.md` を参照。
