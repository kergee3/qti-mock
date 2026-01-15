# NexCBT - QTI3 Assessment Platform

QTI 3.0 規格に基づいたオンラインテストプラットフォームのデモ実装です。

## デモサイト

| サービス | URL |
|---------|-----|
| Basic Run | https://qti-mock.shumi.dev/basic |
| Playground | https://qti-mock.shumi.dev/playground |
| Web (Next.js) | https://qti-mock.shumi.dev/ |
| Player (Vue) | https://qti3-player.shumi.dev/ |

## 概要

本プロジェクトは、IMS Global の QTI (Question and Test Interoperability) 3.0 規格に準拠したアセスメントアイテムを表示・採点するシステムです。

### アーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│  Next.js (packages/web)        https://qti-mock.shumi.dev  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  BasicRunInProgress (iframe + サイドバー)          │   │
│  │  ┌───────────────────────────────────────────────┐  │   │
│  │  │  Vue Player (packages/qti-player)             │  │   │
│  │  │  https://qti3-player.shumi.dev               │  │   │
│  │  │  - QTI XML の読み込み・表示                   │  │   │
│  │  │  - 採点処理                                   │  │   │
│  │  │  - 回答内容・所要時間の抽出                   │  │   │
│  │  └───────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                 │
│                           ▼ postMessage                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  BasicRunResults                                    │   │
│  │  - 問題別結果テーブル（回答・時間・スコア）        │   │
│  │  - 正答率・総合成績表示                            │   │
│  │  - 未採点問題（外部採点）の識別                    │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## プロジェクト構成

```
qti-mock/
├── packages/
│   ├── qti-player/          # Vue 3 QTI Player
│   │   ├── src/
│   │   │   ├── App.vue      # メインコンポーネント（採点・回答抽出）
│   │   │   ├── main.js      # エントリーポイント（Analytics含む）
│   │   │   └── composables/
│   │   │       ├── useItemLoader.js    # XML読み込み
│   │   │       └── useResultSubmit.js  # 結果送信
│   │   └── package.json
│   │
│   └── web/                  # Next.js Web Application
│       ├── src/
│       │   ├── app/
│       │   │   ├── page.tsx           # ルート（/home へリダイレクト）
│       │   │   ├── home/page.tsx      # ホームページ
│       │   │   ├── basic/page.tsx     # Basic Run ページ
│       │   │   └── playground/page.tsx # Playground ページ
│       │   ├── components/
│       │   │   ├── QtiPlayerFrame/    # iframe wrapper
│       │   │   ├── navigation/        # ナビゲーション（サイドバー等）
│       │   │   ├── basic-run/         # Basic Run 関連コンポーネント
│       │   │   │   ├── BasicRunInProgress.tsx   # テスト実行画面
│       │   │   │   ├── BasicRunResults.tsx      # 結果表示画面
│       │   │   │   └── BasicRunInitialScreen.tsx # 開始画面
│       │   │   └── playground/        # Playground コンポーネント
│       │   │       └── PlaygroundPage.tsx
│       │   └── types/
│       │       └── test.ts            # 型定義（ItemResult等）
│       ├── public/
│       │   ├── items-h/      # QTI XMLファイル（横書き）
│       │   └── items-v/      # QTI XMLファイル（縦書き）
│       └── package.json
│
├── package.json              # ルート (npm workspaces)
├── turbo.json               # Turborepo 設定
├── vercel.json              # Vercel設定（東京リージョン）
└── CLAUDE.md                # Claude Code ガイド
```

## 技術スタック

| パッケージ | 技術 | 説明 |
|-----------|------|------|
| qti-player | Vue 3 + Vite 7 | QTI 3.0 アイテムのレンダリング・採点 |
| web | Next.js 15 + TypeScript | アプリケーション本体 |
| - | Turborepo | モノレポ管理 |
| - | Vercel | ホスティング（東京リージョン） |

### 主要ライブラリ

- [qti3-item-player-vue3](https://github.com/amp-up-io/qti3-item-player-vue3) - QTI 3.0 プレイヤーコンポーネント
- [Vercel Analytics](https://vercel.com/analytics) - ユーザー行動分析（両パッケージで有効）
- [Material UI](https://mui.com/) - UIコンポーネント（Tooltip, Table等）

## セットアップ

### 必要環境

- Node.js 20.x 以上
- npm 11.x 以上

### インストール

```bash
# リポジトリをクローン
git clone https://github.com/kergee3/qti3-demo.git
cd qti3-demo

# 依存関係をインストール
npm install
```

### 開発サーバー起動

```bash
# 両方のパッケージを同時に起動
npm run dev

# または個別に起動
npm run dev:player  # http://localhost:5173
npm run dev:web     # http://localhost:3000
```

### 動作確認

1. ブラウザで http://localhost:3000/basic を開く
2. プリセット問題でテストを実行（各種インタラクション）
3. 問題番号にホバーすると、タイトルとインタラクションタイプを表示
4. 全問完了後、結果画面で回答内容・所要時間・スコアを確認

または http://localhost:3000/playground で QTI XML を直接入力してテストを実行

## サポートしているインタラクション

| インタラクション | 説明 | サンプル |
|-----------------|------|---------|
| choiceInteraction | 単一/複数選択 | choice-item-001.xml |
| inlineChoiceInteraction | インライン選択 | inline-choice-item-001.xml |
| matchInteraction | マッチング | match-item-001.xml |
| orderInteraction | 並べ替え | order-item-001.xml |
| textEntryInteraction | テキスト入力 | text-entry-item-001.xml |
| extendedTextInteraction | 長文テキスト入力（外部採点） | vertical-ext-text-27.xml |
| graphicChoiceInteraction | 画像選択（ホットスポット） | graphic-choice-item-001.xml |

## 主要機能

### Basic Run
プリセット問題でテストを体験できるモード。選択問題、並べ替え問題、テキスト入力問題などが含まれています。

### Playground
QTI XML を直接入力またはドラッグ＆ドロップで自由にテストを実行できるモード。

### テスト実行画面 (BasicRunInProgress)
- 左サイドバーに問題番号ボタンを表示
- 問題番号にホバーでタイトル・インタラクションタイプをTooltip表示
- 回答状況に応じた色分け（青: 現在、緑: 正解、赤: 不正解、オレンジ: 未採点、グレー: 未回答）
- 問題番号下に区切り線を引いて終了ボタンを配置

### 結果表示画面 (BasicRunResults)
- 問題別結果テーブル（問題番号、タイトル、回答、所要時間、結果）
- 回答列は長文の場合省略表示（...）、Tooltipで全文表示
- 所要時間（秒）を独立した列で表示
- 正答率・総合スコアの表示
- 外部採点問題の識別と未採点数の表示

### 採点・回答処理 (Vue Player)
- responseVariables から回答内容を抽出（numAttempts除外）
- duration（所要時間）を別フィールドとして抽出
- HTMLタグの除去（`<p>テキスト</p>` → `テキスト`）
- postMessage で親ウィンドウに結果を送信

### セッション管理
- クライアントサイドで結果を累積管理
- サーバーレス環境（Vercel Functions）に対応
- セッションIDによる結果の追跡

### CORS対応
- 環境変数による動的オリジン設定
- 開発環境・本番環境の両対応

## 開発状況

### 完了 (Phase 1-2)

- [x] モノレポ構造への変換
- [x] Vue Player の URL駆動方式対応
- [x] Next.js アプリケーション構築
- [x] iframe 埋め込みコンポーネント
- [x] 結果受信 API (/api/results)
- [x] CORS 設定
- [x] 複数問題のシーケンス管理
- [x] 成績サマリー表示

### 完了 (Phase 4)

- [x] Vercelデプロイ
- [x] 本番環境の構築
- [x] CORS設定の本番対応
- [x] カスタムドメイン設定（shumi.dev）
- [x] 東京リージョン（hnd1）設定
- [x] Vercel Web Analytics 導入

### 完了 (UI改善)

- [x] テスト実行画面のサイドバー改善（問題番号Tooltip、終了ボタン配置）
- [x] 結果画面の回答・所要時間の分離表示
- [x] 長文回答の省略表示とTooltip
- [x] 回答からHTMLタグ除去
- [x] 各種インタラクションタイプのサポート拡充

### 今後の予定 (Phase 3, 5)

- [ ] **Phase 3: ETL構築**
  - QTI XMLの変換・インポート機能
  - データベース連携（問題・結果の永続化）

- [ ] **Phase 5: 本番運用準備**
  - エラー監視（Sentry等）
  - パフォーマンスモニタリング
  - ドキュメント整備

## 環境変数

### packages/web（Vercel）

| 変数名 | 説明 | 例 |
|--------|------|-----|
| `NEXT_PUBLIC_APP_URL` | Webアプリの公開URL | `https://qti-mock.shumi.dev` |
| `NEXT_PUBLIC_PLAYER_URL` | Playerの公開URL | `https://qti3-player.shumi.dev` |
| `PLAYER_URL` | CORS許可オリジン | `https://qti3-player.shumi.dev` |

## スクリプト

```bash
npm run dev        # 全パッケージの開発サーバー起動
npm run dev:player # Vue Player のみ起動
npm run dev:web    # Next.js のみ起動
npm run build      # 全パッケージをビルド
npm run lint       # リント実行
```

## ライセンス

MIT

## 参考リンク

- [QTI 3.0 Specification](https://www.imsglobal.org/spec/qti/v3p0/impl)
- [qti3-item-player-vue3](https://github.com/amp-up-io/qti3-item-player-vue3)
- [Turborepo Documentation](https://turbo.build/repo/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Vercel Documentation](https://vercel.com/docs)
