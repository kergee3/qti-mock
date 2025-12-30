# NexCBT - QTI3 Assessment Platform

QTI 3.0 規格に基づいたオンラインテストプラットフォームのデモ実装です。

## 概要

本プロジェクトは、IMS Global の QTI (Question and Test Interoperability) 3.0 規格に準拠したアセスメントアイテムを表示・採点するシステムです。

### アーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│  Next.js (packages/web)           http://localhost:3000    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  QtiPlayerFrame (iframe)                            │   │
│  │  ┌───────────────────────────────────────────────┐  │   │
│  │  │  Vue Player (packages/qti-player)             │  │   │
│  │  │  http://localhost:5173                        │  │   │
│  │  │  - QTI XML の読み込み・表示                   │  │   │
│  │  │  - 採点処理                                   │  │   │
│  │  └───────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                 │
│                           ▼ POST /api/results               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  API Routes                                         │   │
│  │  - 結果受信・保存                                   │   │
│  │  - 次の問題URL返却                                  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## プロジェクト構成

```
qti3-demo/
├── packages/
│   ├── qti-player/          # Vue 3 QTI Player
│   │   ├── src/
│   │   │   ├── App.vue
│   │   │   ├── main.js
│   │   │   └── composables/
│   │   │       ├── useItemLoader.js
│   │   │       └── useResultSubmit.js
│   │   └── package.json
│   │
│   └── web/                  # Next.js Web Application
│       ├── src/
│       │   ├── app/
│       │   │   ├── test/page.tsx
│       │   │   └── api/results/route.ts
│       │   └── components/
│       │       └── QtiPlayerFrame/
│       ├── public/
│       │   └── items/        # QTI XMLファイル
│       └── package.json
│
├── package.json              # ルート (npm workspaces)
├── turbo.json               # Turborepo 設定
├── plan-A.md                # 設計書 (Web Request方式)
├── plan-B.md                # 設計書 (postMessage方式)
└── dev-steps-A.md           # 開発手順書
```

## 技術スタック

| パッケージ | 技術 | 説明 |
|-----------|------|------|
| qti-player | Vue 3 + Vite | QTI 3.0 アイテムのレンダリング・採点 |
| web | Next.js 15 + TypeScript | アプリケーション本体 |
| - | Turborepo | モノレポ管理 |

### 主要ライブラリ

- [qti3-item-player-vue3](https://github.com/amp-up-io/qti3-item-player-vue3) - QTI 3.0 プレイヤーコンポーネント
- [Vercel Analytics](https://vercel.com/analytics) - ユーザー行動分析

## セットアップ

### 必要環境

- Node.js 20.x 以上
- npm 10.x 以上

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

1. ブラウザで http://localhost:3000/test を開く
2. 3問のテストを実行（選択・並べ替え・テキスト入力）
3. 全問完了後、成績サマリーが表示される

## サポートしているインタラクション

| インタラクション | 説明 | サンプル |
|-----------------|------|---------|
| choiceInteraction | 単一/複数選択 | choice-item-001.xml |
| orderInteraction | 並べ替え | order-item-001.xml |
| textEntryInteraction | テキスト入力 | text-entry-item-001.xml |

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
- [x] カスタムドメイン設定

### デプロイ先

| サービス | URL |
|---------|-----|
| Web (Next.js) | https://qti3-web.shumi.dev/ |
| Player (Vue) | https://qti3-player.shumi.dev/ |
| テストページ | https://qti3-web.shumi.dev/test |

### 今後の予定 (Phase 3, 5)

- [ ] **Phase 3: ETL構築**
  - QTI XMLの変換・インポート機能
  - データベース連携（問題・結果の永続化）

- [ ] **Phase 5: 本番運用準備**
  - エラー監視（Sentry等）
  - パフォーマンスモニタリング
  - ドキュメント整備

## ドキュメント

| ファイル | 説明 |
|---------|------|
| [plan-A.md](./plan-A.md) | Web Request方式の設計書 |
| [plan-B.md](./plan-B.md) | postMessage方式の設計書（参考） |
| [dev-steps-A.md](./dev-steps-A.md) | 開発手順書 |

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
