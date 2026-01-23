'use client'

import { useState, useCallback } from 'react'
import { Box, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, CircularProgress, IconButton, Tooltip, Snackbar } from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CheckIcon from '@mui/icons-material/Check'
import ConstructionOutlinedIcon from '@mui/icons-material/ConstructionOutlined'
import type { ItemInfo, FontOption } from '@/types/test'
import type { AiTextEntry, AiTextSummary } from '@/types/ai-text'
import { usePlatformDetection } from '@/hooks/usePlatformDetection'
import { useSettings, type AiModel } from '@/contexts/SettingsContext'

/** AIモデル名を実際のモデルIDに変換するマッピング */
const AI_MODEL_ID_MAP: Record<AiModel, string> = {
  'claude-sonnet-4.5': 'claude-sonnet-4-5-20250929',
  'claude-haiku-4.5': 'claude-haiku-4-5-20251001',
  'claude-sonnet-4': 'claude-sonnet-4-20250514',
  'claude-haiku-3.5': 'claude-3-5-haiku-20241022',
}

interface AiTextInitialScreenProps {
  entries: AiTextEntry[]
  selectedEntry: AiTextEntry | null
  onEntrySelect: (entry: AiTextEntry) => void
  items: ItemInfo[]
  isLoadingItems: boolean
  summary: AiTextSummary | null
  selectedFont: FontOption
  onFontChange: (font: FontOption) => void
  onStart: () => void
}

/** 文字列を指定文字数で切り詰める */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

/** 学習指導要領コードからLOD URLを生成する */
function getCosLodUrl(cosCode: string): string {
  const prefix = cosCode.slice(0, 3)
  const suffix = cosCode.slice(3)
  return `https://jp-cos.github.io/${prefix}/${suffix}`
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
  'klee-one': 'Klee One',
}

/** 難易度ラベル */
const difficultyLabels: Record<number, string> = {
  1: '易しい',
  2: 'やや易しい',
  3: '普通',
  4: 'やや難しい',
  5: '難しい',
}

/** 問題の文字数制限を取得する */
function getCharLimits(
  question: { min_chars?: number; max_chars?: number; difficulty?: number } | undefined,
  summary: AiTextSummary | null
): { min: number; max: number } | null {
  // 1. 問題に直接設定されている場合
  if (question?.min_chars !== undefined && question?.max_chars !== undefined) {
    return { min: question.min_chars, max: question.max_chars }
  }

  // 2. メタデータのchar_limitsから取得（難易度に基づいて選択）
  if (summary?.metadata.char_limits) {
    const difficulty = question?.difficulty || 1
    // 難易度1-2: short、難易度3-5: long
    const config = difficulty <= 2
      ? summary.metadata.char_limits.short
      : summary.metadata.char_limits.long
    return { min: config.min_chars, max: config.max_chars }
  }

  // 3. 旧形式のメタデータから取得
  if (summary?.metadata.min_chars !== undefined && summary?.metadata.max_chars !== undefined) {
    return { min: summary.metadata.min_chars, max: summary.metadata.max_chars }
  }

  return null
}

/**
 * AI記述式採点 初期画面コンポーネント
 * - 問題集選択リストボックス
 * - 問題一覧テーブル（難易度付き）
 * - フォント選択
 * - はじめるボタン
 */
export function AiTextInitialScreen({
  entries,
  selectedEntry,
  onEntrySelect,
  items,
  isLoadingItems,
  summary,
  selectedFont,
  onFontChange,
  onStart,
}: AiTextInitialScreenProps) {
  const { isWindows } = usePlatformDetection()
  const { aiModel } = useSettings()
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null)
  const [snackbarOpen, setSnackbarOpen] = useState(false)

  // Windows環境ではUDデジタル教科書体を追加
  const fontLabels: Partial<Record<FontOption, string>> = isWindows
    ? { ...baseFontLabels, 'ud-digikyo': 'UDデジタル教科書体' }
    : baseFontLabels

  // XMLファイルの内容をクリップボードにコピー
  const handleCopyXml = useCallback(async (item: ItemInfo) => {
    try {
      const response = await fetch(item.fileName)
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
  }, [])

  // Playgroundで問題を開く
  const handleOpenInPlayground = useCallback((item: ItemInfo) => {
    // 既定フォント（system）以外の場合のみfontパラメータを追加
    const fontParam = selectedFont !== 'system' ? `&font=${selectedFont}` : ''
    const playgroundUrl = `/playground?url=${encodeURIComponent(item.fileName)}${fontParam}`
    window.open(playgroundUrl, '_blank')
  }, [selectedFont])

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', p: 2 }}>
      {/* 説明文 */}
      <Box sx={{ mb: 1.5, color: '#333', fontSize: '0.95rem', lineHeight: 1.4 }}>
        生成AIが学習指導要領とその解説を元に作成した記述式問題を解いて、AIに採点してもらおう。
        <br />
        <Box component="span" sx={{ color: '#666', fontSize: '0.85rem' }}>
          ※回答は60〜100文字で記述してください。60文字未満の回答は採点対象外となります。
        </Box>
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
            <Box><strong>満点:</strong> {summary.metadata.max_score}点</Box>
            <Box><strong>作問AI:</strong> {summary.model}</Box>
            <Box><strong>採点AI:</strong> {AI_MODEL_ID_MAP[aiModel]}</Box>
          </Box>
        </Box>
      )}

      {/* 問題一覧テーブル */}
      {isLoadingItems ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : items.length > 0 && summary ? (
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #ddd' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: '#000' }}>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold', width: { xs: 40, sm: 60 }, px: { xs: 1, sm: 2 }, py: { xs: 0.5, sm: 1 } }}>問</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold', px: { xs: 1, sm: 2 }, py: { xs: 0.5, sm: 1 } }}>タイトル</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold', width: { xs: 60, sm: 80 }, px: { xs: 1, sm: 2 }, py: { xs: 0.5, sm: 1 } }}>文字数</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold', width: { xs: 90, sm: 110 }, px: { xs: 1, sm: 2 }, py: { xs: 0.5, sm: 1 }, whiteSpace: 'nowrap' }}>難易度</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item, index) => {
                const question = summary.questions[index]
                const difficulty = question?.difficulty || 1
                const charLimits = getCharLimits(question, summary)
                return (
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
                    <TableCell sx={{ textAlign: 'center', px: { xs: 1, sm: 2 }, py: { xs: 0.5, sm: 1 }, fontSize: { xs: '0.8rem', sm: '0.9rem' } }}>
                      {charLimits ? `${charLimits.min}-${charLimits.max}` : '-'}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center', px: { xs: 1, sm: 2 }, py: { xs: 0.5, sm: 1 }, fontSize: { xs: '0.8rem', sm: '0.9rem' }, whiteSpace: 'nowrap' }}>
                      {difficultyLabels[difficulty] || `レベル${difficulty}`}
                    </TableCell>
                  </TableRow>
                )
              })}
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
