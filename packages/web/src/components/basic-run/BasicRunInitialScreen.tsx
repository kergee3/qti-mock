'use client'

import { Box, Button, ButtonGroup, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material'
import type { ItemInfo, FontOption, QuestionBarPosition, WritingDirection } from '@/types/test'

interface BasicRunInitialScreenProps {
  items: ItemInfo[]
  writingDirection: WritingDirection
  onWritingDirectionChange: (dir: WritingDirection) => void
  selectedFont: FontOption
  onFontChange: (font: FontOption) => void
  questionBarPosition: QuestionBarPosition
  onQuestionBarPositionChange: (position: QuestionBarPosition) => void
  onStart: () => void
}

/** フォントオプションのラベル */
const fontLabels: Record<FontOption, string> = {
  'system': 'システム既定',
  'noto-sans-jp': 'Noto Sans JP',
  'noto-serif-jp': 'Noto Serif JP',
  'biz-udpgothic': 'BIZ UDPGothic',
  'biz-udpmincho': 'BIZ UDPMincho',
  'source-han-sans': '源ノ角ゴシック',
  'kosugi-maru': 'Kosugi Maru',
}

/** 問題バー位置のラベル */
const questionBarLabels: Record<QuestionBarPosition, string> = {
  'auto': '自動',
  'left': '左-縦並び',
  'right': '右-縦並び',
  'top-ltr': '上-横並び(左から)',
  'top-rtl': '上-横並び(右から)',
  'bottom-ltr': '下-横並び(左から)',
  'bottom-rtl': '下-横並び(右から)',
}

/**
 * Basic Run 初期画面コンポーネント
 * - 問題一覧テーブル
 * - フォント選択
 * - はじめるボタン
 */
export function BasicRunInitialScreen({
  items,
  writingDirection,
  onWritingDirectionChange,
  selectedFont,
  onFontChange,
  questionBarPosition,
  onQuestionBarPositionChange,
  onStart,
}: BasicRunInitialScreenProps) {
  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', p: 3 }}>
      {/* ヘッダー: タイトル + 書字方向選択 */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          mb: 1.5,
        }}
      >
        <Box
          component="span"
          sx={{
            fontSize: '1rem',
            fontWeight: 'bold',
            color: '#333',
          }}
        >
          問題選択:
        </Box>
        <ButtonGroup variant="outlined" size="medium">
          <Button
            variant={writingDirection === 'horizontal' ? 'contained' : 'outlined'}
            onClick={() => onWritingDirectionChange('horizontal')}
            sx={{
              fontSize: '1rem',
              fontWeight: 'bold',
              px: 1.5,
              py: 0.5,
              color: writingDirection === 'horizontal' ? '#fff' : '#333',
              backgroundColor: writingDirection === 'horizontal' ? '#333' : 'transparent',
              borderColor: '#333',
              '&:hover': {
                backgroundColor: writingDirection === 'horizontal' ? '#555' : 'rgba(0,0,0,0.04)',
                borderColor: '#333',
              },
            }}
          >
            横書き
          </Button>
          <Button
            variant={writingDirection === 'vertical' ? 'contained' : 'outlined'}
            onClick={() => onWritingDirectionChange('vertical')}
            sx={{
              fontSize: '1rem',
              fontWeight: 'bold',
              px: 1.5,
              py: 0.5,
              color: writingDirection === 'vertical' ? '#fff' : '#333',
              backgroundColor: writingDirection === 'vertical' ? '#333' : 'transparent',
              borderColor: '#333',
              '&:hover': {
                backgroundColor: writingDirection === 'vertical' ? '#555' : 'rgba(0,0,0,0.04)',
                borderColor: '#333',
              },
            }}
          >
            縦書き
          </Button>
        </ButtonGroup>
      </Box>

      {/* コントロールエリア */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: { xs: 'flex-start', sm: 'space-between' },
          alignItems: { xs: 'stretch', sm: 'center' },
          gap: { xs: 1.5, sm: 0 },
          mb: 1.5,
        }}
      >
        {/* はじめるボタン */}
        <Button
          variant="outlined"
          size="large"
          onClick={onStart}
          disabled={items.length === 0}
          sx={{
            px: 1,
            py: 1,
            fontSize: '1rem',
            borderColor: '#333',
            color: '#333',
            '&:hover': {
              borderColor: '#000',
              backgroundColor: 'rgba(0,0,0,0.04)',
            },
          }}
        >
          はじめる
        </Button>

        {/* 問題バー位置選択 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box component="label" sx={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
            問題バー：
          </Box>
          <Box
            component="select"
            value={questionBarPosition}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              onQuestionBarPositionChange(e.target.value as QuestionBarPosition)
            }
            sx={{
              padding: '8px 12px',
              fontSize: '0.9rem',
              borderRadius: '4px',
              border: '1px solid #ccc',
              backgroundColor: '#fff',
              cursor: 'pointer',
              flex: 1,
            }}
          >
            {Object.entries(questionBarLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Box>
        </Box>

        {/* フォント選択 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box component="label" sx={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
            フォント：
          </Box>
          <Box
            component="select"
            value={selectedFont}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              onFontChange(e.target.value as FontOption)
            }
            sx={{
              padding: '8px 12px',
              fontSize: '0.9rem',
              borderRadius: '4px',
              border: '1px solid #ccc',
              backgroundColor: '#fff',
              cursor: 'pointer',
              flex: 1,
            }}
          >
            {Object.entries(fontLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Box>
        </Box>
      </Box>

      {/* 問題一覧テーブル */}
      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #ddd' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#000' }}>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold', width: { xs: 40, sm: 60 }, px: { xs: 1, sm: 2 }, py: { xs: 0.5, sm: 1 } }}>問</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold', px: { xs: 1, sm: 2 }, py: { xs: 0.5, sm: 1 } }}>タイトル</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold', px: { xs: 1, sm: 2 }, py: { xs: 0.5, sm: 1 } }}>Interaction</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item, index) => (
              <TableRow
                key={item.id}
                sx={{
                  backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9',
                  '&:hover': { backgroundColor: '#f0f0f0' },
                }}
              >
                <TableCell sx={{ textAlign: 'center', px: { xs: 1, sm: 2 }, py: { xs: 0.5, sm: 1 } }}>{index + 1}</TableCell>
                <TableCell sx={{ px: { xs: 1, sm: 2 }, py: { xs: 0.5, sm: 1 }, fontSize: { xs: '0.85rem', sm: '1rem' } }}>{item.title}</TableCell>
                <TableCell sx={{ color: '#666', whiteSpace: 'pre-line', px: { xs: 1, sm: 2 }, py: { xs: 0.5, sm: 1 }, fontSize: { xs: '0.85rem', sm: '1rem' } }}>
                  {item.type.split('\n').map(t => t.replace(/Interaction$/, '')).join('\n')}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 問題がない場合 */}
      {items.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4, color: '#666' }}>
          問題が見つかりませんでした
        </Box>
      )}
    </Box>
  )
}
