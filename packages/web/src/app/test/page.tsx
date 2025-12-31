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

type FontOption = 'system' | 'noto-sans-jp' | 'noto-serif-jp' | 'biz-udpgothic' | 'biz-udpmincho' | 'source-han-sans' | 'kosugi-maru'

export default function TestPage() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [items, setItems] = useState<ItemInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedFont, setSelectedFont] = useState<FontOption>('system')

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
      <div style={{ width: '100%', padding: '10px' }}>
        <h1 style={{ marginBottom: '20px' }}>QTI3 Player テスト</h1>
        <p>読み込み中...</p>
      </div>
    )
  }

  // エラー時
  if (error || items.length === 0) {
    return (
      <div style={{ width: '100%', padding: '10px' }}>
        <h1 style={{ marginBottom: '20px' }}>QTI3 Player テスト</h1>
        <p style={{ color: '#c62828' }}>{error || 'テスト問題が見つかりませんでした'}</p>
      </div>
    )
  }

  const itemUrl = `${appUrl}/items/${items[0].fileName}`
  const itemCount = items.length

  return (
    <div style={{ width: '100%', padding: '10px', paddingBottom: '50px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '10px',
        padding: '10px 15px',
        backgroundColor: '#e3f2fd',
        borderRadius: '4px'
      }}>
        <span style={{ fontWeight: 'bold' }}>
          QTI3 Player テスト（{itemCount}問）
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontWeight: 'bold', fontSize: '14px' }}>フォント：</label>
          <select
            value={selectedFont}
            onChange={(e) => setSelectedFont(e.target.value as FontOption)}
            style={{
              padding: '5px 10px',
              fontSize: '14px',
              borderRadius: '4px',
              border: '1px solid #ccc'
            }}
          >
            <option value="system">システム既定</option>
            <option value="noto-sans-jp">Noto Sans JP</option>
            <option value="noto-serif-jp">Noto Serif JP</option>
            <option value="biz-udpgothic">BIZ UDPGothic</option>
            <option value="biz-udpmincho">BIZ UDPMincho</option>
            <option value="source-han-sans">源ノ角ゴシック</option>
            <option value="kosugi-maru">Kosugi Maru</option>
          </select>
        </div>
      </div>

      <QtiPlayerFrame
        itemUrl={itemUrl}
        sessionId={sessionId}
        fontFamily={selectedFont}
      />

      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '10px',
        backgroundColor: '#f5f5f5',
        borderTop: '1px solid #ccc',
        zIndex: 100
      }}>
        <p style={{ margin: 0, fontSize: '14px', color: '#666', textAlign: 'center' }}>
          <strong>Session ID:</strong> {sessionId} ／ {itemCount}問完了後に全体の成績が表示されます
        </p>
      </div>
    </div>
  )
}
