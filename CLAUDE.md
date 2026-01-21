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

# AI問題生成（Python - npm workspace外）
cd qti-generator/ai-choice && python src/main.py --subject 社会_政治 --count 10
cd qti-generator/ai-text && python src/main.py --subject 社会_政治 --count 5
```

## アーキテクチャ

npm workspaces を使用した Turborepo モノレポ構成です。

### パッケージ構成

**packages/qti-player** (Vue 3 + Vite 7)
npm workspace: `@nexcbt/qti-player`
- `qti3-item-player-vue3` ライブラリを使用した QTI 3.0 アイテムレンダラー
- URL駆動方式: `?item=<xml-url>&callback=<api-url>&session=<id>` を受け取る
- XML読み込み、アイテム表示、採点を処理
- postMessage で親ウィンドウに結果を送信

**packages/web** (Next.js 16 + React 19 + TypeScript)
npm workspace: `@nexcbt/web`
- メインアプリケーション（Material UI + Tailwind CSS 4）
- `/home` - ホームページ（Basic Run / Playground への導線）
- `/basic` - Basic Run（プリセット問題でのテスト実行）
- `/playground` - Playground（QTI XML を自由に入力してテスト）
- `public/items-h/`（横書き）、`public/items-v/`（縦書き）から QTI XML ファイルを配信

**qti-generator** (Python 3.10+)
npm workspace 外の独立した Python プロジェクト
- 学習指導要領LOD（jp-cos.github.io）から Claude API で QTI 問題を自動生成
- `qti-generator/ai-choice/` - 4択問題生成
- `qti-generator/ai-text/` - 記述式問題生成
- 共通の環境変数: `qti-generator/.env`

### データフロー

1. Next.js の `/basic` ページで `BasicRunInProgress` をレンダリング
2. iframe が URL パラメータ付きで Vue Player を読み込み
3. Vue Player が Next.js から QTI XML を fetch (`/items-h/*.xml` または `/items-v/*.xml`)
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
- `qti-generator/ai-choice/src/main.py` - 4択問題生成エントリーポイント
- `qti-generator/ai-text/src/main.py` - 記述式問題生成エントリーポイント
- `qti-generator/.env` - AI生成ツール共通環境変数（ANTHROPIC_API_KEY等）

### 環境変数 (packages/web/.env.local)

```
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_PLAYER_URL=http://localhost:5173
PLAYER_URL=http://localhost:5173
```

### 環境変数 (qti-generator/.env)

```
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx
DEFAULT_MODEL=claude-sonnet-4-5-20250929
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxx  # Vercel Blob アップロード用（オプション）
```

## QTI アイテム形式

QTI 3.0 XML ファイルを `packages/web/public/items-h/`（横書き）または `packages/web/public/items-v/`（縦書き）に配置。サポートするインタラクション:
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
{ "success": true, "nextItem": "https://example.com/items-h/question-002.xml", "isComplete": false }
```

詳細は `tech-guide.md` を参照。
