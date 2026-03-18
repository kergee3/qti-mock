# ANTHROPIC_API_KEY 設定ガイド

本プロジェクトでは、ANTHROPIC_API_KEY を **3か所** に設定する必要があります。
APIキーのローテーション時には、すべての設定箇所を更新してください。

## 設定箇所一覧

| # | 設定ファイル / 設定場所 | 用途 | 環境 |
|---|----------------------|------|------|
| 1 | `qti-generator/.env` | AI問題生成（4択・記述式） | ローカル |
| 2 | `packages/web/.env.local` | 記述式問題のAI採点 | ローカル |
| 3 | Vercel Environment Variables | 記述式問題のAI採点 | 本番 |

## 各設定の詳細

### 1. `qti-generator/.env`（ローカル / 問題生成）

QTI問題をClaude APIで自動生成するためのキー。`ai-choice`（4択問題）と `ai-text`（記述式問題）の両方がこのファイルを共有します。

```
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx
```

**使用するコード:**
- `qti-generator/ai-choice/config/settings.py`
- `qti-generator/ai-text/config/settings.py`

### 2. `packages/web/.env.local`（ローカル / AI採点）

ローカル開発環境（`localhost:3000`）で記述式問題のAI採点機能を使用するためのキー。

```
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx
```

**使用するコード:**
- `packages/web/src/app/api/ai-text/route.ts`（`POST /api/ai-text`）

### 3. Vercel Environment Variables（本番 / AI採点）

本番環境（`qti-mock.shumi.dev`）で記述式問題のAI採点機能を使用するためのキー。

**設定場所:** Vercel Dashboard > Project Settings > Environment Variables

**使用するコード:** ローカルと同じ `route.ts` が本番でも動作

## APIキーのローテーション手順

1. [Anthropic Console](https://console.anthropic.com/) で新しいAPIキーを発行
2. 上記3か所すべてのキーを新しい値に更新
3. ローカルで動作確認: `npm run dev` → 記述式問題でAI採点をテスト
4. Vercelに反映: Vercel Dashboardで環境変数を更新後、再デプロイ
