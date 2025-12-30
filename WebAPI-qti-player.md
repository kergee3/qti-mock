# QTI3 Player Web API ドキュメント

## 概要

QTI3 Player (`https://qti3-player.shumi.dev/`) は、QTI 3.0 規格に準拠したアセスメントアイテムを表示・採点するWebアプリケーションです。URLパラメータを通じて外部システムから制御可能で、iframe埋め込みによる利用を想定しています。

## 基本URL

```
https://qti3-player.shumi.dev/
```

## 利用方法

### iframe埋め込み

```html
<iframe
  src="https://qti3-player.shumi.dev/?item=...&callback=...&session=..."
  width="100%"
  height="600"
  frameborder="0"
></iframe>
```

---

## URLパラメータ（入力）

QTI3 Playerは以下のURLパラメータを受け取ります。

| パラメータ | 必須 | 説明 |
|-----------|------|------|
| `item` | ✅ | QTI 3.0 XMLファイルのURL |
| `callback` | ✅ | 採点結果を送信するAPIエンドポイント |
| `session` | ✅ | セッションID（結果の追跡に使用） |
| `token` | ❌ | 認証トークン（Authorizationヘッダーに付与） |

### パラメータ詳細

#### `item` (必須)
QTI 3.0 XMLファイルの完全なURL。CORSが有効である必要があります。

```
item=https://example.com/items/question-001.xml
```

#### `callback` (必須)
採点完了時に結果をPOSTするAPIエンドポイント。

```
callback=https://example.com/api/results
```

#### `session` (必須)
セッションを識別するユニークなID。複数問題のシーケンス管理に使用されます。

```
session=session-1234567890
```

#### `token` (オプション)
認証が必要な場合に指定。`Authorization: Bearer {token}` ヘッダーとして送信されます。

```
token=eyJhbGciOiJIUzI1NiIs...
```

### 完全なURL例

```
https://qti3-player.shumi.dev/?item=https://qti3-web.shumi.dev/items/choice-item-001.xml&callback=https://qti3-web.shumi.dev/api/results&session=session-1704067200000
```

---

## コールバックAPI仕様（出力）

採点完了時、Playerは指定された `callback` URLに対してHTTP POSTリクエストを送信します。

### リクエスト

#### Method
```
POST
```

#### Headers
```
Content-Type: application/json
Authorization: Bearer {token}  // tokenパラメータが指定された場合のみ
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
    "outcomeVariables": [...]
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
| `accumulatedResults` | array | セッション内の累積結果（複数問題対応） |

### 期待するレスポンス

コールバックAPIは以下の形式でレスポンスを返す必要があります。

#### 成功時（次の問題がある場合）
```json
{
  "success": true,
  "nextItem": "https://example.com/items/question-002.xml",
  "isComplete": false
}
```

#### 成功時（全問完了の場合）
```json
{
  "success": true,
  "nextItem": null,
  "isComplete": true,
  "summary": {
    "sessionId": "session-1704067200000",
    "results": [
      { "itemId": "choice-item-001", "score": 1, "maxScore": 1, "timestamp": "..." },
      { "itemId": "order-item-001", "score": 1, "maxScore": 1, "timestamp": "..." },
      { "itemId": "text-entry-item-001", "score": 0, "maxScore": 1, "timestamp": "..." }
    ],
    "totalScore": 2,
    "totalMaxScore": 3,
    "itemCount": 3
  }
}
```

#### レスポンスフィールド

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `success` | boolean | 処理成功フラグ |
| `nextItem` | string \| null | 次の問題XMLのURL（なければnull） |
| `isComplete` | boolean | 全問完了フラグ |
| `summary` | object | 完了時のみ: 全体のサマリー |
| `summary.sessionId` | string | セッションID |
| `summary.results` | array | 問題別の結果リスト |
| `summary.totalScore` | number | 合計スコア |
| `summary.totalMaxScore` | number | 合計最大スコア |
| `summary.itemCount` | number | 問題数 |

---

## フロー図

```
┌──────────────┐     URLパラメータ      ┌──────────────────┐
│  ホストアプリ  │ ───────────────────> │   QTI3 Player    │
│  (iframe親)   │                       │                  │
└──────────────┘                       └────────┬─────────┘
                                                │
                                                │ 1. item URLからXML取得
                                                ▼
                                       ┌──────────────────┐
                                       │   XMLホスト      │
                                       │ (CORS必要)       │
                                       └──────────────────┘
                                                │
                                                │ 2. XML返却
                                                ▼
                                       ┌──────────────────┐
                                       │   QTI3 Player    │
                                       │  問題表示・採点   │
                                       └────────┬─────────┘
                                                │
                                                │ 3. 結果をPOST
                                                ▼
┌──────────────┐     レスポンス        ┌──────────────────┐
│  ホストアプリ  │ <─────────────────── │  callback API    │
│              │                       │                  │
└──────────────┘                       └──────────────────┘
                                                │
                                                │ 4. nextItem/summary返却
                                                ▼
                                       ┌──────────────────┐
                                       │   QTI3 Player    │
                                       │ 次の問題 or 結果表示│
                                       └──────────────────┘
```

---

## セッション管理

QTI3 Playerはクライアントサイドで結果を累積管理します（sessionStorage使用）。これによりサーバーレス環境でも複数問題のシーケンスを正しく処理できます。

### 累積結果の仕組み

1. 各問題の採点時、結果を `sessionStorage` に保存
2. 次の問題へ遷移しても結果は保持される
3. 全問完了時、累積結果をサーバーに送信
4. 「もう一度」ボタンで累積結果をクリア

### sessionStorageキー

```
qti3_accumulated_results_{sessionId}
```

---

## サポートするQTIインタラクション

現在、以下のQTI 3.0インタラクションタイプをサポートしています。

| インタラクション | 説明 | 例 |
|-----------------|------|-----|
| `choiceInteraction` | 単一選択・複数選択 | 4択問題 |
| `orderInteraction` | 並べ替え | 順序問題 |
| `textEntryInteraction` | テキスト入力 | 記述問題 |

---

## CORS要件

### XMLファイルホスト

QTI XMLファイルをホストするサーバーは、以下のCORSヘッダーを返す必要があります。

```
Access-Control-Allow-Origin: https://qti3-player.shumi.dev
```

### コールバックAPI

コールバックAPIは、以下のCORS設定が必要です。

```
Access-Control-Allow-Origin: https://qti3-player.shumi.dev
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

---

## 実装例

### コールバックAPI（Node.js / Express）

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

### iframe埋め込み（React）

```jsx
function QtiPlayerEmbed({ itemUrl, sessionId }) {
  const callbackUrl = `${window.location.origin}/api/results`;
  const playerUrl = new URL('https://qti3-player.shumi.dev/');

  playerUrl.searchParams.set('item', itemUrl);
  playerUrl.searchParams.set('callback', callbackUrl);
  playerUrl.searchParams.set('session', sessionId);

  return (
    <iframe
      src={playerUrl.toString()}
      width="100%"
      height="600"
      style={{ border: 'none' }}
    />
  );
}
```

---

## エラーハンドリング

### Player側のエラー表示

パラメータが不足している場合、Playerはエラーメッセージを表示します。

```
使用方法: ?item=XMLのURL&callback=結果送信先URL&session=セッションID
```

### コールバック失敗時

コールバックAPIへの送信が失敗した場合、Playerは以下を表示します。

```
結果送信エラー: {エラーメッセージ}
```

---

## 制限事項

- QTI XMLはCORS対応のサーバーからのみ取得可能
- sessionStorageを使用するため、同一オリジンポリシーに従う
- 現在はQTI 3.0の一部インタラクションのみサポート

---

## 関連リンク

- [QTI 3.0 Specification](https://www.imsglobal.org/spec/qti/v3p0/impl)
- [qti3-item-player-vue3](https://github.com/amp-up-io/qti3-item-player-vue3)
- [デモサイト](https://qti3-web.shumi.dev/test)
