# QTI Player 技術ガイド

このドキュメントは、qti-player を外部アプリケーションから利用するための技術ガイドです。

## 概要

qti-player は QTI 3.0 規格に準拠したアセスメントアイテムを表示・採点する独立したサービスです。iframe を通じて任意のWebアプリケーションに埋め込み、postMessage API で通信することで、QTI問題の表示・採点機能を利用できます。

## アーキテクチャ

```
┌─────────────────────────────────────┐     ┌─────────────────────────────────┐
│  外部アプリ                         │     │  qti-player (Vue)               │
│  (React, Angular, Next.js, etc.)   │     │  https://qti3-player.shumi.dev  │
│                                     │     │                                 │
│  ┌─────────────────────────────┐   │     │  ┌─────────────────────────┐   │
│  │ <iframe src="qti-player">   │───┼────▶│  │ QTI XML を読み込み      │   │
│  │                             │   │     │  │ 問題を表示              │   │
│  │                             │◀──┼─────│  │ 採点処理                │   │
│  └─────────────────────────────┘   │     │  └─────────────────────────┘   │
│              ▲                      │     │              │                 │
│              │ postMessage          │     │              │ postMessage     │
│              │ (結果受信)           │     │              ▼ (結果送信)      │
│  ┌─────────────────────────────┐   │     └─────────────────────────────────┘
│  │ 結果処理ロジック            │   │
│  │ - スコア集計                │   │
│  │ - 進捗管理                  │   │
│  │ - データ保存                │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

## サービスURL

| 環境 | URL |
|------|-----|
| 本番 | https://qti3-player.shumi.dev |
| 開発 | http://localhost:5173 |

## 基本的な使い方

### 1. iframe の埋め込み

```html
<iframe
  src="https://qti3-player.shumi.dev?item=<ITEM_URL>&session=<SESSION_ID>"
  style="width: 100%; height: 600px; border: none;"
></iframe>
```

### 2. URLパラメータ

| パラメータ | 必須 | 説明 |
|-----------|------|------|
| `item` | ○ | QTI XMLファイルのURL（URLエンコード必須） |
| `session` | ○ | セッションID（結果の追跡に使用） |
| `callback` | - | 結果送信先のAPI URL（オプション） |
| `font` | - | フォント設定（後述） |

### 3. URLの構築例

```javascript
const playerUrl = 'https://qti3-player.shumi.dev'
const itemUrl = 'https://your-app.com/items/question1.xml'
const sessionId = 'session-12345'

const iframeSrc = `${playerUrl}?item=${encodeURIComponent(itemUrl)}&session=${sessionId}`
```

## postMessage API

### 受信メッセージ（qti-player → 外部アプリ）

#### ITEM_LOADED（問題読み込み完了）

問題の読み込みが完了したときに送信されます。

```typescript
interface ItemLoadedMessage {
  type: 'ITEM_LOADED'
  itemId: string  // 問題のidentifier
}
```

#### ITEM_ANSWERED（回答完了）

ユーザーが回答を送信したときに送信されます。

```typescript
interface ItemAnsweredMessage {
  type: 'ITEM_ANSWERED'
  itemId: string           // 問題のidentifier
  score: number            // 獲得スコア
  maxScore: number         // 最大スコア
  isExternalScored: boolean // 外部採点が必要か（記述式など）
  response: string         // 回答内容（表示用テキスト）
  duration: number         // 所要時間（秒）
}
```

### 送信メッセージ（外部アプリ → qti-player）

#### CHANGE_ITEM（問題切り替え）

表示する問題を切り替えるときに送信します。

```typescript
interface ChangeItemMessage {
  type: 'CHANGE_ITEM'
  itemUrl: string  // 新しい問題のXML URL
}
```

## 実装例

### React での実装

```tsx
import { useEffect, useRef, useState } from 'react'

interface ItemResult {
  itemId: string
  score: number
  maxScore: number
  isExternalScored: boolean
  response: string
  duration: number
}

function QtiPlayerComponent() {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [results, setResults] = useState<ItemResult[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  const playerUrl = 'https://qti3-player.shumi.dev'
  const itemUrl = 'https://your-app.com/items/question1.xml'
  const sessionId = 'session-' + Date.now()

  // postMessage リスナー
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // オリジンの検証（セキュリティ）
      if (event.origin !== playerUrl) return
      if (!event.data || !event.data.type) return

      switch (event.data.type) {
        case 'ITEM_LOADED':
          console.log('問題読み込み完了:', event.data.itemId)
          setIsLoaded(true)
          break

        case 'ITEM_ANSWERED':
          console.log('回答完了:', event.data)
          setResults(prev => [...prev, {
            itemId: event.data.itemId,
            score: event.data.score,
            maxScore: event.data.maxScore,
            isExternalScored: event.data.isExternalScored,
            response: event.data.response,
            duration: event.data.duration,
          }])
          break
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  // 問題を切り替える
  const changeItem = (newItemUrl: string) => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: 'CHANGE_ITEM',
        itemUrl: newItemUrl,
      }, '*')
    }
  }

  return (
    <div>
      <iframe
        ref={iframeRef}
        src={`${playerUrl}?item=${encodeURIComponent(itemUrl)}&session=${sessionId}`}
        style={{ width: '100%', height: '600px', border: 'none' }}
        title="QTI Player"
      />
      {!isLoaded && <p>読み込み中...</p>}
    </div>
  )
}
```

### Vue での実装

```vue
<template>
  <div>
    <iframe
      ref="playerFrame"
      :src="iframeSrc"
      style="width: 100%; height: 600px; border: none;"
      title="QTI Player"
    />
    <p v-if="!isLoaded">読み込み中...</p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const playerUrl = 'https://qti3-player.shumi.dev'
const itemUrl = 'https://your-app.com/items/question1.xml'
const sessionId = 'session-' + Date.now()

const playerFrame = ref(null)
const isLoaded = ref(false)
const results = ref([])

const iframeSrc = computed(() => {
  return `${playerUrl}?item=${encodeURIComponent(itemUrl)}&session=${sessionId}`
})

const handleMessage = (event) => {
  if (event.origin !== playerUrl) return
  if (!event.data || !event.data.type) return

  switch (event.data.type) {
    case 'ITEM_LOADED':
      isLoaded.value = true
      break

    case 'ITEM_ANSWERED':
      results.value.push({
        itemId: event.data.itemId,
        score: event.data.score,
        maxScore: event.data.maxScore,
        isExternalScored: event.data.isExternalScored,
        response: event.data.response,
        duration: event.data.duration,
      })
      break
  }
}

const changeItem = (newItemUrl) => {
  if (playerFrame.value?.contentWindow) {
    playerFrame.value.contentWindow.postMessage({
      type: 'CHANGE_ITEM',
      itemUrl: newItemUrl,
    }, '*')
  }
}

onMounted(() => {
  window.addEventListener('message', handleMessage)
})

onUnmounted(() => {
  window.removeEventListener('message', handleMessage)
})
</script>
```

### 静的HTML での実装

```html
<!DOCTYPE html>
<html>
<head>
  <title>QTI Player Example</title>
</head>
<body>
  <div id="player-container">
    <iframe id="qti-player" style="width: 100%; height: 600px; border: none;"></iframe>
  </div>
  <div id="results"></div>

  <script>
    const playerUrl = 'https://qti3-player.shumi.dev';
    const itemUrl = 'https://your-app.com/items/question1.xml';
    const sessionId = 'session-' + Date.now();

    // iframe を設定
    const iframe = document.getElementById('qti-player');
    iframe.src = `${playerUrl}?item=${encodeURIComponent(itemUrl)}&session=${sessionId}`;

    // postMessage リスナー
    window.addEventListener('message', function(event) {
      if (event.origin !== playerUrl) return;
      if (!event.data || !event.data.type) return;

      if (event.data.type === 'ITEM_LOADED') {
        console.log('問題読み込み完了:', event.data.itemId);
      }

      if (event.data.type === 'ITEM_ANSWERED') {
        console.log('回答:', event.data.response);
        console.log('スコア:', event.data.score + '/' + event.data.maxScore);
        console.log('所要時間:', event.data.duration + '秒');

        // 結果を表示
        const resultsDiv = document.getElementById('results');
        resultsDiv.innerHTML += `
          <p>回答: ${event.data.response} - スコア: ${event.data.score}/${event.data.maxScore}</p>
        `;
      }
    });

    // 問題を切り替える関数
    function changeItem(newItemUrl) {
      iframe.contentWindow.postMessage({
        type: 'CHANGE_ITEM',
        itemUrl: newItemUrl
      }, '*');
    }
  </script>
</body>
</html>
```

## フォント設定

`font` パラメータで問題表示のフォントを指定できます。

| 値 | フォント |
|----|----------|
| `system` | システムデフォルト |
| `noto-sans-jp` | Noto Sans JP |
| `noto-serif-jp` | Noto Serif JP |
| `biz-udpgothic` | BIZ UDPゴシック |
| `biz-udpmincho` | BIZ UDP明朝 |
| `source-han-sans` | 源ノ角ゴシック |
| `kosugi-maru` | 小杉丸ゴシック |

```javascript
const iframeSrc = `${playerUrl}?item=${itemUrl}&session=${sessionId}&font=noto-sans-jp`
```

## サポートしているインタラクション

| インタラクション | 説明 | 自動採点 |
|-----------------|------|----------|
| choiceInteraction | 単一/複数選択 | ○ |
| inlineChoiceInteraction | インライン選択（ドロップダウン） | ○ |
| matchInteraction | マッチング | ○ |
| orderInteraction | 並べ替え | ○ |
| textEntryInteraction | テキスト入力（短答） | ○ |
| extendedTextInteraction | 長文テキスト入力 | × (外部採点) |
| graphicChoiceInteraction | 画像選択（ホットスポット） | ○ |

外部採点が必要な問題（extendedTextInteraction等）は、`isExternalScored: true` として結果が返されます。

## 回答データの形式

`response` フィールドに含まれる回答データの形式は、インタラクションタイプによって異なります。

| インタラクション | response 形式 | 例 |
|-----------------|---------------|-----|
| choiceInteraction | 選択肢のidentifier | `"A"` |
| inlineChoiceInteraction | 選択肢のidentifier | `"choice_a"` |
| matchInteraction | キーと値のペア | `"C1-M1, C2-M3"` |
| orderInteraction | 並び順 | `"item2, item1, item3"` |
| textEntryInteraction | 入力テキスト | `"東京"` |
| extendedTextInteraction | 入力テキスト | `"長文の回答..."` |

複数のインタラクションがある問題では、各回答が ` / ` で区切られます。

## Callback API（サーバーサイド連携）

postMessage に加えて、`callback` パラメータを指定することで、採点結果をサーバーに直接送信できます。

### URLパラメータ（追加）

| パラメータ | 必須 | 説明 |
|-----------|------|------|
| `callback` | - | 採点結果を送信するAPIエンドポイント |
| `token` | - | 認証トークン（Authorizationヘッダーに付与） |

### callback 指定時の動作

```
https://qti3-player.shumi.dev/?item=<ITEM_URL>&callback=<API_URL>&session=<SESSION_ID>&token=<TOKEN>
```

採点完了時、qti-player は指定された `callback` URL に対して HTTP POST リクエストを送信します。

### リクエスト仕様

#### Method
```
POST
```

#### Headers
```
Content-Type: application/json
Authorization: Bearer {token}  // token パラメータ指定時のみ
```

#### Body
```json
{
  "sessionId": "session-1704067200000",
  "itemId": "choice-item-001",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "result": {
    "score": 1,
    "maxScore": 1,
    "responses": [...],
    "outcomeVariables": [...],
    "isExternalScored": false
  },
  "accumulatedResults": [
    {
      "itemId": "choice-item-001",
      "score": 1,
      "maxScore": 1,
      "timestamp": "2024-01-01T12:00:00.000Z"
    }
  ]
}
```

#### フィールド説明

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `sessionId` | string | URLパラメータで指定されたセッションID |
| `itemId` | string | QTI XMLの `identifier` 属性から取得した問題ID |
| `timestamp` | string | 採点完了時刻（ISO 8601形式） |
| `result` | object | 採点結果の詳細 |
| `result.score` | number | 獲得スコア |
| `result.maxScore` | number | 最大スコア |
| `result.responses` | array | 回答データ（QTI responseVariables） |
| `result.outcomeVariables` | array | 結果変数（QTI outcomeVariables） |
| `result.isExternalScored` | boolean | 外部採点が必要か |
| `accumulatedResults` | array | セッション内の累積結果 |

### 期待するレスポンス

#### 次の問題がある場合
```json
{
  "success": true,
  "nextItem": "https://example.com/items/question-002.xml",
  "isComplete": false
}
```

#### 全問完了の場合
```json
{
  "success": true,
  "nextItem": null,
  "isComplete": true,
  "summary": {
    "sessionId": "session-1704067200000",
    "results": [
      { "itemId": "choice-item-001", "score": 1, "maxScore": 1, "timestamp": "..." },
      { "itemId": "order-item-001", "score": 1, "maxScore": 1, "timestamp": "..." }
    ],
    "totalScore": 2,
    "totalMaxScore": 2,
    "itemCount": 2
  }
}
```

### サーバーサイド実装例（Node.js / Express）

```javascript
app.post('/api/results', (req, res) => {
  const { sessionId, itemId, result, accumulatedResults } = req.body;

  // 結果を保存
  saveResult(sessionId, itemId, result);

  // 次の問題を決定
  const nextItem = getNextItem(itemId);
  const isComplete = !nextItem;

  const response = {
    success: true,
    nextItem,
    isComplete
  };

  if (isComplete) {
    response.summary = {
      sessionId,
      results: accumulatedResults,
      totalScore: accumulatedResults.reduce((sum, r) => sum + r.score, 0),
      totalMaxScore: accumulatedResults.reduce((sum, r) => sum + r.maxScore, 0),
      itemCount: accumulatedResults.length
    };
  }

  res.json(response);
});
```

### Callback API の CORS 設定

Callback API を提供するサーバーには、以下の CORS 設定が必要です。

```
Access-Control-Allow-Origin: https://qti3-player.shumi.dev
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

### セッション管理

qti-player はクライアントサイドで結果を累積管理します（sessionStorage 使用）。

- 各問題の採点時、結果を `sessionStorage` に保存
- 次の問題へ遷移しても結果は保持される
- 全問完了時、累積結果をサーバーに送信
- 「もう一度」ボタンで累積結果をクリア

sessionStorage キー: `qti3_accumulated_results_{sessionId}`

---

## CORS 設定

qti-player が QTI XML を読み込むため、XML を配信するサーバーで CORS を許可する必要があります。

### 必要なヘッダー

```
Access-Control-Allow-Origin: https://qti3-player.shumi.dev
Access-Control-Allow-Methods: GET
Access-Control-Allow-Headers: Content-Type
```

### Next.js での設定例

```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/items/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: 'https://qti3-player.shumi.dev',
          },
        ],
      },
    ]
  },
}
```

### Express での設定例

```javascript
const cors = require('cors')

app.use('/items', cors({
  origin: 'https://qti3-player.shumi.dev'
}))
```

## セキュリティ考慮事項

### 1. オリジンの検証

postMessage を受信する際は、必ずオリジンを検証してください。

```javascript
window.addEventListener('message', (event) => {
  // 本番環境
  if (event.origin !== 'https://qti3-player.shumi.dev') return

  // 開発環境も許可する場合
  // if (!['https://qti3-player.shumi.dev', 'http://localhost:5173'].includes(event.origin)) return

  // 処理...
})
```

### 2. セッションID の管理

セッションIDは推測困難な値を使用してください。

```javascript
// 推奨: UUID や暗号学的に安全なランダム値
const sessionId = crypto.randomUUID()

// または
const sessionId = 'session-' + crypto.getRandomValues(new Uint32Array(4)).join('-')
```

### 3. XML の配信

QTI XML ファイルは認証付きで配信することを推奨します。

## トラブルシューティング

### 問題が表示されない

1. **CORS エラー**: ブラウザのコンソールで CORS エラーを確認
2. **URL エンコード**: `item` パラメータが正しくURLエンコードされているか確認
3. **XML 形式**: QTI 3.0 規格に準拠しているか確認

### postMessage が受信できない

1. **オリジン検証**: 検証条件が正しいか確認
2. **イベントリスナー**: `useEffect` のクリーンアップが正しいか確認
3. **iframe の読み込み**: iframe が完全に読み込まれているか確認

### スコアが正しくない

1. **responseDeclaration**: XML の正解定義を確認
2. **responseProcessing**: 採点テンプレートが正しいか確認

## 参考リンク

- [QTI 3.0 Specification](https://www.imsglobal.org/spec/qti/v3p0/impl)
- [qti3-item-player-vue3](https://github.com/amp-up-io/qti3-item-player-vue3)
- [postMessage API (MDN)](https://developer.mozilla.org/ja/docs/Web/API/Window/postMessage)
