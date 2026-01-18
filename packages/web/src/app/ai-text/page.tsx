'use client'

import { useState, useEffect, useCallback } from 'react'
import { Box, CircularProgress } from '@mui/material'
import { AiTextInitialScreen } from '@/components/ai-text/AiTextInitialScreen'
import { AiTextInProgress } from '@/components/ai-text/AiTextInProgress'
import { AiTextResults } from '@/components/ai-text/AiTextResults'
import type { TestPhase, ItemInfo, ItemResult, FontOption, QuestionBarPosition } from '@/types/test'
import type { AiTextEntry, AiTextSummary, AiScoringResult } from '@/types/ai-text'
import { parseAiTextMd, extractFileNameFromUrl } from '@/lib/ai-text-parser'

/**
 * AI記述式採点ページ
 * 3つのフェーズで構成:
 * - initial: 初期画面（問題集選択、問題一覧、フォント選択、はじめるボタン）
 * - testing: 実行中（サイドバー + iframe）
 * - results: 結果画面（AI採点結果、フィードバック）
 */
export default function AiTextPage() {
  // フェーズ管理
  const [phase, setPhase] = useState<TestPhase>('initial')

  // 問題集リスト（ai-text.mdから取得）
  const [entries, setEntries] = useState<AiTextEntry[]>([])
  const [selectedEntry, setSelectedEntry] = useState<AiTextEntry | null>(null)
  const [isLoadingEntries, setIsLoadingEntries] = useState(true)
  const [entriesError, setEntriesError] = useState<string | null>(null)

  // アイテム情報（Summary JSONから取得）
  const [items, setItems] = useState<ItemInfo[]>([])
  const [isLoadingItems, setIsLoadingItems] = useState(false)
  const [summary, setSummary] = useState<AiTextSummary | null>(null)

  // テスト状態
  const [currentItemIndex, setCurrentItemIndex] = useState(0)
  const [results, setResults] = useState<Map<string, ItemResult>>(new Map())
  const [scoringResults, setScoringResults] = useState<Map<string, AiScoringResult>>(new Map())
  const [sessionId, setSessionId] = useState('')

  // 設定
  const [selectedFont, setSelectedFont] = useState<FontOption>('system')
  const [questionBarPosition, setQuestionBarPosition] = useState<QuestionBarPosition>('auto')

  // sessionStorageからフォント設定を復元
  useEffect(() => {
    const savedFont = sessionStorage.getItem('ai-text-font')
    if (savedFont) {
      setSelectedFont(savedFont as FontOption)
    }
  }, [])

  // フォント設定変更時にsessionStorageに保存
  const handleFontChange = useCallback((font: FontOption) => {
    setSelectedFont(font)
    sessionStorage.setItem('ai-text-font', font)
  }, [])

  // 初期ロード: ai-text.mdを解析
  useEffect(() => {
    const loadEntries = async () => {
      try {
        const parsedEntries = await parseAiTextMd()
        setEntries(parsedEntries)
        // 先頭のエントリを自動選択
        if (parsedEntries.length > 0) {
          handleEntrySelect(parsedEntries[0])
        }
      } catch (e) {
        console.error('Failed to load ai-text.md:', e)
        setEntriesError('問題集リストの取得に失敗しました')
      } finally {
        setIsLoadingEntries(false)
      }
    }

    loadEntries()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 問題集選択時: Summary JSONをフェッチ
  const handleEntrySelect = useCallback(async (entry: AiTextEntry) => {
    setSelectedEntry(entry)
    setIsLoadingItems(true)
    setItems([])
    setSummary(null)

    try {
      const response = await fetch(entry.summaryUrl)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const fetchedSummary: AiTextSummary = await response.json()
      setSummary(fetchedSummary)

      // ItemInfo[]に変換
      const itemInfos: ItemInfo[] = fetchedSummary.files.map((fileUrl, index) => {
        const baseName = extractFileNameFromUrl(fileUrl)
        return {
          id: baseName,
          fileName: fileUrl,  // 完全URLをfileNameに入れる
          identifier: baseName,
          title: fetchedSummary.questions[index]?.title || `問題 ${index + 1}`,
          type: 'extendedTextInteraction', // 記述式問題
        }
      })

      setItems(itemInfos)
    } catch (e) {
      console.error('Failed to load summary:', e)
      setItems([])
      setSummary(null)
    } finally {
      setIsLoadingItems(false)
    }
  }, [])

  // テスト開始
  const handleStart = useCallback(() => {
    setSessionId(`ai-text-${Date.now()}`)
    setResults(new Map())
    setScoringResults(new Map())
    setCurrentItemIndex(0)
    setPhase('testing')
  }, [])

  // 問題移動
  const handleNavigate = useCallback((index: number) => {
    setCurrentItemIndex(index)
  }, [])

  // アイテム読み込み完了
  const handleItemLoaded = useCallback((itemId: string) => {
    console.log(`Item loaded: ${itemId}`)
  }, [])

  // 回答受信（外部採点として処理）
  const handleItemScored = useCallback((result: ItemResult) => {
    setResults(prev => {
      const newResults = new Map(prev)
      newResults.set(result.itemId, result)
      return newResults
    })
  }, [])

  // AI採点結果を更新
  const handleScoringResultUpdate = useCallback((result: AiScoringResult) => {
    setScoringResults(prev => {
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
    setScoringResults(new Map())
    setCurrentItemIndex(0)
    setPhase('initial')
  }, [])

  // 初期ローディング中
  if (isLoadingEntries) {
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
  if (entriesError) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Box component="h1" sx={{ mb: 2 }}>AI記述式採点</Box>
        <Box sx={{ color: '#c62828' }}>{entriesError}</Box>
      </Box>
    )
  }

  // フェーズ別表示
  switch (phase) {
    case 'initial':
      return (
        <AiTextInitialScreen
          entries={entries}
          selectedEntry={selectedEntry}
          onEntrySelect={handleEntrySelect}
          items={items}
          isLoadingItems={isLoadingItems}
          summary={summary}
          selectedFont={selectedFont}
          onFontChange={handleFontChange}
          onStart={handleStart}
        />
      )

    case 'testing':
      return (
        <AiTextInProgress
          items={items}
          results={results}
          scoringResults={scoringResults}
          summary={summary}
          currentIndex={currentItemIndex}
          sessionId={sessionId}
          font={selectedFont}
          questionBarPosition={questionBarPosition}
          writingDirection="horizontal"
          onNavigate={handleNavigate}
          onItemLoaded={handleItemLoaded}
          onItemScored={handleItemScored}
          onScoringResultUpdate={handleScoringResultUpdate}
          onFinish={handleFinish}
        />
      )

    case 'results':
      return (
        <AiTextResults
          items={items}
          results={results}
          scoringResults={scoringResults}
          summary={summary}
          onRestart={handleRestart}
        />
      )

    default:
      return null
  }
}
