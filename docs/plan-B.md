# QTI3 Assessment Platform 開発計画書

## 1. プロジェクト概要

### 1.1 目的
QTI 3.0形式の問題を配信・採点できるオンラインアセスメントプラットフォームの構築

### 1.2 背景
- 開発チームはReact + Next.jsに習熟しており、Vue 3/Nuxt 3の経験がない
- 既存のNext.jsアプリをVercelにデプロイしている
- QTI 3.0対応のプレイヤーとして`qti3-item-player-vue3`を採用したい

### 1.3 技術的制約
- `qti3-item-player-vue3`はVue 3専用であり、React版は存在しない
- Material UI (MUI) はReact専用であり、Vue 3では使用不可

---

## 2. アーキテクチャ決定

### 2.1 採用アプローチ：iframe埋め込み

```
┌─────────────────────────────────────────────────────────┐
│  Next.js アプリ (Vercel: app.example.com)               │
│  ・Material UI によるUI                                 │
│  ・ユーザー認証・管理                                    │
│  ・テスト管理・結果表示                                  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  iframe (Vercel: player.example.com)              │  │
│  │  Vue 3 + qti3-item-player-vue3                    │  │
│  │  ・QTI XMLの解析・レンダリング                      │  │
│  │  ・受験者インタラクション                           │  │
│  │  ・採点処理                                        │  │
│  └───────────────────────────────────────────────────┘  │
│         ↕ postMessage API                              │
└─────────────────────────────────────────────────────────┘
```

### 2.2 アプローチ選定理由

| 検討項目 | iframe埋め込み | Vue 3移行 |
|---------|---------------|-----------|
| 学習コスト | 低（既存スキル活用） | 高（Vue 3習得必要） |
| 開発速度 | 速い | 遅い |
| MUI継続利用 | 可能 | 不可（Vuetify等に移行） |
| メンテナンス | 2プロジェクト管理 | 1プロジェクト |
| 長期運用 | やや複雑 | シンプル |

### 2.3 性能評価

| 項目 | 評価 | 備考 |
|------|------|------|
| 初期読み込み | やや増加 | Vue + Next.js両バンドル（+200-400KB） |
| 採点レイテンシ | 即時 | ブラウザ内処理のため影響なし |
| オフライン対応 | 可能 | 両アプリにServiceWorker必要 |
| postMessage遅延 | 数ms | 体感できないレベル |

---

## 3. リポジトリ構成

### 3.1 モノレポ構造

```
nexcbt/
├── packages/
│   ├── etl/                      # Python ETL
│   │   ├── src/
│   │   │   ├── converters/       # QTI3変換ロジック
│   │   │   ├── processors/       # データ前処理
│   │   │   └── loaders/          # DB保存
│   │   ├── tests/
│   │   ├── requirements.txt
│   │   └── pyproject.toml
│   │
│   ├── web/                      # Next.js アプリ
│   │   ├── src/
│   │   │   ├── app/              # App Router
│   │   │   ├── components/
│   │   │   │   └── QtiPlayerFrame/  # iframe wrapper
│   │   │   ├── hooks/
│   │   │   │   └── useQtiPlayer.ts  # postMessage通信
│   │   │   └── lib/
│   │   ├── public/
│   │   ├── package.json
│   │   └── next.config.js
│   │
│   └── qti-player/               # Vue 3 QTI Player
│       ├── src/
│       │   ├── App.vue
│       │   ├── main.js
│       │   └── composables/
│       │       └── usePostMessage.js  # 親との通信
│       ├── public/
│       ├── package.json
│       └── vite.config.js
│
├── package.json                  # ワークスペース設定
├── turbo.json                    # Turborepo設定
├── .gitignore
└── README.md
```

### 3.2 ルートpackage.json

```json
{
  "name": "nexcbt",
  "private": true,
  "workspaces": [
    "packages/web",
    "packages/qti-player"
  ],
  "scripts": {
    "dev": "turbo run dev",
    "dev:web": "npm -w packages/web run dev",
    "dev:player": "npm -w packages/qti-player run dev",
    "build": "turbo run build",
    "build:web": "npm -w packages/web run build",
    "build:player": "npm -w packages/qti-player run build"
  },
  "devDependencies": {
    "turbo": "^2.0.0"
  }
}
```

---

## 4. 通信設計

### 4.1 postMessage プロトコル

#### Next.js → Vue 3 (コマンド)

```typescript
// 問題読み込み
{ type: 'LOAD_ITEM', payload: { xml: string, config: object } }

// 採点実行
{ type: 'END_ATTEMPT' }

// リセット
{ type: 'RESET' }
```

#### Vue 3 → Next.js (イベント)

```typescript
// プレイヤー準備完了
{ type: 'PLAYER_READY' }

// 問題読み込み完了
{ type: 'ITEM_READY', payload: { identifier: string } }

// 採点完了
{ type: 'ATTEMPT_COMPLETED', payload: { score: number, responses: object } }

// エラー
{ type: 'ERROR', payload: { message: string, code: string } }
```

### 4.2 セキュリティ考慮

```typescript
// Next.js側：origin検証
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://player.example.com') return
  // 処理
})

// Vue 3側：origin検証
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://app.example.com') return
  // 処理
})
```

---

## 5. Vercelデプロイ設定

### 5.1 プロジェクト構成

| Vercelプロジェクト | ディレクトリ | ドメイン |
|-------------------|-------------|---------|
| nexcbt-web | packages/web | app.example.com |
| nexcbt-player | packages/qti-player | player.example.com |

### 5.2 vercel.json (packages/web)

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs"
}
```

### 5.3 vercel.json (packages/qti-player)

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite"
}
```

---

## 6. 開発フェーズ

### Phase 1: 基盤構築（1-2週間）

- [ ] モノレポ環境セットアップ
- [ ] packages/qti-player の移行（現在のqti3-demoから）
- [ ] packages/web の初期構築
- [ ] postMessage通信の基本実装
- [ ] ローカル開発環境の整備

### Phase 2: コア機能（2-3週間）

- [ ] QtiPlayerFrameコンポーネント（Next.js）
- [ ] useQtiPlayerフック（Next.js）
- [ ] usePostMessageコンポーザブル（Vue 3）
- [ ] 問題読み込み・採点フロー実装
- [ ] エラーハンドリング

### Phase 3: ETL構築（2-3週間）

- [ ] QTI3 XML変換ロジック
- [ ] データベーススキーマ設計
- [ ] 問題インポート機能
- [ ] バリデーション

### Phase 4: 統合・テスト（1-2週間）

- [ ] E2Eテスト
- [ ] パフォーマンステスト
- [ ] セキュリティレビュー
- [ ] Vercelデプロイ設定

### Phase 5: 本番運用準備（1週間）

- [ ] 監視・ログ設定
- [ ] エラー追跡（Sentry等）
- [ ] ドキュメント整備

---

## 7. 技術スタック詳細

### 7.1 packages/web (Next.js)

| カテゴリ | 技術 |
|---------|------|
| フレームワーク | Next.js 14+ (App Router) |
| 言語 | TypeScript |
| UI | Material UI (MUI) v5+ |
| 状態管理 | Zustand or Jotai |
| データ取得 | TanStack Query |
| 認証 | NextAuth.js |

### 7.2 packages/qti-player (Vue 3)

| カテゴリ | 技術 |
|---------|------|
| フレームワーク | Vue 3 (Composition API) |
| ビルドツール | Vite |
| QTIプレイヤー | qti3-item-player-vue3 |
| 言語 | JavaScript (TypeScript移行可) |

### 7.3 packages/etl (Python)

| カテゴリ | 技術 |
|---------|------|
| 言語 | Python 3.11+ |
| XML処理 | lxml |
| DB接続 | SQLAlchemy / psycopg2 |
| バリデーション | Pydantic |

---

## 8. リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| postMessage通信の複雑化 | 中 | 型定義の共有、プロトコルのバージョン管理 |
| 2プロジェクトのデプロイ同期 | 中 | Turborepoによる統一ビルド、CI/CDパイプライン |
| iframeのレスポンシブ対応 | 中 | ResizeObserverによる動的サイズ調整 |
| qti3-item-player-vue3の更新 | 低 | 定期的なアップデート確認、変更履歴監視 |

---

## 9. 今後の検討事項

### 9.1 将来的な移行オプション

1. **React版QTI Playerの登場を待つ**
   - amp-up.ioの動向を監視
   - React版が出れば iframe不要に

2. **Vue 3への完全移行**
   - チームのスキル習得後に検討
   - MUIからVuetifyへの移行が必要

### 9.2 スケーラビリティ

- 問題数増加時のXMLキャッシュ戦略
- 同時受験者数に応じたインフラ設計
- オフライン対応の本格実装

---

## 10. 参考資料

- [qti3-item-player-vue3 (GitHub)](https://github.com/amp-up-io/qti3-item-player-vue3)
- [QTI 3.0 仕様書 (1EdTech)](https://www.imsglobal.org/spec/qti/v3p0/)
- [Amp-up.io](https://www.amp-up.io/)
- [Vercel Monorepo Guide](https://vercel.com/docs/monorepos)

---

## 変更履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|---------|
| 2024-12-29 | 1.0 | 初版作成 |
