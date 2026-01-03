'use client'

import { useState, useEffect, useCallback } from 'react'
import { Box, CircularProgress } from '@mui/material'
import { TestInitialScreen } from '@/components/test/TestInitialScreen'
import { TestInProgress } from '@/components/test/TestInProgress'
import { TestResults } from '@/components/test/TestResults'
import type { TestPhase, ItemInfo, ItemResult, FontOption, QuestionBarPosition, WritingDirection } from '@/types/test'

/**
 * テストページ
 * 3つのフェーズで構成:
 * - initial: 初期画面（問題一覧、フォント選択、はじめるボタン）
 * - testing: テスト実行中（サイドバー + iframe）
 * - results: 結果画面（スコアサマリー、結果テーブル）
 */
export default function TestPage() {
  // フェーズ管理
  const [phase, setPhase] = useState<TestPhase>('initial')

  // アイテム情報
  const [items, setItems] = useState<ItemInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // テスト状態
  const [currentItemIndex, setCurrentItemIndex] = useState(0)
  const [results, setResults] = useState<Map<string, ItemResult>>(new Map())
  const [sessionId, setSessionId] = useState('')

  // 設定
  const [selectedFont, setSelectedFont] = useState<FontOption>('system')
  const [questionBarPosition, setQuestionBarPosition] = useState<QuestionBarPosition>('auto')
  const [writingDirection, setWritingDirection] = useState<WritingDirection>('horizontal')

  // アイテム一覧を取得（書字方向が変更されたら再取得）
  useEffect(() => {
    const fetchItems = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/items?dir=${writingDirection}`)
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
  }, [writingDirection])

  // テスト開始
  const handleStart = useCallback(() => {
    // セッションIDを生成
    setSessionId(`session-${Date.now()}`)
    // 結果をリセット
    setResults(new Map())
    setCurrentItemIndex(0)
    // テストフェーズへ
    setPhase('testing')
  }, [])

  // 問題移動
  const handleNavigate = useCallback((index: number) => {
    setCurrentItemIndex(index)
  }, [])

  // アイテム読み込み完了
  const handleItemLoaded = useCallback((itemId: string) => {
    // 必要に応じてログなど
    console.log(`Item loaded: ${itemId}`)
  }, [])

  // 採点結果受信
  const handleItemScored = useCallback((result: ItemResult) => {
    setResults(prev => {
      const newResults = new Map(prev)
      newResults.set(result.itemId, result)
      return newResults
    })
  }, [])

  // テスト終了
  const handleFinish = useCallback(() => {
    setPhase('results')
  }, [])

  // もう一度
  const handleRestart = useCallback(() => {
    setResults(new Map())
    setCurrentItemIndex(0)
    setPhase('initial')
  }, [])

  // ローディング中
  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '50vh',
        }}
      >
        <CircularProgress />
      </Box>
    )
  }

  // エラー時
  if (error) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Box component="h1" sx={{ mb: 2 }}>QTI3 Player テスト</Box>
        <Box sx={{ color: '#c62828' }}>{error}</Box>
      </Box>
    )
  }

  // フェーズ別表示
  switch (phase) {
    case 'initial':
      return (
        <TestInitialScreen
          items={items}
          writingDirection={writingDirection}
          onWritingDirectionChange={setWritingDirection}
          selectedFont={selectedFont}
          onFontChange={setSelectedFont}
          questionBarPosition={questionBarPosition}
          onQuestionBarPositionChange={setQuestionBarPosition}
          onStart={handleStart}
        />
      )

    case 'testing':
      return (
        <TestInProgress
          items={items}
          results={results}
          currentIndex={currentItemIndex}
          sessionId={sessionId}
          font={selectedFont}
          questionBarPosition={questionBarPosition}
          writingDirection={writingDirection}
          onNavigate={handleNavigate}
          onItemLoaded={handleItemLoaded}
          onItemScored={handleItemScored}
          onFinish={handleFinish}
        />
      )

    case 'results':
      return (
        <TestResults
          items={items}
          results={results}
          onRestart={handleRestart}
        />
      )

    default:
      return null
  }
}
