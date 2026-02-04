'use client'

import { Box, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Tooltip } from '@mui/material'
import type { ItemInfo, ItemResult } from '@/types/test'
import { renderRubyText } from '@/utils/ruby'
import { useSettings } from '@/contexts/SettingsContext'

interface BasicRunResultsProps {
  items: ItemInfo[]
  results: Map<string, ItemResult>
  onRestart: () => void
}

/**
 * Basic Run 結果画面コンポーネント
 * - スコアサマリー
 * - 問題別結果テーブル
 * - もう一度ボタン
 */
export function BasicRunResults({
  items,
  results,
  onRestart,
}: BasicRunResultsProps) {
  const { rubyEnabled } = useSettings()

  // 集計（resultsのキーはXMLのidentifier属性）
  const allResults = items.map(item => results.get(item.identifier))

  // 採点済み（自動採点）の結果
  const scoredResults = allResults.filter(r => r?.answered && !r.isExternalScored)
  const scoredTotalScore = scoredResults.reduce((sum, r) => sum + (r?.score ?? 0), 0)
  const scoredTotalMaxScore = scoredResults.reduce((sum, r) => sum + (r?.maxScore ?? 1), 0)

  // 未採点（外部採点）の数
  const externalScoredCount = allResults.filter(r => r?.answered && r.isExternalScored).length

  // 正答率
  const percentage = scoredTotalMaxScore > 0
    ? Math.round((scoredTotalScore / scoredTotalMaxScore) * 100)
    : 0

  // 結果の表示テキストを取得
  const getResultDisplay = (result: ItemResult | undefined) => {
    if (!result || !result.answered) {
      return { text: '回答なし', color: '#666', style: 'italic' as const }
    }
    if (result.isExternalScored) {
      return { text: '未採点', color: '#ff9800', style: 'normal' as const }
    }
    const isCorrect = result.score > 0
    return {
      text: `${result.score}/${result.maxScore} ${isCorrect ? '\u25CB' : '\u00D7'}`,
      color: isCorrect ? '#4caf50' : '#f44336',
      style: 'normal' as const,
    }
  }

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', p: 2 }}>
      {/* スコアサマリー */}
      <Box sx={{ textAlign: 'center', mb: 2 }}>
        {/* <Box component="h2" sx={{ fontSize: '1.5rem', mb: 2, color: '#333' }}>
          Basic Run 結果
        </Box> */}

        {/* 点数 */}
        <Box sx={{ fontSize: '2.5rem', mb: 1 }}>
          <Box component="span" sx={{ color: '#1976d2', fontWeight: 'bold' }}>
            {scoredTotalScore}
          </Box>
          <Box component="span" sx={{ color: '#666', mx: 0.5 }}>/</Box>
          <Box component="span" sx={{ color: '#666' }}>
            {scoredTotalMaxScore}
          </Box>
          <Box component="span" sx={{ color: '#666', fontSize: '1.5rem', ml: 0.5 }}>点</Box>
        </Box>

        {/* 正答率 */}
        <Box sx={{ fontSize: '1.2rem', color: '#666', mb: 1 }}>
          正答率: {percentage}%
        </Box>

        {/* 未採点数 */}
        {externalScoredCount > 0 && (
          <Box sx={{ fontSize: '1rem', color: '#ff9800' }}>
            ※ 未採点: {externalScoredCount}問
          </Box>
        )}
      </Box>

      {/* 結果テーブル */}
      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #ddd', mb: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#000' }}>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold', width: { xs: 35, sm: 60 }, px: { xs: 0.5, sm: 2 }, py: { xs: 0.5, sm: 1 } }}>問</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold', px: { xs: 0.5, sm: 2 }, py: { xs: 0.5, sm: 1 } }}>タイトル</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold', width: { xs: 80, sm: 225 }, px: { xs: 0.5, sm: 2 }, py: { xs: 0.5, sm: 1 }, display: { xs: 'none', sm: 'table-cell' } }}>回答</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold', width: { xs: 45, sm: 80 }, textAlign: 'center', px: { xs: 0.5, sm: 2 }, py: { xs: 0.5, sm: 1 } }}>時間</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold', width: { xs: 60, sm: 100 }, px: { xs: 0.5, sm: 2 }, py: { xs: 0.5, sm: 1 } }}>結果</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item, index) => {
              const result = results.get(item.identifier)
              const display = getResultDisplay(result)

              return (
                <TableRow
                  key={item.id}
                  sx={{
                    backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9',
                  }}
                >
                  <TableCell sx={{ textAlign: 'center', px: { xs: 0.5, sm: 2 }, py: { xs: 0.5, sm: 1 } }}>{index + 1}</TableCell>
                  <TableCell sx={{ px: { xs: 0.5, sm: 2 }, py: { xs: 0.5, sm: 1 }, fontSize: { xs: '0.8rem', sm: '1rem' } }}>{renderRubyText(item.title)}</TableCell>
                  <TableCell sx={{ color: '#666', maxWidth: { xs: 80, sm: 225 }, px: { xs: 0.5, sm: 2 }, py: { xs: 0.5, sm: 1 }, display: { xs: 'none', sm: 'table-cell' } }}>
                    {result?.response ? (
                      <Tooltip title={result.response} arrow placement="top">
                        <Box
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            cursor: 'default',
                          }}
                        >
                          {result.response}
                        </Box>
                      </Tooltip>
                    ) : (
                      result?.answered ? '-' : ''
                    )}
                  </TableCell>
                  <TableCell sx={{ textAlign: 'center', color: '#666', px: { xs: 0.5, sm: 2 }, py: { xs: 0.5, sm: 1 }, fontSize: { xs: '0.8rem', sm: '1rem' } }}>
                    {result?.duration != null ? result.duration : '-'}
                  </TableCell>
                  <TableCell
                    sx={{
                      color: display.color,
                      fontWeight: display.style === 'italic' ? 'normal' : 'bold',
                      fontStyle: display.style,
                      px: { xs: 0.5, sm: 2 },
                      py: { xs: 0.5, sm: 1 },
                      fontSize: { xs: '0.8rem', sm: '1rem' },
                    }}
                  >
                    {display.text}
                  </TableCell>
                </TableRow>
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
    </Box>
  )
}
