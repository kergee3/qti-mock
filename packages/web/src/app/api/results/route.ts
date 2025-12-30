import { NextResponse } from 'next/server'

interface AccumulatedResult {
  itemId: string
  score: number
  maxScore: number
  timestamp: string
}

interface ResultPayload {
  sessionId: string
  itemId: string
  timestamp: string
  result: {
    score: number
    maxScore: number
    responses: unknown
    outcomeVariables: unknown
  }
  // クライアント側で管理された累積結果（サーバーレス対応）
  accumulatedResults?: AccumulatedResult[]
}

// 問題の順序定義（本番ではDBから取得）
const ITEM_SEQUENCE = [
  'choice-item-001',
  'order-item-001',
  'text-entry-item-001'
]

export async function POST(req: Request) {
  // Origin検証
  const origin = req.headers.get('origin')
  const allowedOrigins = [
    process.env.PLAYER_URL || 'http://localhost:5173',
    'http://localhost:5174' // fallback port
  ]

  if (origin && !allowedOrigins.includes(origin)) {
    console.warn(`Rejected request from origin: ${origin}`)
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    )
  }

  try {
    const body: ResultPayload = await req.json()
    const { sessionId, itemId, timestamp, result, accumulatedResults } = body

    // 結果をログ出力
    console.log('=== Result Received ===')
    console.log('Session:', sessionId)
    console.log('Item:', itemId)
    console.log('Timestamp:', timestamp)
    console.log('Score:', result.score, '/', result.maxScore)
    console.log('Accumulated Results:', accumulatedResults?.length || 0)
    console.log('=======================')

    // クライアントから送られた累積結果を使用
    const results = accumulatedResults || []

    // 次の問題を決定
    const currentIndex = ITEM_SEQUENCE.indexOf(itemId)
    const nextIndex = currentIndex + 1
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    let nextItem = null
    let isComplete = false

    if (nextIndex < ITEM_SEQUENCE.length) {
      // 次の問題がある
      nextItem = `${appUrl}/items/${ITEM_SEQUENCE[nextIndex]}.xml`
    } else {
      // 全問完了
      isComplete = true
      console.log('=== Session Complete ===')
      console.log('Session:', sessionId)
      console.log('Total Items:', results.length)
      const totalScore = results.reduce((sum, r) => sum + r.score, 0)
      const totalMaxScore = results.reduce((sum, r) => sum + r.maxScore, 0)
      console.log('Total Score:', totalScore, '/', totalMaxScore)
      console.log('========================')
    }

    return NextResponse.json({
      success: true,
      nextItem,
      isComplete,
      // 完了時は全結果を返す
      ...(isComplete && {
        summary: {
          sessionId,
          results: results,
          totalScore: results.reduce((sum, r) => sum + r.score, 0),
          totalMaxScore: results.reduce((sum, r) => sum + r.maxScore, 0),
          itemCount: results.length
        }
      })
    })
  } catch (error) {
    console.error('Error processing result:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

// OPTIONSリクエストに対応（CORS preflight）
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': process.env.PLAYER_URL || 'http://localhost:5173',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  })
}
