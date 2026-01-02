import { NextResponse } from 'next/server'

interface ResultPayload {
  sessionId: string
  itemId: string
  timestamp: string
  result: {
    score: number
    maxScore: number
    responses: unknown
    outcomeVariables: unknown
    isExternalScored?: boolean
  }
}

export async function POST(req: Request) {
  // Origin検証
  const origin = req.headers.get('origin')
  const playerUrl = process.env.PLAYER_URL || 'http://localhost:5173'
  const allowedOrigins = [
    playerUrl,
    'http://localhost:5173',
    'http://localhost:5174'
  ]

  // CORSヘッダーを設定
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin && allowedOrigins.includes(origin) ? origin : playerUrl,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  }

  if (origin && !allowedOrigins.includes(origin)) {
    console.warn(`Rejected request from origin: ${origin}`)
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403, headers: corsHeaders }
    )
  }

  try {
    const body: ResultPayload = await req.json()
    const { sessionId, itemId, timestamp, result } = body

    // 結果をログ出力（シンプル版：ログ記録のみ）
    console.log('=== Result Received ===')
    console.log('Session:', sessionId)
    console.log('Item:', itemId)
    console.log('Timestamp:', timestamp)
    console.log('Score:', result.score, '/', result.maxScore)
    console.log('External Scored:', result.isExternalScored ?? false)
    console.log('=======================')

    // 成功レスポンスのみ返す（web側で状態管理するため、nextItem等は不要）
    return NextResponse.json({
      success: true
    }, { headers: corsHeaders })
  } catch (error) {
    console.error('Error processing result:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500, headers: corsHeaders }
    )
  }
}

// OPTIONSリクエストに対応（CORS preflight）
export async function OPTIONS(req: Request) {
  const origin = req.headers.get('origin')
  const playerUrl = process.env.PLAYER_URL || 'http://localhost:5173'
  const allowedOrigins = [
    playerUrl,
    'http://localhost:5173',
    'http://localhost:5174'
  ]

  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin && allowedOrigins.includes(origin) ? origin : playerUrl,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  })
}
