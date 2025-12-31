'use client'

import { useState, useEffect, useCallback } from 'react'
import { Box } from '@mui/material'
import { QtiPlayerFrame } from '@/components/QtiPlayerFrame'
import { QuestionSidebar, QuestionStatus } from '@/components/test/QuestionSidebar'

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

  // 問題の状態管理
  const [currentItemIndex, setCurrentItemIndex] = useState(0)
  const [questionStatuses, setQuestionStatuses] = useState<QuestionStatus[]>([])

  // iframe に渡す初期URL（最初の問題のURL、以降は postMessage で変更）
  const [initialItemUrl, setInitialItemUrl] = useState<string | null>(null)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  // Vue Player からのメッセージを受信
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Vue Player からのメッセージのみ処理
      if (!event.data || !event.data.type) return

      if (event.data.type === 'ITEM_LOADED') {
        // 問題読み込み完了
        const itemId = event.data.itemId
        const index = items.findIndex(item =>
          item.fileName.replace('.xml', '') === itemId ||
          item.identifier === itemId
        )
        if (index !== -1) {
          setCurrentItemIndex(index)
          // 現在の問題を「回答中」に更新（まだ回答していなければ）
          setQuestionStatuses(prev => {
            const newStatuses = [...prev]
            if (newStatuses[index] === 'not-started') {
              newStatuses[index] = 'in-progress'
            }
            return newStatuses
          })
        }
      }

      if (event.data.type === 'ITEM_ANSWERED') {
        // 回答完了
        const itemId = event.data.itemId
        const score = event.data.score
        const isExternalScored = event.data.isExternalScored
        const index = items.findIndex(item =>
          item.fileName.replace('.xml', '') === itemId ||
          item.identifier === itemId
        )
        if (index !== -1) {
          setQuestionStatuses(prev => {
            const newStatuses = [...prev]
            if (isExternalScored) {
              newStatuses[index] = 'answered-external'
            } else {
              newStatuses[index] = score > 0 ? 'answered-correct' : 'answered-incorrect'
            }
            return newStatuses
          })
        }
      }

      if (event.data.type === 'TEST_COMPLETED') {
        // テスト完了 - 現在の問題のハイライトを解除
        setCurrentItemIndex(-1)
      }

      if (event.data.type === 'RESTART_TEST') {
        // テスト再開 - 状態をリセットして問1に移動
        setQuestionStatuses(new Array(items.length).fill('not-started'))
        setCurrentItemIndex(0)

        // iframe に問1への移動を指示
        const firstItemUrl = `${appUrl}/items/${items[0].fileName}`
        const iframe = document.querySelector('iframe')
        if (iframe?.contentWindow) {
          iframe.contentWindow.postMessage({
            type: 'CHANGE_ITEM',
            itemUrl: firstItemUrl
          }, '*')
        }
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [items, appUrl])

  // アイテム一覧を取得
  useEffect(() => {
    const fetchItems = async () => {
      try {
        const response = await fetch('/api/items')
        const data = await response.json()
        if (data.success) {
          setItems(data.items)
          // 初期状態を設定
          setQuestionStatuses(new Array(data.items.length).fill('not-started'))
          // 初期URLを設定（最初の問題）
          if (data.items.length > 0) {
            setInitialItemUrl(`${appUrl}/items/${data.items[0].fileName}`)
          }
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

  // 問題をクリックしたときの処理
  const handleQuestionClick = useCallback((index: number) => {
    if (index < 0 || index >= items.length) return

    const itemUrl = `${appUrl}/items/${items[index].fileName}`

    // iframe に postMessage で問題変更を指示
    const iframe = document.querySelector('iframe')
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage({
        type: 'CHANGE_ITEM',
        itemUrl
      }, '*')
    }

    setCurrentItemIndex(index)
  }, [items, appUrl])

  // テスト終了処理
  const handleFinishTest = useCallback(() => {
    // 全問題の結果を構築（回答済み・未回答両方）
    const results = items.map((item, index) => {
      const status = questionStatuses[index]
      const answered = status === 'answered-correct' || status === 'answered-incorrect' || status === 'answered-external'
      const isExternalScored = status === 'answered-external'
      const score = status === 'answered-correct' ? 1 : 0
      return {
        itemId: item.fileName.replace('.xml', ''),
        score,
        maxScore: 1,
        answered,
        isExternalScored
      }
    })

    // iframe に postMessage でテスト終了を指示（全問題を送信）
    // 注意: currentItemIndex は Vue Player から TEST_COMPLETED を受け取った時点で -1 にする
    // ここで setCurrentItemIndex(-1) を呼ぶと itemUrl が変わり iframe が再読み込みされてしまう
    const iframe = document.querySelector('iframe')
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage({
        type: 'FINISH_TEST',
        results
      }, '*')
    }
  }, [items, questionStatuses])

  // ローディング中
  if (isLoading || !sessionId || !initialItemUrl) {
    return (
      <Box sx={{ width: '100%', p: 1 }}>
        <h1 style={{ marginBottom: '20px' }}>QTI3 Player テスト</h1>
        <p>読み込み中...</p>
      </Box>
    )
  }

  // エラー時
  if (error || items.length === 0) {
    return (
      <Box sx={{ width: '100%', p: 1 }}>
        <h1 style={{ marginBottom: '20px' }}>QTI3 Player テスト</h1>
        <p style={{ color: '#c62828' }}>{error || 'テスト問題が見つかりませんでした'}</p>
      </Box>
    )
  }

  const itemCount = items.length

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      {/* ヘッダー */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: 1,
          px: 2,
          backgroundColor: '#e3f2fd',
          borderRadius: 1,
          mb: 1,
        }}
      >
        <span style={{ fontWeight: 'bold' }}>
          QTI3 Player テスト（{itemCount}問）{currentItemIndex >= 0 ? `- 問${currentItemIndex + 1}` : '- テスト結果'}
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
      </Box>

      {/* メインコンテンツ */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* 左サイドバー */}
        <QuestionSidebar
          itemCount={itemCount}
          statuses={questionStatuses}
          currentIndex={currentItemIndex}
          onQuestionClick={handleQuestionClick}
          onFinishTest={handleFinishTest}
        />

        {/* プレイヤー */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
          <QtiPlayerFrame
            key={sessionId}
            itemUrl={initialItemUrl}
            sessionId={sessionId}
            fontFamily={selectedFont}
          />
        </Box>
      </Box>

      {/* フッター */}
      <Box
        sx={{
          p: 1,
          backgroundColor: '#f5f5f5',
          borderTop: '1px solid #ccc',
          textAlign: 'center',
        }}
      >
        <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
          <strong>Session ID:</strong> {sessionId} ／ 問題番号をクリックして移動できます
        </p>
      </Box>
    </Box>
  )
}
