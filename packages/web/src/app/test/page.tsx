'use client'

import { useState, useEffect } from 'react'
import { QtiPlayerFrame } from '@/components/QtiPlayerFrame'

interface ItemInfo {
  id: string
  fileName: string
  identifier: string
  title: string
  type: string
}

export default function TestPage() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [items, setItems] = useState<ItemInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  // アイテム一覧を取得
  useEffect(() => {
    const fetchItems = async () => {
      try {
        const response = await fetch('/api/items')
        const data = await response.json()
        if (data.success) {
          setItems(data.items)
        } else {
          setError('アイテムの取得に失敗しました')
        }
      } catch (e) {
        setError('アイテムの取得中にエラーが発生しました')
        console.error(e)
      } finally {
        setIsLoading(false)
      }
    }

    fetchItems()
    setSessionId(`session-${Date.now()}`)
  }, [])

  // ローディング中
  if (isLoading || !sessionId) {
    return (
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
        <h1 style={{ marginBottom: '20px' }}>QTI3 Player テスト</h1>
        <p>読み込み中...</p>
      </div>
    )
  }

  // エラー時
  if (error || items.length === 0) {
    return (
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
        <h1 style={{ marginBottom: '20px' }}>QTI3 Player テスト</h1>
        <p style={{ color: '#c62828' }}>{error || 'テスト問題が見つかりませんでした'}</p>
      </div>
    )
  }

  const itemUrl = `${appUrl}/items/${items[0].fileName}`
  const itemCount = items.length

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
      <h1 style={{ marginBottom: '20px' }}>QTI3 Player テスト（{itemCount}問）</h1>

      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e3f2fd', borderRadius: '4px' }}>
        <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>テスト内容：</p>
        <ol style={{ margin: 0, paddingLeft: '20px' }}>
          {items.map((item) => (
            <li key={item.id}>
              {item.title}（{item.type}）
            </li>
          ))}
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
        <p>※ {itemCount}問完了後に全体の成績が表示されます</p>
      </div>
    </div>
  )
}
