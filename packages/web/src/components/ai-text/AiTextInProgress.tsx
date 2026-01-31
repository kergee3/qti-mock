'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import { Box, Button, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Typography, LinearProgress } from '@mui/material'
import { useSettings } from '@/contexts/SettingsContext'
import { fetchAndStripRuby } from '@/utils/ruby'
import type { ItemInfo, ItemResult, FontOption, QuestionStatus, QuestionBarPosition, WritingDirection } from '@/types/test'
import type { AiTextSummary, AiScoringResult, AiScoringResponse, ScoringCriteria, AiModelType } from '@/types/ai-text'

interface AiTextInProgressProps {
  items: ItemInfo[]
  results: Map<string, ItemResult>
  scoringResults: Map<string, AiScoringResult>
  summary: AiTextSummary | null
  currentIndex: number
  sessionId: string
  font: FontOption
  questionBarPosition: QuestionBarPosition
  writingDirection: WritingDirection
  onNavigate: (index: number) => void
  onItemLoaded: (itemId: string) => void
  onItemScored: (result: ItemResult) => void
  onScoringResultUpdate: (result: AiScoringResult) => void
  onFinish: () => void
}

/**
 * AI記述式採点 実行中画面コンポーネント
 * - サイドバー: 問題番号ナビゲーション + 終了ボタン
 * - メインエリア: QTI Player (iframe)
 * - 採点ダイアログ: AI採点中/結果表示
 */
export function AiTextInProgress({
  items,
  results,
  scoringResults,
  summary,
  currentIndex,
  sessionId,
  font,
  questionBarPosition,
  writingDirection,
  onNavigate,
  onItemLoaded,
  onItemScored,
  onScoringResultUpdate,
  onFinish,
}: AiTextInProgressProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const { setHideNavigation, fontSize, aiModel, voiceInputEnabled, rubyEnabled } = useSettings()

  // 採点ダイアログの状態
  const [scoringDialogOpen, setScoringDialogOpen] = useState(false)
  const [isScoring, setIsScoring] = useState(false)
  const [currentScoringResult, setCurrentScoringResult] = useState<AiScoringResponse | null>(null)
  const [scoringError, setScoringError] = useState<string | null>(null)
  const [streamingText, setStreamingText] = useState<string>('')

  // テスト中はナビゲーションを非表示にする
  useEffect(() => {
    setHideNavigation(true)
    return () => setHideNavigation(false)
  }, [setHideNavigation])

  const playerUrl = process.env.NEXT_PUBLIC_PLAYER_URL || 'http://localhost:5173'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const currentItem = items[currentIndex]
  const itemsSubDir = writingDirection === 'vertical' ? 'items-v' : 'items-h'

  const getItemUrl = (item: ItemInfo): string => {
    if (item.fileName.startsWith('http://') || item.fileName.startsWith('https://')) {
      return item.fileName
    }
    return `${appUrl}/${itemsSubDir}/${item.fileName}`
  }

  const callbackUrl = `${appUrl}/api/results`

  // ルビ表示が無効の場合、クライアントサイドでXMLをfetchしてrubyを除去しData URL化
  const [processedItemUrl, setProcessedItemUrl] = useState<string>('')

  useEffect(() => {
    if (!currentItem) {
      setProcessedItemUrl('')
      return
    }
    const rawUrl = getItemUrl(currentItem)
    if (rubyEnabled) {
      setProcessedItemUrl(rawUrl)
    } else {
      fetchAndStripRuby(rawUrl).then(setProcessedItemUrl)
    }
  }, [currentItem, rubyEnabled]) // eslint-disable-line react-hooks/exhaustive-deps

  const voiceParam = voiceInputEnabled ? 'true' : 'false'
  const iframeSrc = processedItemUrl
    ? `${playerUrl}?item=${encodeURIComponent(processedItemUrl)}&callback=${encodeURIComponent(callbackUrl)}&session=${sessionId}&font=${font}&fontSize=${fontSize}&voice=${voiceParam}`
    : ''

  // 問題のステータスを取得
  const getQuestionStatus = useCallback((index: number): QuestionStatus => {
    const item = items[index]
    if (!item) return 'not-started'

    const result = results.get(item.identifier)
    const scoringResult = scoringResults.get(item.identifier)

    if (!result || !result.answered) {
      return index === currentIndex ? 'in-progress' : 'not-started'
    }

    // AI採点済みの場合
    if (scoringResult?.isScored && scoringResult.scoringResponse) {
      const score = scoringResult.scoringResponse.score
      const maxScore = scoringResult.scoringResponse.maxScore
      if (score >= maxScore * 0.7) return 'answered-correct' // 70%以上: 緑
      if (score >= maxScore * 0.4) return 'answered-external' // 40%以上: オレンジ
      return 'answered-incorrect' // それ以下: 赤
    }

    // 未採点
    return 'answered-external'
  }, [items, results, scoringResults, currentIndex])

  // ステータスに応じた色を取得
  const getStatusColor = (status: QuestionStatus, isCurrent: boolean): string => {
    switch (status) {
      case 'answered-correct': return '#4caf50'
      case 'answered-incorrect': return '#f44336'
      case 'answered-external': return '#ff9800'
      default:
        return isCurrent ? '#1976d2' : '#9e9e9e'
    }
  }

  const currentIndexRef = useRef(currentIndex)
  useEffect(() => {
    currentIndexRef.current = currentIndex
  }, [currentIndex])

  // AI採点を実行
  const performAiScoring = useCallback(async (itemId: string, response: string) => {
    if (!summary) return

    const questionIndex = items.findIndex(item => item.identifier === itemId)
    if (questionIndex === -1) return

    const question = summary.questions[questionIndex]
    if (!question) return

    // 最小文字数チェック
    const minChars = summary.metadata.min_chars || 60
    if (response.length < minChars) {
      const result: AiScoringResult = {
        itemId,
        response,
        scoringResponse: null,
        isScored: false,
      }
      onScoringResultUpdate(result)
      setScoringError(`回答が${minChars}文字未満のため、採点対象外です（${response.length}文字）`)
      setIsScoring(false)
      return
    }

    setIsScoring(true)
    setScoringError(null)
    setStreamingText('')

    try {
      // 採点基準を構築
      const scoringCriteria: ScoringCriteria = {
        model_answer: question.model_answer,
        required_concepts: question.required_concepts,
        scoring_matrix: question.scoring_matrix,
        common_errors: question.common_errors,
        min_chars: summary.metadata.min_chars,
        max_chars: summary.metadata.max_chars,
      }

      // AI採点APIを呼び出し（ストリーミング）
      const apiResponse = await fetch('/api/ai-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          response,
          scoringCriteria,
          questionText: question.question_text,
          model: aiModel as AiModelType,
        }),
      })

      if (!apiResponse.ok) {
        // APIからのエラーレスポンスを読み取る
        const contentType = apiResponse.headers.get('content-type')
        if (contentType?.includes('application/json')) {
          const errorData = await apiResponse.json()
          throw new Error(errorData.error || `API error: ${apiResponse.status}`)
        }
        throw new Error(`API error: ${apiResponse.status}`)
      }

      // ストリーミングレスポンスを処理
      const reader = apiResponse.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      const decoder = new TextDecoder()
      let accumulatedText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)
              if (parsed.type === 'text') {
                accumulatedText += parsed.content
                setStreamingText(accumulatedText)
              } else if (parsed.type === 'result') {
                const scoringResponse: AiScoringResponse = parsed.content

                const result: AiScoringResult = {
                  itemId,
                  response,
                  scoringResponse,
                  scoredAt: new Date().toISOString(),
                  isScored: true,
                }

                setCurrentScoringResult(scoringResponse)
                onScoringResultUpdate(result)
              } else if (parsed.type === 'error') {
                // エラー詳細があれば含めて表示
                const errorMsg = parsed.detail
                  ? `${parsed.content}\n${parsed.detail}`
                  : parsed.content
                setScoringError(errorMsg)
              }
            } catch {
              // JSONパースエラーは無視
            }
          }
        }
      }
    } catch (error) {
      console.error('AI scoring error:', error)
      const errorMessage = error instanceof Error ? error.message : '採点中にエラーが発生しました'
      setScoringError(errorMessage)
    } finally {
      setIsScoring(false)
    }
  }, [summary, items, onScoringResultUpdate, aiModel])

  // postMessage リスナー
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data || !event.data.type) return

      if (event.data.type === 'ITEM_LOADED') {
        onItemLoaded(event.data.itemId)
      }

      if (event.data.type === 'ITEM_ANSWERED') {
        const { score, maxScore, isExternalScored, response, duration } = event.data
        const currentItem = items[currentIndexRef.current]
        const itemIdentifier = currentItem?.identifier || event.data.itemId

        // 回答を保存
        onItemScored({
          itemId: itemIdentifier,
          score: score ?? 0,
          maxScore: maxScore ?? 1,
          isExternalScored: true, // 記述式は常に外部採点
          answered: true,
          response: response ?? '',
          duration: duration ?? undefined,
        })

        // 採点ダイアログを開いてAI採点を実行
        if (response) {
          setScoringDialogOpen(true)
          setCurrentScoringResult(null)
          performAiScoring(itemIdentifier, response)
        }
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [items, onItemLoaded, onItemScored, performAiScoring])

  // 問題をクリックしたときの処理
  const handleQuestionClick = async (index: number) => {
    if (index === currentIndex) return

    const newItem = items[index]
    if (newItem && iframeRef.current?.contentWindow) {
      const rawUrl = getItemUrl(newItem)
      const newItemUrl = rubyEnabled ? rawUrl : await fetchAndStripRuby(rawUrl)
      iframeRef.current.contentWindow.postMessage({
        type: 'CHANGE_ITEM',
        itemUrl: newItemUrl,
      }, '*')
    }

    onNavigate(index)
  }

  const handleNextClick = () => {
    if (currentIndex < items.length - 1) {
      handleQuestionClick(currentIndex + 1)
    }
  }

  const handleDialogClose = () => {
    setScoringDialogOpen(false)
    setCurrentScoringResult(null)
    setScoringError(null)
  }

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

  const effectivePosition: 'left' | 'right' | 'top-ltr' | 'top-rtl' | 'bottom-ltr' | 'bottom-rtl' = (() => {
    if (questionBarPosition === 'auto') {
      const isLandscape = windowSize.width >= windowSize.height
      if (writingDirection === 'vertical') {
        return isLandscape ? 'right' : 'top-rtl'
      } else {
        return isLandscape ? 'left' : 'top-ltr'
      }
    }
    return questionBarPosition
  })()

  const isHorizontal = effectivePosition.startsWith('top') || effectivePosition.startsWith('bottom')
  const isRtl = effectivePosition.endsWith('-rtl')

  // 問題番号ボタンをレンダリング
  const renderQuestionButtons = () => (
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
        const scoringResult = scoringResults.get(item.identifier)

        return (
          <Tooltip
            key={item.id}
            title={
              scoringResult?.isScored
                ? `${item.title} (${scoringResult.scoringResponse?.score || 0}/${scoringResult.scoringResponse?.maxScore || 10}点)`
                : `${item.title} (記述式)`
            }
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

  const useVerticalButton = writingDirection === 'vertical'

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

  const renderIframe = () => (
    <Box sx={{
      flex: 1,
      overflow: 'auto',
      WebkitOverflowScrolling: 'touch',
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
            WebkitOverflowScrolling: 'touch',
          } as React.CSSProperties}
          title="QTI Player"
          allow="microphone"
        />
      ) : (
        <Box sx={{ p: 4, textAlign: 'center', color: '#666' }}>
          問題を読み込んでいます...
        </Box>
      )}
    </Box>
  )

  const renderHorizontalDivider = () => (
    <Box
      sx={{
        height: 28,
        borderLeft: '1px solid #ccc',
        mx: 0.5,
      }}
    />
  )

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

  const renderVerticalDivider = () => (
    <Box
      sx={{
        width: '80%',
        borderTop: '1px solid #ccc',
        my: 1.5,
      }}
    />
  )

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

  // 採点結果ダイアログ
  const renderScoringDialog = () => (
    <Dialog open={scoringDialogOpen} onClose={handleDialogClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ backgroundColor: '#1976d2', color: '#fff', fontSize: '1.25rem' }}>
        AI採点結果
      </DialogTitle>
      <DialogContent sx={{ pt: 3, pb: 2 }}>
        {isScoring ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3 }}>
            <LinearProgress sx={{ width: '100%', mb: 2 }} />
            <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
              {aiModel === 'claude-haiku-4.5' ? 'Haiku 4.5' : aiModel === 'claude-sonnet-4.5' ? 'Sonnet 4.5' : aiModel === 'claude-haiku-3.5' ? 'Haiku 3.5' : 'Sonnet 4'} で採点中...
            </Typography>
            {streamingText && (
              <Box
                sx={{
                  mt: 2,
                  p: 1.5,
                  backgroundColor: '#f5f5f5',
                  borderRadius: 1,
                  maxHeight: 200,
                  overflow: 'auto',
                  width: '100%',
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}
              >
                {streamingText.length > 500 ? `...${streamingText.slice(-500)}` : streamingText}
              </Box>
            )}
          </Box>
        ) : scoringError ? (
          <Box sx={{ color: '#c62828', py: 2, fontSize: '1rem' }}>
            {scoringError}
          </Box>
        ) : currentScoringResult ? (
          <Box>
            {/* 総合スコア */}
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                {currentScoringResult.score} / {currentScoringResult.maxScore}
              </Typography>
              <Typography variant="body1" color="text.secondary">点</Typography>
            </Box>

            {/* 観点別スコア */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1.5, fontSize: '1.1rem' }}>観点別スコア</Typography>
              <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
                {Object.entries(currentScoringResult.breakdown).map(([key, value]) => (
                  <Box key={key} sx={{ textAlign: 'center', p: 1.5, backgroundColor: '#f5f5f5', borderRadius: 1, minWidth: 100 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.95rem' }}>
                      {key === 'understanding' ? '理解力' : key === 'expression' ? '表現力' : '正確性'}
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 'bold' }}>{value.score}/{value.maxScore}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>

            {/* 総合フィードバック */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1, fontSize: '1.1rem' }}>総合フィードバック</Typography>
              <Typography variant="body1" sx={{ backgroundColor: '#e3f2fd', p: 2, borderRadius: 1, lineHeight: 1.7 }}>
                {currentScoringResult.overallFeedback}
              </Typography>
            </Box>

            {/* 改善提案 */}
            {currentScoringResult.suggestions && currentScoringResult.suggestions.length > 0 && (
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1, fontSize: '1.1rem' }}>改善提案</Typography>
                <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                  {currentScoringResult.suggestions.map((suggestion, i) => (
                    <Box component="li" key={i} sx={{ fontSize: '1rem', lineHeight: 1.7, mb: 0.5 }}>{suggestion}</Box>
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between', px: 2, py: 1.5 }}>
        {/* 左下: 採点時間とトークン使用量 */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0.25 }}>
          {currentScoringResult && (
            <>
              {currentScoringResult.scoringTimeMs !== undefined && (
                <Typography variant="caption" color="text.secondary">
                  採点時間: {(currentScoringResult.scoringTimeMs / 1000).toFixed(2)}秒
                  {currentScoringResult.modelUsed && ` (${
                    currentScoringResult.modelUsed === 'claude-haiku-4.5' ? 'Haiku 4.5' :
                    currentScoringResult.modelUsed === 'claude-sonnet-4.5' ? 'Sonnet 4.5' :
                    currentScoringResult.modelUsed === 'claude-haiku-3.5' ? 'Haiku 3.5' : 'Sonnet 4'
                  })`}
                </Typography>
              )}
              {(currentScoringResult.inputTokens !== undefined || currentScoringResult.outputTokens !== undefined) && (
                <Typography variant="caption" color="text.secondary">
                  トークン: 入力 {currentScoringResult.inputTokens?.toLocaleString() ?? '-'} / 出力 {currentScoringResult.outputTokens?.toLocaleString() ?? '-'}
                </Typography>
              )}
              {(currentScoringResult.inputCost !== undefined || currentScoringResult.outputCost !== undefined) && (
                <Typography variant="caption" color="text.secondary">
                  コスト($): 入力 {currentScoringResult.inputCost?.toFixed(4) ?? '-'} / 出力 {currentScoringResult.outputCost?.toFixed(4) ?? '-'} / 合計 {currentScoringResult.totalCost?.toFixed(4) ?? '-'}
                </Typography>
              )}
            </>
          )}
        </Box>
        {/* 右側: ボタン */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={handleDialogClose} color="primary" disabled={isScoring}>
            閉じる
          </Button>
          {!isLastQuestion && !isScoring && (
            <Button
              onClick={() => {
                handleDialogClose()
                handleNextClick()
              }}
              variant="contained"
              color="primary"
            >
              次の問題へ
            </Button>
          )}
        </Box>
      </DialogActions>
    </Dialog>
  )

  const containerSx = {
    display: 'flex',
    height: '100dvh',
    minHeight: '100dvh',
    maxHeight: '100dvh',
    overflow: 'hidden',
    '@supports not (height: 100dvh)': {
      height: '100vh',
      minHeight: '100vh',
      maxHeight: '100vh',
    },
  }

  const renderLayout = () => {
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

    return (
      <Box sx={containerSx}>
        {renderVerticalBarLeft()}
        {renderIframe()}
      </Box>
    )
  }

  return (
    <>
      {renderLayout()}
      {renderScoringDialog()}
    </>
  )
}
