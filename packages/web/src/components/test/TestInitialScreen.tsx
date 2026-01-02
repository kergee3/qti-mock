'use client'

import { Box, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material'
import type { ItemInfo, FontOption } from '@/types/test'

interface TestInitialScreenProps {
  items: ItemInfo[]
  selectedFont: FontOption
  onFontChange: (font: FontOption) => void
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

/**
 * テスト初期画面コンポーネント
 * - 問題一覧テーブル
 * - フォント選択
 * - はじめるボタン
 */
export function TestInitialScreen({
  items,
  selectedFont,
  onFontChange,
  onStart,
}: TestInitialScreenProps) {
  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', p: 3 }}>
      {/* ヘッダー */}
      <Box
        component="h1"
        sx={{
          fontSize: '1.8rem',
          fontWeight: 'bold',
          mb: 3,
          color: '#333',
        }}
      >
        TEST ページ: 初期画面
      </Box>

      {/* コントロールエリア */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        {/* はじめるボタン */}
        <Button
          variant="outlined"
          size="large"
          onClick={onStart}
          disabled={items.length === 0}
          sx={{
            px: 4,
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
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#000' }}>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold', width: 60 }}>問</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>タイトル</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>インタラクション</TableCell>
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
                <TableCell sx={{ textAlign: 'center' }}>{index + 1}</TableCell>
                <TableCell>{item.title}</TableCell>
                <TableCell sx={{ color: '#666' }}>{item.type}</TableCell>
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
