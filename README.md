# NexCBT - QTI3 Assessment Platform

QTI 3.0 規格に基づいたオンラインテストプラットフォームのデモ実装です。

## デモサイト

| サービス | URL |
|---------|-----|
| テストページ | https://qti3-web.shumi.dev/test |
| Web (Next.js) | https://qti3-web.shumi.dev/ |
| Player (Vue) | https://qti3-player.shumi.dev/ |

## 概要

本プロジェクトは、IMS Global の QTI (Question and Test Interoperability) 3.0 規格に準拠したアセスメントアイテムを表示・採点するシステムです。

### アーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│  Next.js (packages/web)        https://qti3-web.shumi.dev  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  QtiPlayerFrame (iframe)                            │   │
│  │  ┌───────────────────────────────────────────────┐  │   │
│  │  │  Vue Player (packages/qti-player)             │  │   │
│  │  │  https://qti3-player.shumi.dev               │  │   │
│  │  │  - QTI XML の読み込み・表示                   │  │   │
│  │  │  - 採点処理                                   │  │   │
│  │  │  - セッション結果の累積管理                   │  │   │
│  │  └───────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                 │
│                           ▼ POST /api/results               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  API Routes                                         │   │
│  │  - 結果受信・検証                                   │   │
│  │  - 次の問題URL返却                                  │   │
│  │  - 全問完了時のサマリー生成                         │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## プロジェクト構成

```
qti3-demo/
├── packages/
│   ├── qti-player/          # Vue 3 QTI Player
│   │   ├── src/
│   │   │   ├── App.vue      # メインコンポーネント（結果表示含む）
│   │   │   ├── main.js      # エントリーポイント（Analytics含む）
│   │   │   └── composables/
│   │   │       ├── useItemLoader.js    # XML読み込み
│   │   │       └── useResultSubmit.js  # 結果送信・累積管理
│   │   └── package.json
│   │
│   └── web/                  # Next.js Web Application
│       ├── src/
│       │   ├── app/
│       │   │   ├── page.tsx           # ホームページ
│       │   │   ├── test/page.tsx      # テストページ
│       │   │   └── api/results/route.ts  # 結果受信API
│       │   └── components/
│       │       └── QtiPlayerFrame/    # iframe wrapper
│       ├── public/
│       │   └── items/        # QTI XMLファイル
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
| web | Next.js 16 + TypeScript | アプリケーション本体 |
| - | Turborepo | モノレポ管理 |
| - | Vercel | ホスティング（東京リージョン） |

### 主要ライブラリ

- [qti3-item-player-vue3](https://github.com/amp-up-io/qti3-item-player-vue3) - QTI 3.0 プレイヤーコンポーネント
- [Vercel Analytics](https://vercel.com/analytics) - ユーザー行動分析（両パッケージで有効）
- [Material UI](https://mui.com/) - UIコンポーネント

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

1. ブラウザで http://localhost:3000/test を開く
2. 3問のテストを実行（選択・並べ替え・テキスト入力）
3. 全問完了後、成績サマリーが表示される

## サポートしているインタラクション

| インタラクション | 説明 | サンプル |
|-----------------|------|---------|
| choiceInteraction | 単一/複数選択 | choice-item-001.xml |
| orderInteraction | 並べ替え | order-item-001.xml |
| textEntryInteraction | テキスト入力 | text-entry-item-001.xml |

## 主要機能

### セッション管理
- クライアントサイドで結果を累積管理（sessionStorage使用）
- サーバーレス環境（Vercel Functions）に対応
- セッションIDによる結果の追跡

### 採点・結果表示
- 各問題の即時採点
- 全問完了後の総合成績表示
- 正答率・問題別結果の可視化

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
- [x] sessionStorageによる結果永続化（サーバーレス対応）

### 完了 (Phase 4)

- [x] Vercelデプロイ
- [x] 本番環境の構築
- [x] CORS設定の本番対応
- [x] カスタムドメイン設定（shumi.dev）
- [x] 東京リージョン（hnd1）設定
- [x] Vercel Web Analytics 導入

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
| `NEXT_PUBLIC_APP_URL` | Webアプリの公開URL | `https://qti3-web.shumi.dev` |
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
