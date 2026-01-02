'use client'

import { useRef, useEffect, useCallback } from 'react'
import { Box, Button, Tooltip } from '@mui/material'
import { useSettings } from '@/contexts/SettingsContext'
import type { ItemInfo, ItemResult, FontOption, QuestionStatus } from '@/types/test'

interface TestInProgressProps {
  items: ItemInfo[]
  results: Map<string, ItemResult>
  currentIndex: number
  sessionId: string
  font: FontOption
  onNavigate: (index: number) => void
  onItemLoaded: (itemId: string) => void
  onItemScored: (result: ItemResult) => void
  onFinish: () => void
}

/**
 * テスト実行中画面コンポーネント
 * - 左サイドバー: 問題番号ナビゲーション + 終了ボタン
 * - メインエリア: QTI Player (iframe)
 */
export function TestInProgress({
  items,
  results,
  currentIndex,
  sessionId,
  font,
  onNavigate,
  onItemLoaded,
  onItemScored,
  onFinish,
}: TestInProgressProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const { setHideNavigation } = useSettings()

  // テスト中はナビゲーションを非表示にする
  useEffect(() => {
    setHideNavigation(true)
    return () => setHideNavigation(false)
  }, [setHideNavigation])

  const playerUrl = process.env.NEXT_PUBLIC_PLAYER_URL || 'http://localhost:5173'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  // 現在のアイテムURL
  const currentItem = items[currentIndex]
  const itemUrl = currentItem ? `${appUrl}/items/${currentItem.fileName}` : ''
  const callbackUrl = `${appUrl}/api/results`

  // iframe の src URL
  const iframeSrc = currentItem
    ? `${playerUrl}?item=${encodeURIComponent(itemUrl)}&callback=${encodeURIComponent(callbackUrl)}&session=${sessionId}&font=${font}`
    : ''

  // 問題のステータスを取得
  const getQuestionStatus = useCallback((index: number): QuestionStatus => {
    const item = items[index]
    if (!item) return 'not-started'

    const result = results.get(item.id)
    if (!result || !result.answered) {
      return index === currentIndex ? 'in-progress' : 'not-started'
    }

    if (result.isExternalScored) return 'answered-external'
    return result.score > 0 ? 'answered-correct' : 'answered-incorrect'
  }, [items, results, currentIndex])

  // ステータスに応じた色を取得
  const getStatusColor = (status: QuestionStatus, isCurrent: boolean): string => {
    // 回答済みの場合は正解/不正解/外部採点の色を優先
    switch (status) {
      case 'answered-correct': return '#4caf50' // 緑: 正解
      case 'answered-incorrect': return '#f44336' // 赤: 不正解
      case 'answered-external': return '#ff9800' // オレンジ: 未採点
      default:
        // 未回答の場合のみ現在の問題かどうかで色を変える
        return isCurrent ? '#1976d2' : '#9e9e9e' // 青: 現在の問題 / グレー: 未回答
    }
  }

  // postMessage リスナー
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data || !event.data.type) return

      if (event.data.type === 'ITEM_LOADED') {
        onItemLoaded(event.data.itemId)
      }

      if (event.data.type === 'ITEM_ANSWERED') {
        const { itemId, score, maxScore, isExternalScored, response, duration } = event.data
        onItemScored({
          itemId,
          score: score ?? 0,
          maxScore: maxScore ?? 1,
          isExternalScored: isExternalScored ?? false,
          answered: true,
          response: response ?? '',
          duration: duration ?? undefined,
        })
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [onItemLoaded, onItemScored])

  // 問題をクリックしたときの処理
  const handleQuestionClick = (index: number) => {
    if (index === currentIndex) return

    // iframe に CHANGE_ITEM メッセージを送信
    const newItem = items[index]
    if (newItem && iframeRef.current?.contentWindow) {
      const newItemUrl = `${appUrl}/items/${newItem.fileName}`
      iframeRef.current.contentWindow.postMessage({
        type: 'CHANGE_ITEM',
        itemUrl: newItemUrl,
      }, '*')
    }

    onNavigate(index)
  }

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 120px)' }}>
      {/* 左サイドバー */}
      <Box
        sx={{
          width: 70,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          py: 2,
          borderRight: '2px solid #e0e0e0',
          backgroundColor: '#fafafa',
        }}
      >
        {/* 問題番号ボタン */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {items.map((item, index) => {
            const status = getQuestionStatus(index)
            const isCurrent = index === currentIndex
            const bgColor = getStatusColor(status, isCurrent)

            return (
              <Tooltip
                key={item.id}
                title={`${item.title} (${item.type})`}
                placement="right"
                arrow
              >
                <Button
                  onClick={() => handleQuestionClick(index)}
                  sx={{
                    minWidth: 36,
                    height: 28,
                    px: 1,
                    py: 0.5,
                    borderRadius: '6px',
                    backgroundColor: bgColor,
                    color: '#fff',
                    fontWeight: 'bold',
                    fontSize: '0.875rem',
                    '&:hover': {
                      backgroundColor: bgColor,
                      opacity: 0.85,
                    },
                  }}
                >
                  {index + 1}
                </Button>
              </Tooltip>
            )
          })}
        </Box>

        {/* 区切り線 */}
        <Box
          sx={{
            width: '80%',
            borderTop: '1px solid #ccc',
            my: 1.5,
          }}
        />

        {/* 終了ボタン */}
        <Button
          variant="contained"
          color="error"
          onClick={onFinish}
          sx={{
            minWidth: 50,
            fontWeight: 'bold',
          }}
        >
          終了
        </Button>
      </Box>

      {/* メインエリア: iframe */}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        {iframeSrc ? (
          <iframe
            ref={iframeRef}
            src={iframeSrc}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
            }}
            title="QTI Player"
          />
        ) : (
          <Box sx={{ p: 4, textAlign: 'center', color: '#666' }}>
            問題を読み込んでいます...
          </Box>
        )}
      </Box>
    </Box>
  )
}
