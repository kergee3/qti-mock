'use client'

import { Box, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, CircularProgress } from '@mui/material'
import type { ItemInfo, FontOption, QuestionBarPosition } from '@/types/test'
import type { AiChoiceEntry, AiChoiceSummary } from '@/types/ai-choice'
import { usePlatformDetection } from '@/hooks/usePlatformDetection'

interface AiChoiceInitialScreenProps {
  entries: AiChoiceEntry[]
  selectedEntry: AiChoiceEntry | null
  onEntrySelect: (entry: AiChoiceEntry) => void
  items: ItemInfo[]
  isLoadingItems: boolean
  summary: AiChoiceSummary | null
  selectedFont: FontOption
  onFontChange: (font: FontOption) => void
  questionBarPosition: QuestionBarPosition
  onQuestionBarPositionChange: (position: QuestionBarPosition) => void
  onStart: () => void
}

/** 文字列を指定文字数で切り詰める */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

/** 学習指導要領コードからLOD URLを生成する */
function getCosLodUrl(cosCode: string): string {
  // コードの先頭3文字と残り（末尾の0を除く）からURLを構築
  // 例: 8220263100000000 → https://jp-cos.github.io/822/0263100000000
  const prefix = cosCode.slice(0, 3)
  const suffix = cosCode.slice(3)
  return `https://jp-cos.github.io/${prefix}/${suffix}`
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
 * AI生成問題 初期画面コンポーネント
 * - 問題集選択リストボックス
 * - 問題一覧テーブル
 * - フォント選択
 * - はじめるボタン
 */
export function AiChoiceInitialScreen({
  entries,
  selectedEntry,
  onEntrySelect,
  items,
  isLoadingItems,
  summary,
  selectedFont,
  onFontChange,
  questionBarPosition,
  onQuestionBarPositionChange,
  onStart,
}: AiChoiceInitialScreenProps) {
  const { isWindows } = usePlatformDetection()

  // Windows環境ではUDデジタル教科書体を追加
  const fontLabels: Partial<Record<FontOption, string>> = isWindows
    ? { ...baseFontLabels, 'ud-digikyo': 'UDデジタル教科書体' }
    : baseFontLabels

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', p: 2 }}>
      {/* 説明文 */}
      <Box sx={{ mb: 1.5, color: '#333', fontSize: '0.95rem', lineHeight: 1.4 }}>
        生成AIが学習指導要領とその解説を元に作成した4択問題集を解いてみよう。
      </Box>

      {/* ヘッダー: タイトル + 問題集選択 */}
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
        <Box
          component="select"
          value={selectedEntry?.summaryUrl || ''}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
            const entry = entries.find(en => en.summaryUrl === e.target.value)
            if (entry) onEntrySelect(entry)
          }}
          sx={{
            padding: '8px 12px',
            fontSize: '1rem',
            borderRadius: '4px',
            border: '1px solid #333',
            backgroundColor: '#fff',
            cursor: 'pointer',
            minWidth: 200,
          }}
        >
          <option value="">選択してください</option>
          {entries.map((entry) => (
            <option key={entry.summaryUrl} value={entry.summaryUrl}>
              {entry.grade}{entry.subject}_{entry.field}
            </option>
          ))}
        </Box>
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
          disabled={items.length === 0 || isLoadingItems}
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

      {/* メタデータ表示 */}
      {summary && (
        <Box
          sx={{
            mb: 1,
            p: 1,
            backgroundColor: '#f5f5f5',
            borderRadius: '4px',
            fontSize: '0.9rem',
            lineHeight: 1.3,
          }}
        >
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 0.5, sm: 1.5 } }}>
            <Box><strong>教科:</strong> {summary.metadata.subject}</Box>
            <Box><strong>学年:</strong> {summary.metadata.grade}</Box>
            <Box><strong>学習指導要領コード:</strong> <a href={getCosLodUrl(summary.metadata.cos_code)} target="_blank" rel="noopener noreferrer" style={{ color: '#1976d2' }}>{summary.metadata.cos_code}</a></Box>
            <Box><strong>内容:</strong> {truncateText(summary.metadata.description, 20)}</Box>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 0.5, sm: 1.5 }, mt: 0.5 }}>
            <Box><strong>問題数:</strong> {summary.total_questions}</Box>
            <Box><strong>生成AIモデル:</strong> {summary.model}</Box>
          </Box>
        </Box>
      )}

      {/* 問題一覧テーブル */}
      {isLoadingItems ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : items.length > 0 ? (
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #ddd' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: '#000' }}>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold', width: { xs: 40, sm: 60 }, px: { xs: 1, sm: 2 }, py: { xs: 0.5, sm: 1 } }}>問</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold', px: { xs: 1, sm: 2 }, py: { xs: 0.5, sm: 1 } }}>タイトル</TableCell>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : selectedEntry ? (
        <Box sx={{ textAlign: 'center', py: 4, color: '#666' }}>
          問題が見つかりませんでした
        </Box>
      ) : (
        <Box sx={{ textAlign: 'center', py: 4, color: '#666' }}>
          問題集を選択してください
        </Box>
      )}
    </Box>
  )
}
