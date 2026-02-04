'use client'

import { useState, Fragment } from 'react'
import { Box, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Typography, Collapse, IconButton } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import type { ItemInfo, ItemResult } from '@/types/test'
import type { AiTextSummary, AiScoringResult } from '@/types/ai-text'
import { renderRubyText } from '@/utils/ruby'
import { useSettings } from '@/contexts/SettingsContext'

interface AiTextResultsProps {
  items: ItemInfo[]
  results: Map<string, ItemResult>
  scoringResults: Map<string, AiScoringResult>
  summary: AiTextSummary | null
  onRestart: () => void
}

/**
 * AI記述式採点 結果画面コンポーネント
 * - スコアサマリー（観点別）
 * - 問題別結果テーブル
 * - 詳細フィードバック表示
 */
export function AiTextResults({
  items,
  results,
  scoringResults,
  summary,
  onRestart,
}: AiTextResultsProps) {
  const { rubyEnabled } = useSettings()

  // 詳細ダイアログの状態
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null)

  // 展開状態（各問題の詳細表示）
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  // 集計
  const scoredItems = items.filter(item => {
    const sr = scoringResults.get(item.identifier)
    return sr?.isScored && sr.scoringResponse
  })

  // 総合スコア
  const totalScore = scoredItems.reduce((sum, item) => {
    const sr = scoringResults.get(item.identifier)
    return sum + (sr?.scoringResponse?.score || 0)
  }, 0)

  const totalMaxScore = scoredItems.length * 10

  // 観点別スコア
  const aspectTotals = {
    understanding: { score: 0, maxScore: 0 },
    expression: { score: 0, maxScore: 0 },
    accuracy: { score: 0, maxScore: 0 },
  }

  scoredItems.forEach(item => {
    const sr = scoringResults.get(item.identifier)
    if (sr?.scoringResponse?.breakdown) {
      const b = sr.scoringResponse.breakdown
      aspectTotals.understanding.score += b.understanding.score
      aspectTotals.understanding.maxScore += b.understanding.maxScore
      aspectTotals.expression.score += b.expression.score
      aspectTotals.expression.maxScore += b.expression.maxScore
      aspectTotals.accuracy.score += b.accuracy.score
      aspectTotals.accuracy.maxScore += b.accuracy.maxScore
    }
  })

  // 未採点数
  const unscoredCount = items.length - scoredItems.length

  // 正答率
  const percentage = totalMaxScore > 0
    ? Math.round((totalScore / totalMaxScore) * 100)
    : 0

  // 結果の表示テキストを取得
  const getResultDisplay = (itemId: string) => {
    const sr = scoringResults.get(itemId)
    const result = results.get(itemId)

    if (!result?.answered) {
      return { text: '回答なし', color: '#666', style: 'italic' as const }
    }

    if (!sr?.isScored || !sr.scoringResponse) {
      return { text: '未採点', color: '#ff9800', style: 'normal' as const }
    }

    const score = sr.scoringResponse.score
    const maxScore = sr.scoringResponse.maxScore

    // スコアに応じた色
    let color = '#f44336'  // 赤: 40%未満
    if (score >= maxScore * 0.7) color = '#4caf50'  // 緑: 70%以上
    else if (score >= maxScore * 0.4) color = '#ff9800'  // オレンジ: 40-70%

    return {
      text: `${score}/${maxScore}点`,
      color,
      style: 'normal' as const,
    }
  }

  // 展開/折りたたみ切り替え
  const toggleExpand = (itemId: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev)
      if (next.has(itemId)) {
        next.delete(itemId)
      } else {
        next.add(itemId)
      }
      return next
    })
  }

  // 詳細ダイアログを開く
  const openDetailDialog = (index: number) => {
    setSelectedItemIndex(index)
    setDetailDialogOpen(true)
  }

  const selectedItem = selectedItemIndex !== null ? items[selectedItemIndex] : null
  const selectedScoringResult = selectedItem ? scoringResults.get(selectedItem.identifier) : null
  const selectedResult = selectedItem ? results.get(selectedItem.identifier) : null

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 2 }}>
      {/* スコアサマリー */}
      <Box sx={{ textAlign: 'center', mb: 2 }}>
        {/* 総合点数 */}
        <Box sx={{ fontSize: '2.5rem', mb: 1 }}>
          <Box component="span" sx={{ color: '#1976d2', fontWeight: 'bold' }}>
            {totalScore}
          </Box>
          <Box component="span" sx={{ color: '#666', mx: 0.5 }}>/</Box>
          <Box component="span" sx={{ color: '#666' }}>
            {totalMaxScore}
          </Box>
          <Box component="span" sx={{ color: '#666', fontSize: '1.5rem', ml: 0.5 }}>点</Box>
        </Box>

        {/* 正答率 */}
        <Box sx={{ fontSize: '1.2rem', color: '#666', mb: 1 }}>
          達成率: {percentage}%
        </Box>

        {/* 未採点数 */}
        {unscoredCount > 0 && (
          <Box sx={{ fontSize: '1rem', color: '#ff9800', mb: 1 }}>
            ※ 未採点: {unscoredCount}問
          </Box>
        )}

        {/* 観点別スコア */}
        {scoredItems.length > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 2 }}>
            <Box sx={{ textAlign: 'center', p: 1.5, backgroundColor: '#e3f2fd', borderRadius: 1, minWidth: 100 }}>
              <Typography variant="caption" color="text.secondary">理解力</Typography>
              <Typography variant="h6">{aspectTotals.understanding.score}/{aspectTotals.understanding.maxScore}</Typography>
            </Box>
            <Box sx={{ textAlign: 'center', p: 1.5, backgroundColor: '#e8f5e9', borderRadius: 1, minWidth: 100 }}>
              <Typography variant="caption" color="text.secondary">表現力</Typography>
              <Typography variant="h6">{aspectTotals.expression.score}/{aspectTotals.expression.maxScore}</Typography>
            </Box>
            <Box sx={{ textAlign: 'center', p: 1.5, backgroundColor: '#fff3e0', borderRadius: 1, minWidth: 100 }}>
              <Typography variant="caption" color="text.secondary">正確性</Typography>
              <Typography variant="h6">{aspectTotals.accuracy.score}/{aspectTotals.accuracy.maxScore}</Typography>
            </Box>
          </Box>
        )}
      </Box>

      {/* 結果テーブル */}
      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #ddd', mb: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#000' }}>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold', width: 40, px: 1, py: 1 }}>問</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold', px: 1, py: 1 }}>タイトル</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold', width: 80, textAlign: 'center', px: 1, py: 1 }}>スコア</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold', width: 60, textAlign: 'center', px: 1, py: 1 }}>詳細</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item, index) => {
              const sr = scoringResults.get(item.identifier)
              const display = getResultDisplay(item.identifier)
              const isExpanded = expandedItems.has(item.identifier)

              return (
                <Fragment key={item.id}>
                  <TableRow
                    sx={{
                      backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9',
                      cursor: sr?.isScored ? 'pointer' : 'default',
                    }}
                    onClick={() => sr?.isScored && toggleExpand(item.identifier)}
                  >
                    <TableCell sx={{ textAlign: 'center', px: 1, py: 1 }}>{index + 1}</TableCell>
                    <TableCell sx={{ px: 1, py: 1 }}>{renderRubyText(item.title)}</TableCell>
                    <TableCell
                      sx={{
                        color: display.color,
                        fontWeight: display.style === 'italic' ? 'normal' : 'bold',
                        fontStyle: display.style,
                        textAlign: 'center',
                        px: 1,
                        py: 1,
                      }}
                    >
                      {display.text}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center', px: 1, py: 1 }}>
                      {sr?.isScored && (
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); toggleExpand(item.identifier) }}>
                          {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                  {/* 展開時の詳細表示 */}
                  {sr?.isScored && sr.scoringResponse && (
                    <TableRow>
                      <TableCell colSpan={4} sx={{ p: 0, borderBottom: isExpanded ? '1px solid #ddd' : 'none' }}>
                        <Collapse in={isExpanded}>
                          <Box sx={{ p: 2.5, backgroundColor: '#fafafa' }}>
                            {/* 観点別スコア */}
                            <Box sx={{ display: 'flex', gap: 3, mb: 2.5, flexWrap: 'wrap' }}>
                              <Box sx={{ flex: 1, minWidth: 200 }}>
                                <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 'bold', mb: 0.5 }}>理解力</Typography>
                                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                                  {sr.scoringResponse.breakdown.understanding.score}/{sr.scoringResponse.breakdown.understanding.maxScore}
                                </Typography>
                                <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                                  {sr.scoringResponse.breakdown.understanding.feedback}
                                </Typography>
                              </Box>
                              <Box sx={{ flex: 1, minWidth: 200 }}>
                                <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 'bold', mb: 0.5 }}>表現力</Typography>
                                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                                  {sr.scoringResponse.breakdown.expression.score}/{sr.scoringResponse.breakdown.expression.maxScore}
                                </Typography>
                                <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                                  {sr.scoringResponse.breakdown.expression.feedback}
                                </Typography>
                              </Box>
                              <Box sx={{ flex: 1, minWidth: 200 }}>
                                <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 'bold', mb: 0.5 }}>正確性</Typography>
                                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                                  {sr.scoringResponse.breakdown.accuracy.score}/{sr.scoringResponse.breakdown.accuracy.maxScore}
                                </Typography>
                                <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                                  {sr.scoringResponse.breakdown.accuracy.feedback}
                                </Typography>
                              </Box>
                            </Box>
                            {/* 総合フィードバック */}
                            <Box sx={{ mb: 1.5 }}>
                              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 0.5 }}>フィードバック</Typography>
                              <Typography variant="body1" sx={{ lineHeight: 1.7 }}>{sr.scoringResponse.overallFeedback}</Typography>
                            </Box>
                            {/* 詳細ボタン */}
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => openDetailDialog(index)}
                            >
                              詳細を見る
                            </Button>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* もう一度ボタン */}
      <Box sx={{ textAlign: 'center' }}>
        <Button
          variant="contained"
          size="large"
          onClick={onRestart}
          sx={{
            px: 5,
            py: 1.5,
            fontSize: '1.1rem',
            backgroundColor: '#1976d2',
            '&:hover': {
              backgroundColor: '#1565c0',
            },
          }}
        >
          {rubyEnabled ? renderRubyText('もう{一度|いちど}') : 'もう一度'}
        </Button>
      </Box>

      {/* 詳細ダイアログ */}
      <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ backgroundColor: '#1976d2', color: '#fff', fontSize: '1.3rem' }}>
          {selectedItem?.title || '詳細'}
        </DialogTitle>
        <DialogContent sx={{ pt: 3, pb: 2 }}>
          {selectedItem && selectedScoringResult?.isScored && selectedScoringResult.scoringResponse && (
            <Box>
              {/* 問題文 */}
              {summary && selectedItemIndex !== null && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1, fontSize: '1.1rem' }}>問題文</Typography>
                  <Typography variant="body1" sx={{ backgroundColor: '#f5f5f5', p: 2, borderRadius: 1, lineHeight: 1.8 }}>
                    {summary.questions[selectedItemIndex]?.question_text}
                  </Typography>
                </Box>
              )}

              {/* 回答内容 */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1, fontSize: '1.1rem' }}>あなたの回答</Typography>
                <Typography variant="body1" sx={{ backgroundColor: '#e3f2fd', p: 2, borderRadius: 1, lineHeight: 1.8 }}>
                  {selectedResult?.response || '回答なし'}
                </Typography>
              </Box>

              {/* 模範解答 */}
              {summary && selectedItemIndex !== null && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1, fontSize: '1.1rem' }}>模範解答</Typography>
                  <Typography variant="body1" sx={{ backgroundColor: '#e8f5e9', p: 2, borderRadius: 1, lineHeight: 1.8 }}>
                    {summary.questions[selectedItemIndex]?.model_answer}
                  </Typography>
                </Box>
              )}

              {/* スコア */}
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                  {selectedScoringResult.scoringResponse.score} / {selectedScoringResult.scoringResponse.maxScore}
                </Typography>
                <Typography variant="body1" color="text.secondary">点</Typography>
              </Box>

              {/* 観点別スコア */}
              <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', mb: 3, flexWrap: 'wrap' }}>
                {Object.entries(selectedScoringResult.scoringResponse.breakdown).map(([key, value]) => (
                  <Box key={key} sx={{ textAlign: 'center', p: 2, backgroundColor: '#f5f5f5', borderRadius: 1, minWidth: 200, flex: 1 }}>
                    <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                      {key === 'understanding' ? '理解力' : key === 'expression' ? '表現力' : '正確性'}
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }}>{value.score}/{value.maxScore}</Typography>
                    <Typography variant="body1" sx={{ lineHeight: 1.7 }}>
                      {value.feedback}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {/* 総合フィードバック */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1, fontSize: '1.1rem' }}>総合フィードバック</Typography>
                <Typography variant="body1" sx={{ backgroundColor: '#fff3e0', p: 2, borderRadius: 1, lineHeight: 1.8 }}>
                  {selectedScoringResult.scoringResponse.overallFeedback}
                </Typography>
              </Box>

              {/* 改善提案 */}
              {selectedScoringResult.scoringResponse.suggestions && selectedScoringResult.scoringResponse.suggestions.length > 0 && (
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1, fontSize: '1.1rem' }}>改善提案</Typography>
                  <Box component="ul" sx={{ m: 0, pl: 3 }}>
                    {selectedScoringResult.scoringResponse.suggestions.map((suggestion, i) => (
                      <Box component="li" key={i} sx={{ mb: 0.75, fontSize: '1rem', lineHeight: 1.7 }}>{suggestion}</Box>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDetailDialogOpen(false)} color="primary" size="large">
            閉じる
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
