'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import { Box, Button, Tooltip } from '@mui/material'
import { useSettings } from '@/contexts/SettingsContext'
import type { ItemInfo, ItemResult, FontOption, QuestionStatus, QuestionBarPosition, WritingDirection } from '@/types/test'

interface BasicRunInProgressProps {
  items: ItemInfo[]
  results: Map<string, ItemResult>
  currentIndex: number
  sessionId: string
  font: FontOption
  questionBarPosition: QuestionBarPosition
  writingDirection: WritingDirection
  xmlBaseUrl?: string  // 外部URL（Vercel Blob等）を使用する場合に指定
  onNavigate: (index: number) => void
  onItemLoaded: (itemId: string) => void
  onItemScored: (result: ItemResult) => void
  onFinish: () => void
}

/**
 * Basic Run 実行中画面コンポーネント
 * - 左サイドバー: 問題番号ナビゲーション + 終了ボタン
 * - メインエリア: QTI Player (iframe)
 */
export function BasicRunInProgress({
  items,
  results,
  currentIndex,
  sessionId,
  font,
  questionBarPosition,
  writingDirection,
  xmlBaseUrl,
  onNavigate,
  onItemLoaded,
  onItemScored,
  onFinish,
}: BasicRunInProgressProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const { setHideNavigation, fontSize } = useSettings()

  // テスト中はナビゲーションを非表示にする
  useEffect(() => {
    setHideNavigation(true)
    return () => setHideNavigation(false)
  }, [setHideNavigation])

  const playerUrl = process.env.NEXT_PUBLIC_PLAYER_URL || 'http://localhost:5173'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  // 現在のアイテムURL（書字方向に応じてディレクトリを変更、または外部URLを使用）
  const currentItem = items[currentIndex]
  const itemsSubDir = writingDirection === 'vertical' ? 'items-v' : 'items-h'

  // itemUrlを生成するヘルパー関数
  const getItemUrl = (item: ItemInfo): string => {
    // fileNameが完全URLの場合はそのまま使用
    if (item.fileName.startsWith('http://') || item.fileName.startsWith('https://')) {
      return item.fileName
    }
    // xmlBaseUrlが指定されている場合はそれをベースに使用
    if (xmlBaseUrl) {
      return `${xmlBaseUrl}${item.fileName}`
    }
    // デフォルトはローカルパス
    return `${appUrl}/${itemsSubDir}/${item.fileName}`
  }

  const itemUrl = currentItem ? getItemUrl(currentItem) : ''
  const callbackUrl = `${appUrl}/api/results`

  // iframe の src URL
  const iframeSrc = currentItem
    ? `${playerUrl}?item=${encodeURIComponent(itemUrl)}&callback=${encodeURIComponent(callbackUrl)}&session=${sessionId}&font=${font}&fontSize=${fontSize}`
    : ''

  // 問題のステータスを取得
  const getQuestionStatus = useCallback((index: number): QuestionStatus => {
    const item = items[index]
    if (!item) return 'not-started'

    const result = results.get(item.identifier)
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
      const newItemUrl = getItemUrl(newItem)
      iframeRef.current.contentWindow.postMessage({
        type: 'CHANGE_ITEM',
        itemUrl: newItemUrl,
      }, '*')
    }

    onNavigate(index)
  }

  // 次へボタンの処理
  const handleNextClick = () => {
    if (currentIndex < items.length - 1) {
      handleQuestionClick(currentIndex + 1)
    }
  }

  // 最後の問題かどうか
  const isLastQuestion = currentIndex >= items.length - 1

  // 画面サイズに基づく自動位置判定
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const updateSize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight })
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  // 実際の位置を決定（auto の場合は画面サイズと書字方向で判定）
  const effectivePosition: 'left' | 'right' | 'top-ltr' | 'top-rtl' | 'bottom-ltr' | 'bottom-rtl' = (() => {
    if (questionBarPosition === 'auto') {
      const isLandscape = windowSize.width >= windowSize.height
      if (writingDirection === 'vertical') {
        // 縦書き: 横長→右-縦並び、縦長→上-横並び(右から)
        return isLandscape ? 'right' : 'top-rtl'
      } else {
        // 横書き: 横長→左-縦並び、縦長→上-横並び(左から)
        return isLandscape ? 'left' : 'top-ltr'
      }
    }
    return questionBarPosition
  })()

  // 横並び（top/bottom）用かどうか
  const isHorizontal = effectivePosition.startsWith('top') || effectivePosition.startsWith('bottom')
  // 右から並べるかどうか
  const isRtl = effectivePosition.endsWith('-rtl')

  // 問題番号ボタンをレンダリング
  const renderQuestionButtons = () => {
    return (
    <Box sx={{
      display: 'flex',
      flexDirection: isHorizontal ? 'row' : 'column',
      gap: 0.5,
      flexWrap: isHorizontal ? 'wrap' : 'nowrap',
      direction: isRtl ? 'rtl' : 'ltr',
    }}>
      {items.map((item, index) => {
        const status = getQuestionStatus(index)
        const isCurrent = index === currentIndex
        const bgColor = getStatusColor(status, isCurrent)

        return (
          <Tooltip
            key={item.id}
            title={`${item.title} (${item.type})`}
            placement={isHorizontal ? 'bottom' : 'right'}
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
                border: isCurrent ? '3px solid #000' : 'none',
                boxSizing: 'border-box',
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
    )
  }

  // 縦書きボタンにするかどうか（縦書き問題の場合）
  const useVerticalButton = writingDirection === 'vertical'

  // 次へボタンをレンダリング
  const renderNextButton = () => (
    <Button
      variant="contained"
      color="primary"
      onClick={handleNextClick}
      disabled={isLastQuestion}
      sx={{
        minWidth: useVerticalButton ? 32 : 50,
        fontWeight: 'bold',
        writingMode: useVerticalButton ? 'vertical-rl' : 'horizontal-tb',
        py: useVerticalButton ? 1 : 0.5,
        px: useVerticalButton ? 0.5 : 1,
      }}
    >
      次へ
    </Button>
  )

  // 終了ボタンをレンダリング
  const renderFinishButton = () => (
    <Button
      variant="contained"
      color="error"
      onClick={onFinish}
      sx={{
        minWidth: useVerticalButton ? 32 : 50,
        fontWeight: 'bold',
        writingMode: useVerticalButton ? 'vertical-rl' : 'horizontal-tb',
        py: useVerticalButton ? 1 : 0.5,
        px: useVerticalButton ? 0.5 : 1,
      }}
    >
      終了
    </Button>
  )

  // iframeをレンダリング
  const renderIframe = () => (
    <Box sx={{
      flex: 1,
      overflow: 'auto',
      WebkitOverflowScrolling: 'touch',
      // iOS iframe スクロール対応
      position: 'relative',
    }}>
      {iframeSrc ? (
        <iframe
          ref={iframeRef}
          src={iframeSrc}
          scrolling="yes"
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            // iOS iframe スクロール対応
            WebkitOverflowScrolling: 'touch',
          } as React.CSSProperties}
          title="QTI Player"
        />
      ) : (
        <Box sx={{ p: 4, textAlign: 'center', color: '#666' }}>
          問題を読み込んでいます...
        </Box>
      )}
    </Box>
  )

  // 区切り線（横並び用）
  const renderHorizontalDivider = () => (
    <Box
      sx={{
        height: 28,
        borderLeft: '1px solid #ccc',
        mx: 0.5,
      }}
    />
  )

  // 問題バーをレンダリング（横並び: top/bottom）
  const renderHorizontalBar = () => (
    <Box
      sx={{
        display: 'flex',
        flexDirection: isRtl ? 'row-reverse' : 'row',
        alignItems: 'center',
        gap: 1.5,
        px: 2,
        py: 1,
        backgroundColor: '#fafafa',
        borderBottom: effectivePosition.startsWith('top') ? '2px solid #e0e0e0' : 'none',
        borderTop: effectivePosition.startsWith('bottom') ? '2px solid #e0e0e0' : 'none',
      }}
    >
      {renderNextButton()}
      {renderHorizontalDivider()}
      {renderQuestionButtons()}
      {renderHorizontalDivider()}
      {renderFinishButton()}
    </Box>
  )

  // 区切り線（縦並び用）
  const renderVerticalDivider = () => (
    <Box
      sx={{
        width: '80%',
        borderTop: '1px solid #ccc',
        my: 1.5,
      }}
    />
  )

  // 問題バーをレンダリング（縦並び: left）
  const renderVerticalBarLeft = () => (
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
      {renderNextButton()}
      {renderVerticalDivider()}
      {renderQuestionButtons()}
      {renderVerticalDivider()}
      {renderFinishButton()}
    </Box>
  )

  // 問題バーをレンダリング（縦並び: right）
  const renderVerticalBarRight = () => (
    <Box
      sx={{
        width: 70,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        py: 2,
        borderLeft: '2px solid #e0e0e0',
        backgroundColor: '#fafafa',
      }}
    >
      {renderNextButton()}
      {renderVerticalDivider()}
      {renderQuestionButtons()}
      {renderVerticalDivider()}
      {renderFinishButton()}
    </Box>
  )

  // レイアウトに応じたレンダリング
  // ナビゲーション非表示時は100dvhを使用（モバイルブラウザのアドレスバー対応）
  const containerSx = {
    display: 'flex',
    height: '100dvh',
    minHeight: '100dvh',
    maxHeight: '100dvh',
    overflow: 'hidden',
    // dvh非対応ブラウザ（古いブラウザ）用のフォールバック
    '@supports not (height: 100dvh)': {
      height: '100vh',
      minHeight: '100vh',
      maxHeight: '100vh',
    },
  }

  if (effectivePosition.startsWith('top')) {
    return (
      <Box sx={{ ...containerSx, flexDirection: 'column' }}>
        {renderHorizontalBar()}
        {renderIframe()}
      </Box>
    )
  }

  if (effectivePosition.startsWith('bottom')) {
    return (
      <Box sx={{ ...containerSx, flexDirection: 'column' }}>
        {renderIframe()}
        {renderHorizontalBar()}
      </Box>
    )
  }

  if (effectivePosition === 'right') {
    return (
      <Box sx={containerSx}>
        {renderIframe()}
        {renderVerticalBarRight()}
      </Box>
    )
  }

  // デフォルト: left
  return (
    <Box sx={containerSx}>
      {renderVerticalBarLeft()}
      {renderIframe()}
    </Box>
  )
}
