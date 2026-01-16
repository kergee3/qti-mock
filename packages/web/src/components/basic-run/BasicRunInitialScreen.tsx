'use client'

import { Box, Button, ButtonGroup, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material'
import type { ItemInfo, FontOption, QuestionBarPosition, WritingDirection } from '@/types/test'
import { usePlatformDetection } from '@/hooks/usePlatformDetection'

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

/** フォントオプションのラベル（基本） */
const baseFontLabels: Record<Exclude<FontOption, 'ud-digikyo'>, string> = {
  'system': 'システム既定',
  'noto-sans-jp': 'Noto Sans JP',
  'noto-serif-jp': 'Noto Serif JP',
  'biz-udpgothic': 'BIZ UDPGothic',
  'biz-udpmincho': 'BIZ UDPMincho',
  'source-han-sans': '源ノ角ゴシック',
  'kosugi-maru': 'Kosugi Maru',
}

/** 問題バー位置のラベル */
const questionBarLabels: Partial<Record<QuestionBarPosition, string>> = {
  'auto': '自動',
  'left': '左-縦並び',
  'right': '右-縦並び',
  'top-ltr': '上-横並び(左から)',
  'top-rtl': '上-横並び(右から)',
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
  const { isWindows } = usePlatformDetection()

  // Windows環境ではUDデジタル教科書体を追加
  const fontLabels: Partial<Record<FontOption, string>> = isWindows
    ? { ...baseFontLabels, 'ud-digikyo': 'UDデジタル教科書体' }
    : baseFontLabels

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', p: 3 }}>
      {/* 説明文 */}
      <Box sx={{ mb: 3, color: '#333', fontSize: '0.95rem', lineHeight: 1.6 }}>
        横書き用と縦書き用に作成されたQTI3.0形式の基本的な問題集を用意しました。問題集を選んではじめましょう。
      </Box>

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
            color: '#333',
          }}
        >
          問題集の選択:
        </Box>
        <ButtonGroup variant="outlined" size="medium">
          <Button
            variant={writingDirection === 'horizontal' ? 'contained' : 'outlined'}
            onClick={() => onWritingDirectionChange('horizontal')}
            sx={{
              fontSize: '1rem',
              fontWeight: 'normal',
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
              fontWeight: 'normal',
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
            fontWeight: 'normal',
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
          <Box component="label" sx={{ fontSize: '0.9rem' }}>
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
          <Box component="label" sx={{ fontSize: '0.9rem' }}>
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
