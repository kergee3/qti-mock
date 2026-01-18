'use client'

import { useState, useEffect, useCallback } from 'react'
import { Box, CircularProgress } from '@mui/material'
import { AiChoiceInitialScreen } from '@/components/ai-choice/AiChoiceInitialScreen'
import { BasicRunInProgress } from '@/components/basic-run/BasicRunInProgress'
import { BasicRunResults } from '@/components/basic-run/BasicRunResults'
import type { TestPhase, ItemInfo, ItemResult, FontOption, QuestionBarPosition } from '@/types/test'
import type { AiChoiceEntry, AiChoiceSummary } from '@/types/ai-choice'
import { parseAiChoiceMd, extractFileNameFromUrl } from '@/lib/ai-choice-parser'

/**
 * AI生成問題ページ
 * 3つのフェーズで構成:
 * - initial: 初期画面（問題集選択、問題一覧、フォント選択、はじめるボタン）
 * - testing: 実行中（サイドバー + iframe）
 * - results: 結果画面（スコアサマリー、結果テーブル）
 */
export default function AiChoicePage() {
  // フェーズ管理
  const [phase, setPhase] = useState<TestPhase>('initial')

  // 問題集リスト（ai-choice-menu.mdから取得）
  const [entries, setEntries] = useState<AiChoiceEntry[]>([])
  const [selectedEntry, setSelectedEntry] = useState<AiChoiceEntry | null>(null)
  const [isLoadingEntries, setIsLoadingEntries] = useState(true)
  const [entriesError, setEntriesError] = useState<string | null>(null)

  // アイテム情報（Summary JSONから取得）
  const [items, setItems] = useState<ItemInfo[]>([])
  const [isLoadingItems, setIsLoadingItems] = useState(false)
  const [summary, setSummary] = useState<AiChoiceSummary | null>(null)


  // テスト状態
  const [currentItemIndex, setCurrentItemIndex] = useState(0)
  const [results, setResults] = useState<Map<string, ItemResult>>(new Map())
  const [sessionId, setSessionId] = useState('')

  // 設定
  const [selectedFont, setSelectedFont] = useState<FontOption>('system')
  const [questionBarPosition, setQuestionBarPosition] = useState<QuestionBarPosition>('auto')

  // sessionStorageからフォント設定を復元
  useEffect(() => {
    const savedFont = sessionStorage.getItem('ai-choice-font')
    if (savedFont) {
      setSelectedFont(savedFont as FontOption)
    }
  }, [])

  // フォント設定変更時にsessionStorageに保存
  const handleFontChange = useCallback((font: FontOption) => {
    setSelectedFont(font)
    sessionStorage.setItem('ai-choice-font', font)
  }, [])

  // 初期ロード: ai-choice-menu.mdを解析
  useEffect(() => {
    const loadEntries = async () => {
      try {
        const parsedEntries = await parseAiChoiceMd()
        setEntries(parsedEntries)
        // 先頭のエントリを自動選択
        if (parsedEntries.length > 0) {
          handleEntrySelect(parsedEntries[0])
        }
      } catch (e) {
        console.error('Failed to load ai-choice-menu.md:', e)
        setEntriesError('問題集リストの取得に失敗しました')
      } finally {
        setIsLoadingEntries(false)
      }
    }

    loadEntries()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 問題集選択時: Summary JSONをフェッチ
  const handleEntrySelect = useCallback(async (entry: AiChoiceEntry) => {
    setSelectedEntry(entry)
    setIsLoadingItems(true)
    setItems([])
    setSummary(null)

    try {
      const response = await fetch(entry.summaryUrl)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const fetchedSummary: AiChoiceSummary = await response.json()
      setSummary(fetchedSummary)

      // ItemInfo[]に変換
      // files配列には完全URL（https://...social_31_001-xxx.xml）が入っている前提
      const itemInfos: ItemInfo[] = fetchedSummary.files.map((fileUrl, index) => {
        const baseName = extractFileNameFromUrl(fileUrl)
        return {
          id: baseName,
          fileName: fileUrl,  // 完全URLをfileNameに入れる
          identifier: baseName,
          title: fetchedSummary.questions[index]?.title || `問題 ${index + 1}`,
          type: 'choiceInteraction', // AI生成問題は全て4択
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
    // セッションIDを生成
    setSessionId(`ai-session-${Date.now()}`)
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
        <Box component="h1" sx={{ mb: 2 }}>AI生成問題</Box>
        <Box sx={{ color: '#c62828' }}>{entriesError}</Box>
      </Box>
    )
  }

  // フェーズ別表示
  switch (phase) {
    case 'initial':
      return (
        <AiChoiceInitialScreen
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
        <BasicRunInProgress
          items={items}
          results={results}
          currentIndex={currentItemIndex}
          sessionId={sessionId}
          font={selectedFont}
          questionBarPosition={questionBarPosition}
          writingDirection="horizontal"
          onNavigate={handleNavigate}
          onItemLoaded={handleItemLoaded}
          onItemScored={handleItemScored}
          onFinish={handleFinish}
        />
      )

    case 'results':
      return (
        <BasicRunResults
          items={items}
          results={results}
          onRestart={handleRestart}
        />
      )

    default:
      return null
  }
}
