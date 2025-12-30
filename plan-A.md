# QTI3 Assessment Platform 開発計画書 (Plan A: Web Request方式)

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

### 2.1 採用アプローチ：Web Request方式（URL渡し）

```
┌─────────────────────────────────────────────────────────────────┐
│  Next.js アプリ (Vercel: app.example.com)                       │
│  ・Material UI によるUI                                         │
│  ・ユーザー認証・管理                                            │
│  ・テスト管理・結果表示                                          │
│                                                                 │
│  1. iframe src にクエリパラメータでXML URLを渡す                  │
│     player.example.com/?item=https://api.../items/123           │
│     &callback=https://app.../api/results&session=xxx            │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Vue 3 Player (Vercel: player.example.com)                │  │
│  │                                                            │  │
│  │  2. XML URLからfetchで問題取得                             │  │
│  │  3. 受験者がテスト実施（ブラウザ内で完結）                   │  │
│  │  4. 完了時、callback URLにPOSTで結果送信                   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  5. Next.js API Routeで結果受信                                │
│  6. 画面更新（ポーリング / SSE / WebSocket）                    │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Plan A (Web Request) vs Plan B (postMessage) 比較

| 検討項目 | Plan A: Web Request | Plan B: postMessage |
|---------|---------------------|---------------------|
| 結合度 | 低（標準HTTP） | 中（プロトコル依存） |
| Vue側の独立性 | 高（単体動作可能） | 低（親ウィンドウ前提） |
| テスト容易性 | 高（単体テスト可能） | 中（iframe環境必要） |
| デバッグ | 容易（標準Web開発） | やや複雑（DevTools） |
| 再利用性 | 高（他システム統合可） | 限定的 |
| リアルタイム性 | やや劣る（ポーリング等必要） | 即時 |
| 実装複雑度 | やや高（API設計必要） | 低 |

### 2.3 Web Request方式の利点

1. **Vue Playerの完全独立**
   - URLを直接開けば単体で動作確認可能
   - iframe外での利用も可能

2. **標準技術による統合**
   - RESTful API設計
   - OpenAPI仕様化可能
   - 他のLMSやシステムとの統合が容易

3. **HTTPキャッシュの活用**
   - XMLファイルのCDNキャッシュが効く
   - パフォーマンス最適化が容易

4. **テスト・デバッグの容易さ**
   - 単体テストが書きやすい
   - APIテストツール（Postman等）で検証可能

### 2.4 性能評価

| 項目 | 評価 | 備考 |
|------|------|------|
| 初期読み込み | やや増加 | Vue + Next.js両バンドル（+200-400KB） |
| 問題取得 | 高速 | CDNキャッシュ活用可能 |
| 採点処理 | 即時 | ブラウザ内処理（オフライン可） |
| 結果通知 | 数100ms | HTTP POST完了まで |
| 画面更新 | ポーリング間隔依存 | SSE/WebSocketで改善可能 |

---

## 3. 通信設計

### 3.1 Vue Player呼び出しURL

```
https://player.example.com/
  ?item=https://api.example.com/items/{itemId}.xml
  &callback=https://app.example.com/api/results
  &session={sessionId}
  &token={authToken}
```

| パラメータ | 必須 | 説明 |
|-----------|------|------|
| item | ○ | QTI XMLファイルのURL |
| callback | ○ | 結果送信先URL |
| session | ○ | セッション識別子 |
| token | △ | 認証トークン（セキュリティ強化時） |

### 3.2 結果送信API

#### リクエスト (Vue Player → Next.js)

```http
POST /api/results
Content-Type: application/json
Authorization: Bearer {token}

{
  "sessionId": "sess-123",
  "itemId": "choice-item-001",
  "timestamp": "2024-12-30T10:30:00Z",
  "result": {
    "score": 1,
    "maxScore": 1,
    "responses": {
      "RESPONSE": "A"
    },
    "outcomeVariables": [
      { "identifier": "SCORE", "value": 1 }
    ],
    "duration": 45000
  }
}
```

#### レスポンス (Next.js → Vue Player)

```json
{
  "success": true,
  "nextItem": "https://api.example.com/items/text-item-001.xml"
}
```

### 3.3 結果通知方式の選択肢

| 方式 | 実装難易度 | リアルタイム性 | 推奨用途 |
|------|-----------|---------------|---------|
| ポーリング | 低 | 低（数秒遅延） | MVP段階 |
| Server-Sent Events | 中 | 高 | 推奨 |
| WebSocket | 高 | 最高 | 大規模運用 |
| postMessage併用 | 中 | 即時 | ハイブリッド |

### 3.4 セキュリティ設計

```typescript
// Next.js API Route: /api/results
export async function POST(req: Request) {
  // 1. Origin検証
  const origin = req.headers.get('origin')
  if (origin !== 'https://player.example.com') {
    return Response.json({ error: 'Invalid origin' }, { status: 403 })
  }

  // 2. トークン検証
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  const session = await verifySessionToken(token)
  if (!session) {
    return Response.json({ error: 'Invalid token' }, { status: 401 })
  }

  // 3. 結果保存
  const body = await req.json()
  await saveResult(session.id, body)

  return Response.json({ success: true })
}
```

```javascript
// Vue Player: CORS対応fetch
const submitResult = async (result) => {
  const params = new URLSearchParams(window.location.search)
  const callbackUrl = params.get('callback')
  const token = params.get('token')

  await fetch(callbackUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    credentials: 'include',
    body: JSON.stringify(result)
  })
}
```

---

## 4. リポジトリ構成

### 4.1 モノレポ構造

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
│   │   │   ├── app/
│   │   │   │   ├── api/
│   │   │   │   │   └── results/  # 結果受信API
│   │   │   │   └── test/         # テスト画面
│   │   │   ├── components/
│   │   │   │   └── QtiPlayerFrame/  # iframe wrapper
│   │   │   └── lib/
│   │   │       └── session.ts    # セッション管理
│   │   ├── public/
│   │   │   └── items/            # XMLファイル配置（開発用）
│   │   ├── package.json
│   │   └── next.config.js
│   │
│   └── qti-player/               # Vue 3 QTI Player
│       ├── src/
│       │   ├── App.vue
│       │   ├── main.js
│       │   └── composables/
│       │       ├── useItemLoader.js   # URL→XML取得
│       │       └── useResultSubmit.js # 結果送信
│       ├── public/
│       ├── package.json
│       └── vite.config.js
│
├── packages/shared/              # 共有型定義（オプション）
│   ├── types/
│   │   └── result.ts
│   └── package.json
│
├── package.json                  # ワークスペース設定
├── turbo.json                    # Turborepo設定
├── .gitignore
└── README.md
```

### 4.2 ルートpackage.json

```json
{
  "name": "nexcbt",
  "private": true,
  "workspaces": [
    "packages/web",
    "packages/qti-player",
    "packages/shared"
  ],
  "scripts": {
    "dev": "turbo run dev",
    "dev:web": "npm -w packages/web run dev",
    "dev:player": "npm -w packages/qti-player run dev",
    "build": "turbo run build",
    "test": "turbo run test"
  },
  "devDependencies": {
    "turbo": "^2.0.0"
  }
}
```

---

## 5. 実装詳細

### 5.1 Next.js側実装

#### QtiPlayerFrame コンポーネント

```tsx
// packages/web/src/components/QtiPlayerFrame/index.tsx
'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  itemUrl: string
  sessionId: string
  onComplete?: () => void
}

export function QtiPlayerFrame({ itemUrl, sessionId, onComplete }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [isLoading, setIsLoading] = useState(true)

  const playerUrl = new URL(process.env.NEXT_PUBLIC_PLAYER_URL!)
  playerUrl.searchParams.set('item', itemUrl)
  playerUrl.searchParams.set('callback', `${process.env.NEXT_PUBLIC_APP_URL}/api/results`)
  playerUrl.searchParams.set('session', sessionId)

  return (
    <div className="player-frame">
      {isLoading && <div className="loading">読み込み中...</div>}
      <iframe
        ref={iframeRef}
        src={playerUrl.toString()}
        onLoad={() => setIsLoading(false)}
        style={{ width: '100%', height: '600px', border: 'none' }}
        sandbox="allow-scripts allow-same-origin allow-forms"
      />
    </div>
  )
}
```

#### 結果受信API Route

```typescript
// packages/web/src/app/api/results/route.ts
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  // Origin検証
  const origin = req.headers.get('origin')
  const allowedOrigins = [process.env.PLAYER_URL]

  if (!allowedOrigins.includes(origin)) {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    )
  }

  const body = await req.json()
  const { sessionId, itemId, result } = body

  // 結果をDBに保存
  await saveResult(sessionId, itemId, result)

  // 次の問題URLを返す（あれば）
  const nextItem = await getNextItem(sessionId, itemId)

  return NextResponse.json({
    success: true,
    nextItem: nextItem?.url || null
  })
}
```

### 5.2 Vue Player側実装

#### useItemLoader コンポーザブル

```javascript
// packages/qti-player/src/composables/useItemLoader.js
import { ref } from 'vue'

export function useItemLoader() {
  const itemXml = ref(null)
  const isLoading = ref(false)
  const error = ref(null)

  const loadItem = async () => {
    const params = new URLSearchParams(window.location.search)
    const itemUrl = params.get('item')

    if (!itemUrl) {
      error.value = 'item parameter is required'
      return
    }

    isLoading.value = true
    error.value = null

    try {
      const response = await fetch(itemUrl)
      if (!response.ok) {
        throw new Error(`Failed to fetch item: ${response.status}`)
      }
      itemXml.value = await response.text()
    } catch (e) {
      error.value = e.message
    } finally {
      isLoading.value = false
    }
  }

  return { itemXml, isLoading, error, loadItem }
}
```

#### useResultSubmit コンポーザブル

```javascript
// packages/qti-player/src/composables/useResultSubmit.js
import { ref } from 'vue'

export function useResultSubmit() {
  const isSubmitting = ref(false)
  const submitError = ref(null)
  const nextItemUrl = ref(null)

  const submitResult = async (itemId, result) => {
    const params = new URLSearchParams(window.location.search)
    const callbackUrl = params.get('callback')
    const sessionId = params.get('session')
    const token = params.get('token')

    if (!callbackUrl || !sessionId) {
      submitError.value = 'callback and session parameters are required'
      return false
    }

    isSubmitting.value = true
    submitError.value = null

    try {
      const response = await fetch(callbackUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          sessionId,
          itemId,
          timestamp: new Date().toISOString(),
          result
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to submit result: ${response.status}`)
      }

      const data = await response.json()
      nextItemUrl.value = data.nextItem
      return true
    } catch (e) {
      submitError.value = e.message
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  return { isSubmitting, submitError, nextItemUrl, submitResult }
}
```

#### App.vue（URL駆動版）

```vue
<!-- packages/qti-player/src/App.vue -->
<template>
  <div class="qti-player-app">
    <!-- ローディング -->
    <div v-if="isLoading" class="loading">
      問題を読み込み中...
    </div>

    <!-- エラー -->
    <div v-else-if="error" class="error">
      {{ error }}
    </div>

    <!-- プレイヤー -->
    <template v-else>
      <Qti3Player
        ref="qti3player"
        @notifyQti3PlayerReady="handlePlayerReady"
        @notifyQti3ItemReady="handleItemReady"
        @notifyQti3EndAttemptCompleted="handleEndAttempt"
      />

      <div v-if="isItemLoaded && !isScored" class="controls">
        <button @click="submitResponse">採点</button>
      </div>

      <div v-if="isScored" class="result">
        <p>スコア: {{ score }}</p>
        <button v-if="nextItemUrl" @click="goToNextItem">次へ</button>
        <p v-else>テスト完了</p>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useItemLoader } from './composables/useItemLoader'
import { useResultSubmit } from './composables/useResultSubmit'

const qti3player = ref(null)
let qti3Player = null

const { itemXml, isLoading, error, loadItem } = useItemLoader()
const { isSubmitting, nextItemUrl, submitResult } = useResultSubmit()

const isItemLoaded = ref(false)
const isScored = ref(false)
const score = ref(null)
const currentItemId = ref(null)

onMounted(() => {
  loadItem()
})

const handlePlayerReady = (player) => {
  qti3Player = player
  if (itemXml.value) {
    loadItemToPlayer()
  }
}

const loadItemToPlayer = () => {
  if (!qti3Player || !itemXml.value) return

  // XMLからidentifierを抽出
  const parser = new DOMParser()
  const doc = parser.parseFromString(itemXml.value, 'text/xml')
  currentItemId.value = doc.documentElement.getAttribute('identifier')

  qti3Player.loadItemFromXml(itemXml.value, {
    guid: `item-${Date.now()}`,
    pnp: {
      textAppearance: { colorStyle: 'qti3-player-color-default' }
    }
  })
}

const handleItemReady = () => {
  isItemLoaded.value = true
  isScored.value = false
}

const handleEndAttempt = async (data) => {
  const attemptState = data.state || data
  if (attemptState.outcomeVariables) {
    const scoreOutcome = attemptState.outcomeVariables.find(
      v => v.identifier === 'SCORE'
    )
    if (scoreOutcome) {
      score.value = scoreOutcome.value
      isScored.value = true

      // 結果をサーバーに送信
      await submitResult(currentItemId.value, {
        score: scoreOutcome.value,
        responses: attemptState.responseVariables,
        outcomeVariables: attemptState.outcomeVariables
      })
    }
  }
}

const submitResponse = () => {
  if (qti3Player) {
    qti3Player.endAttempt()
  }
}

const goToNextItem = () => {
  if (nextItemUrl.value) {
    // URLパラメータを更新して再読み込み
    const url = new URL(window.location.href)
    url.searchParams.set('item', nextItemUrl.value)
    window.location.href = url.toString()
  }
}
</script>
```

---

## 6. Vercelデプロイ設定

### 6.1 プロジェクト構成

| Vercelプロジェクト | ディレクトリ | ドメイン |
|-------------------|-------------|---------|
| nexcbt-web | packages/web | app.example.com |
| nexcbt-player | packages/qti-player | player.example.com |

### 6.2 CORS設定 (packages/web/next.config.js)

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.PLAYER_URL || 'https://player.example.com'
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'POST, OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization'
          }
        ]
      }
    ]
  }
}

module.exports = nextConfig
```

### 6.3 環境変数

```bash
# packages/web/.env
NEXT_PUBLIC_APP_URL=https://app.example.com
NEXT_PUBLIC_PLAYER_URL=https://player.example.com
PLAYER_URL=https://player.example.com
API_URL=https://api.example.com

# packages/qti-player/.env
VITE_APP_URL=https://app.example.com
```

---

## 7. 開発フェーズ

### Phase 1: 基盤構築

- [ ] モノレポ環境セットアップ
- [ ] packages/qti-player の移行（現在のqti3-demoから）
- [ ] packages/web の初期構築
- [ ] URLパラメータ駆動の実装
- [ ] ローカル開発環境の整備（CORS設定含む）

### Phase 2: コア機能

- [ ] useItemLoader コンポーザブル（Vue 3）
- [ ] useResultSubmit コンポーザブル（Vue 3）
- [ ] QtiPlayerFrame コンポーネント（Next.js）
- [ ] /api/results API Route（Next.js）
- [ ] 問題読み込み・採点・結果送信フロー

### Phase 3: ETL構築

- [ ] QTI3 XML変換ロジック
- [ ] データベーススキーマ設計
- [ ] 問題インポート機能
- [ ] XMLファイル配信（S3/CDN）

### Phase 4: 統合・テスト

- [ ] E2Eテスト（Playwright）
- [ ] API単体テスト
- [ ] Vue Player単体テスト
- [ ] セキュリティレビュー
- [ ] Vercelデプロイ設定

### Phase 5: 本番運用準備

- [ ] 監視・ログ設定
- [ ] エラー追跡（Sentry等）
- [ ] CDNキャッシュ設定
- [ ] ドキュメント整備

---

## 8. 技術スタック詳細

### 8.1 packages/web (Next.js)

| カテゴリ | 技術 |
|---------|------|
| フレームワーク | Next.js 14+ (App Router) |
| 言語 | TypeScript |
| UI | Material UI (MUI) v5+ |
| 状態管理 | Zustand or Jotai |
| データ取得 | TanStack Query |
| 認証 | NextAuth.js |

### 8.2 packages/qti-player (Vue 3)

| カテゴリ | 技術 |
|---------|------|
| フレームワーク | Vue 3 (Composition API) |
| ビルドツール | Vite |
| QTIプレイヤー | qti3-item-player-vue3 |
| 言語 | JavaScript (TypeScript移行可) |

### 8.3 packages/etl (Python)

| カテゴリ | 技術 |
|---------|------|
| 言語 | Python 3.11+ |
| XML処理 | lxml |
| DB接続 | SQLAlchemy / psycopg2 |
| バリデーション | Pydantic |

---

## 9. リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| CORS設定の複雑さ | 中 | 開発初期に十分なテスト、Vercel設定の文書化 |
| 結果通知のリアルタイム性 | 中 | SSE実装、または軽量ポーリング |
| 2プロジェクトのデプロイ同期 | 中 | Turborepoによる統一ビルド、CI/CDパイプライン |
| XMLキャッシュの整合性 | 低 | バージョン管理、キャッシュバスティング |
| qti3-item-player-vue3の更新 | 低 | 定期的なアップデート確認、変更履歴監視 |

---

## 10. Plan A vs Plan B 選択ガイド

### Plan A (Web Request方式) を選ぶ場合

- Vue Playerを他システムでも再利用したい
- API設計を明確にしたい
- 単体テストを重視する
- 将来的なLMS統合を視野に入れている

### Plan B (postMessage方式) を選ぶ場合

- リアルタイム性を最優先する
- 実装をシンプルにしたい
- 両アプリ間の通信頻度が高い
- iframe内外の状態同期が必要

---

## 11. 参考資料

- [qti3-item-player-vue3 (GitHub)](https://github.com/amp-up-io/qti3-item-player-vue3)
- [QTI 3.0 仕様書 (1EdTech)](https://www.imsglobal.org/spec/qti/v3p0/)
- [Amp-up.io](https://www.amp-up.io/)
- [Vercel Monorepo Guide](https://vercel.com/docs/monorepos)
- [Next.js CORS設定](https://nextjs.org/docs/app/api-reference/next-config-js/headers)

---

## 変更履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|---------|
| 2024-12-29 | 1.0 | 初版作成（postMessage方式） |
| 2024-12-30 | 2.0 | Plan A (Web Request方式) として分離 |
