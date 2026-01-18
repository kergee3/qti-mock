'use client'

import { useState, useCallback } from 'react'
import { Box, Button, ButtonGroup, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Tooltip, Snackbar } from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CheckIcon from '@mui/icons-material/Check'
import ConstructionOutlinedIcon from '@mui/icons-material/ConstructionOutlined'
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
  'system': '既定フォント',
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
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null)
  const [snackbarOpen, setSnackbarOpen] = useState(false)

  // Windows環境ではUDデジタル教科書体を追加
  const fontLabels: Partial<Record<FontOption, string>> = isWindows
    ? { ...baseFontLabels, 'ud-digikyo': 'UDデジタル教科書体' }
    : baseFontLabels

  // XMLファイルの内容をクリップボードにコピー
  const handleCopyXml = useCallback(async (item: ItemInfo) => {
    const subDir = writingDirection === 'vertical' ? 'items-v' : 'items-h'
    const xmlUrl = `/${subDir}/${item.fileName}`

    try {
      const response = await fetch(xmlUrl)
      if (!response.ok) {
        throw new Error('XMLファイルの取得に失敗しました')
      }
      const xmlContent = await response.text()
      await navigator.clipboard.writeText(xmlContent)
      setCopiedItemId(item.id)
      setSnackbarOpen(true)

      // 2秒後にコピー状態をリセット
      setTimeout(() => {
        setCopiedItemId(null)
      }, 2000)
    } catch (error) {
      console.error('コピーに失敗しました:', error)
    }
  }, [writingDirection])

  // Playgroundで問題を開く
  const handleOpenInPlayground = useCallback((item: ItemInfo) => {
    const subDir = writingDirection === 'vertical' ? 'items-v' : 'items-h'
    // ファイル名の先頭部分（番号）を取得
    const startswith = item.fileName.split('-')[0]
    const playgroundUrl = `/playground?set=${subDir}&startswith=${startswith}`
    window.open(playgroundUrl, '_blank')
  }, [writingDirection])

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', p: 2 }}>
      {/* 説明文 */}
      <Box sx={{ mb: 1.5, color: '#333', fontSize: '0.95rem', lineHeight: 1.4 }}>
        横書き用と縦書き用に作成されたQTI3.0の基本的な問題集を選んで解いてみよう。
      </Box>

      {/* ヘッダー: タイトル + 書字方向選択 */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          mb: 1,
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
          gap: { xs: 1, sm: 0 },
          mb: 1,
        }}
      >
        {/* はじめるボタン */}
        <Button
          variant="outlined"
          size="large"
          onClick={onStart}
          disabled={items.length === 0}
          startIcon={<PlayArrowIcon />}
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
            問題でのフォント：
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
                <TableCell sx={{ px: { xs: 1, sm: 2 }, py: { xs: 0.5, sm: 1 }, fontSize: { xs: '0.85rem', sm: '1rem' } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {item.title}
                    <Tooltip title="XMLをコピー">
                      <IconButton
                        size="small"
                        onClick={() => handleCopyXml(item)}
                        sx={{
                          p: 0.25,
                          color: copiedItemId === item.id ? '#4caf50' : '#666',
                          '&:hover': { color: copiedItemId === item.id ? '#4caf50' : '#333' },
                        }}
                      >
                        {copiedItemId === item.id ? (
                          <CheckIcon sx={{ fontSize: '1rem' }} />
                        ) : (
                          <ContentCopyIcon sx={{ fontSize: '1rem' }} />
                        )}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Playgroundで開く">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenInPlayground(item)}
                        sx={{
                          p: 0.25,
                          color: '#666',
                          '&:hover': { color: '#333' },
                        }}
                      >
                        <ConstructionOutlinedIcon sx={{ fontSize: '1rem' }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
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

      {/* コピー完了通知 */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={2000}
        onClose={() => setSnackbarOpen(false)}
        message="XMLをクリップボードにコピーしました"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  )
}
