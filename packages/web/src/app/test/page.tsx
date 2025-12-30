'use client'

import { useState, useEffect } from 'react'
import { QtiPlayerFrame } from '@/components/QtiPlayerFrame'

export default function TestPage() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const itemUrl = `${appUrl}/items/choice-item-001.xml`

  // クライアント側でのみセッションIDを生成（ハイドレーションエラー回避）
  useEffect(() => {
    setSessionId(`session-${Date.now()}`)
  }, [])

  // セッションID生成前はローディング表示
  if (!sessionId) {
    return (
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
        <h1 style={{ marginBottom: '20px' }}>QTI3 Player テスト</h1>
        <p>読み込み中...</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
      <h1 style={{ marginBottom: '20px' }}>QTI3 Player テスト（6問）</h1>

      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e3f2fd', borderRadius: '4px' }}>
        <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>テスト内容：</p>
        <ol style={{ margin: 0, paddingLeft: '20px' }}>
          <li>選択問題（choiceInteraction）- 日本の首都</li>
          <li>並べ替え問題（orderInteraction）- 都道府県の順序</li>
          <li>テキスト入力問題（textEntryInteraction）- 日本一高い山</li>
          <li>マッチング問題（matchInteraction）- 国と首都の組み合わせ</li>
          <li>インライン選択問題（inlineChoiceInteraction）- 文中の空欄補充</li>
          <li>ホットスポット問題（hotspotInteraction）- 日本地図上で東京を選択</li>
        </ol>
      </div>

      <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
        <p><strong>Session ID:</strong> {sessionId}</p>
      </div>

      <QtiPlayerFrame
        itemUrl={itemUrl}
        sessionId={sessionId}
      />

      <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
        <p>※ 6問完了後に全体の成績が表示されます</p>
      </div>
    </div>
  )
}
