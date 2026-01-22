import Anthropic from '@anthropic-ai/sdk'
import type { AiScoringRequest, AiScoringResponse, AiModelType } from '@/types/ai-text'

// Vercel サーバーレス関数の最大実行時間（秒）
// Hobby: 10秒, Pro: 60秒, Enterprise: 900秒
// ストリーミング AI 採点には最低 60秒必要
export const maxDuration = 60

// Claude APIクライアント
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

// モデル設定のマッピング
const MODEL_MAP: Record<AiModelType, string> = {
  'claude-sonnet-4.5': 'claude-sonnet-4-5-20250929',
  'claude-haiku-4.5': 'claude-haiku-4-5-20251001',
  'claude-sonnet-4': 'claude-sonnet-4-20250514',
  'claude-haiku-3.5': 'claude-3-5-haiku-20241022',
}

// 価格設定（USD per MTok = 100万トークン）
// 参照: https://platform.claude.com/docs/ja/about-claude/models/overview
const PRICING: Record<AiModelType, { inputPerMTok: number; outputPerMTok: number }> = {
  'claude-sonnet-4.5': { inputPerMTok: 3, outputPerMTok: 15 },
  'claude-haiku-4.5': { inputPerMTok: 1, outputPerMTok: 5 },
  'claude-sonnet-4': { inputPerMTok: 3, outputPerMTok: 15 },
  'claude-haiku-3.5': { inputPerMTok: 1, outputPerMTok: 5 },
}

/**
 * トークン数からコストを計算（USD）
 */
function calculateCost(model: AiModelType, inputTokens: number, outputTokens: number): { inputCost: number; outputCost: number; totalCost: number } {
  const pricing = PRICING[model]
  // MTok = 1,000,000 トークン
  const inputCost = (inputTokens / 1_000_000) * pricing.inputPerMTok
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPerMTok
  const totalCost = inputCost + outputCost
  return { inputCost, outputCost, totalCost }
}

/**
 * AI採点APIエンドポイント（ストリーミング対応）
 * POST /api/ai-text
 */
export async function POST(request: Request) {
  try {
    const body: AiScoringRequest = await request.json()
    const { response, scoringCriteria, questionText, model } = body

    // API キーのチェック
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY is not set')
      return new Response(
        JSON.stringify({ error: 'AI採点サービスが設定されていません（API key missing）' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 入力バリデーション
    if (!response || !scoringCriteria || !questionText) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 最小文字数チェック
    const minChars = scoringCriteria.min_chars || 60
    if (response.length < minChars) {
      return new Response(
        JSON.stringify({ error: `回答が${minChars}文字未満です` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // モデル選択（デフォルトはSonnet 4）
    const selectedModel: AiModelType = model || 'claude-sonnet-4'
    const modelId = MODEL_MAP[selectedModel]

    // プロンプト構築
    const systemPrompt = buildSystemPrompt()
    const userPrompt = buildUserPrompt(questionText, response, scoringCriteria)

    // 時間計測開始
    const startTime = Date.now()

    // ストリーミングでClaude APIを呼び出し
    const stream = await anthropic.messages.stream({
      model: modelId,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt }
      ],
    })

    // ストリーミングレスポンスを返す
    const encoder = new TextEncoder()
    let fullText = ''
    let inputTokens = 0
    let outputTokens = 0

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === 'content_block_delta') {
              const delta = event.delta
              if ('text' in delta) {
                fullText += delta.text
                // テキストチャンクをストリーミング
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', content: delta.text })}\n\n`))
              }
            } else if (event.type === 'message_delta') {
              // 使用量情報を取得
              if (event.usage) {
                outputTokens = event.usage.output_tokens
              }
            } else if (event.type === 'message_start') {
              if (event.message.usage) {
                inputTokens = event.message.usage.input_tokens
              }
            }
          }

          // 時間計測終了
          const scoringTimeMs = Date.now() - startTime

          // コスト計算
          const { inputCost, outputCost, totalCost } = calculateCost(selectedModel, inputTokens, outputTokens)

          // 完了後にJSONをパースして最終結果を送信
          const scoringResult = parseClaudeResponse(fullText)
          const resultWithMeta: AiScoringResponse = {
            ...scoringResult,
            scoringTimeMs,
            inputTokens,
            outputTokens,
            modelUsed: selectedModel,
            inputCost,
            outputCost,
            totalCost,
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'result', content: resultWithMeta })}\n\n`))
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (error) {
          console.error('Streaming error:', error)
          // エラー詳細をクライアントに送信（デバッグ用）
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          const errorName = error instanceof Error ? error.name : 'Error'
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            content: `ストリーミング中にエラーが発生しました: ${errorName}`,
            detail: errorMessage
          })}\n\n`))
          controller.close()
        }
      },
    })

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('AI Scoring error:', error)
    return new Response(
      JSON.stringify({ error: 'AI採点中にエラーが発生しました' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

/**
 * システムプロンプトを構築
 */
function buildSystemPrompt(): string {
  return `あなたは小学生の記述式問題を採点する教育専門家です。
回答を以下の3つの観点で採点し、具体的なフィードバックを提供してください。

## 採点観点
1. **理解力（0-4点）**: 問題で問われている概念や内容を正しく理解しているか
2. **表現力（0-3点）**: 論理的かつ明確に自分の考えを表現できているか
3. **正確性（0-3点）**: 用語や事実関係が正確に使われているか

## 評価基準
- 理解力: 4=完全に理解, 3=概ね理解, 2=部分的理解, 1=理解不十分, 0=理解していない
- 表現力: 3=論理的で明確, 2=概ね論理的, 1=やや不明確, 0=表現が不適切
- 正確性: 3=正確で適切, 2=概ね正確, 1=一部不正確, 0=不正確

## 出力形式
必ず以下のJSON形式で出力してください。余計な説明は不要です。

\`\`\`json
{
  "score": 7,
  "maxScore": 10,
  "breakdown": {
    "understanding": {
      "score": 3,
      "maxScore": 4,
      "feedback": "理解力に関するフィードバック"
    },
    "expression": {
      "score": 2,
      "maxScore": 3,
      "feedback": "表現力に関するフィードバック"
    },
    "accuracy": {
      "score": 2,
      "maxScore": 3,
      "feedback": "正確性に関するフィードバック"
    }
  },
  "overallFeedback": "全体的なフィードバック（励ましを含む）",
  "matchedErrors": ["該当した誤答パターン（あれば）"],
  "suggestions": ["改善のための具体的なアドバイス"]
}
\`\`\`

## 重要な注意点
- 小学生向けにわかりやすい言葉でフィードバックを書いてください
- 良い点を認めつつ、改善点を具体的に示してください
- 厳しすぎず、優しすぎない公平な採点を心がけてください`
}

/**
 * ユーザープロンプトを構築
 */
function buildUserPrompt(
  questionText: string,
  response: string,
  scoringCriteria: AiScoringRequest['scoringCriteria']
): string {
  const { model_answer, required_concepts, common_errors } = scoringCriteria

  // 採点基準の整形
  let criteriaText = ''
  if (required_concepts && required_concepts.length > 0) {
    criteriaText += `\n### 必須概念\n${required_concepts.map(c => `- ${c}`).join('\n')}`
  }
  if (common_errors && common_errors.length > 0) {
    criteriaText += `\n### 典型的誤答パターン\n${common_errors.map(e => `- ${e.pattern}: ${e.feedback}`).join('\n')}`
  }

  return `以下の記述式問題と回答を採点してください。

## 問題文
${questionText}

## 模範解答
${model_answer}
${criteriaText}

## 回答者の回答
${response}

上記の回答を採点基準に従って採点し、JSON形式で結果を出力してください。`
}

/**
 * Claude応答をパース
 */
function parseClaudeResponse(text: string): AiScoringResponse {
  // JSONブロックを抽出
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/)
  const jsonStr = jsonMatch ? jsonMatch[1] : text.trim()

  try {
    const parsed = JSON.parse(jsonStr)

    return {
      score: parsed.score ?? 0,
      maxScore: parsed.maxScore ?? 10,
      breakdown: {
        understanding: {
          score: parsed.breakdown?.understanding?.score ?? 0,
          maxScore: parsed.breakdown?.understanding?.maxScore ?? 4,
          feedback: parsed.breakdown?.understanding?.feedback ?? '',
        },
        expression: {
          score: parsed.breakdown?.expression?.score ?? 0,
          maxScore: parsed.breakdown?.expression?.maxScore ?? 3,
          feedback: parsed.breakdown?.expression?.feedback ?? '',
        },
        accuracy: {
          score: parsed.breakdown?.accuracy?.score ?? 0,
          maxScore: parsed.breakdown?.accuracy?.maxScore ?? 3,
          feedback: parsed.breakdown?.accuracy?.feedback ?? '',
        },
      },
      overallFeedback: parsed.overallFeedback ?? '',
      matchedErrors: parsed.matchedErrors ?? [],
      suggestions: parsed.suggestions ?? [],
    }
  } catch (error) {
    console.error('Failed to parse Claude response:', error)
    console.error('Raw text:', text)

    // パースに失敗した場合はデフォルト値を返す
    return {
      score: 0,
      maxScore: 10,
      breakdown: {
        understanding: { score: 0, maxScore: 4, feedback: '採点結果のパースに失敗しました' },
        expression: { score: 0, maxScore: 3, feedback: '' },
        accuracy: { score: 0, maxScore: 3, feedback: '' },
      },
      overallFeedback: '採点処理中にエラーが発生しました。',
      matchedErrors: [],
      suggestions: [],
    }
  }
}
