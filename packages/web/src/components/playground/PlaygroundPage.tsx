'use client'

import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  Box,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  IconButton,
  Divider,
} from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore'
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess'
import ClearIcon from '@mui/icons-material/Clear'
import type { FontOption } from '@/types/test'
import { usePlatformDetection } from '@/hooks/usePlatformDetection'
import { useSettings } from '@/contexts/SettingsContext'

/** フォルダ内のXMLファイルリスト */
const FILE_LISTS: Record<string, string[]> = {
  'items-h': [
    '1-choice-item-001-ruby.xml',
    '2-inline-choice-item-001.xml',
    '3-graphic-choice-item-001.xml',
    '4-order-item-001.xml',
    '5-text-entry-item-001.xml',
    '6-match-item-001.xml',
    '7-murata-metajp-1.xml',
    '8-a13-a15-captions-glossary.xml',
  ],
  'items-v': [
    '1-choice-item-001-v-ruby.xml',
    '2-inline-choice-item-001-v.xml',
    '3-text-entry-item-001-v.xml',
    '4-order-item-001-v.xml',
    '5-vertical-choice-1.xml',
    '6-vertical-inlinechoice-16.xml',
    '7-murata-bronze-1.xml',
    '8-vertical-choice-15fix.xml',
  ],
}

/** デフォルトのURLパラメータ */
const DEFAULT_SET = 'items-h'
const DEFAULT_STARTSWITH = '1'

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

/** 回答結果（ItemAnsweredMessage の全要素） */
interface AnswerResult {
  itemId: string
  score: number
  maxScore: number
  isExternalScored: boolean
  response: string
  duration: number
  correctAnswer: string
}

/**
 * XMLからメタデータ（タイトル、インタラクションタイプ、外部リソース参照）を抽出
 */
function parseXmlMetadata(xml: string): {
  title: string
  interactionType: string
  hasExternalResources: boolean
  externalResources: string[]
} {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, 'text/xml')

    // タイトル取得: qti-assessment-item の title 属性
    const assessmentItem = doc.querySelector('qti-assessment-item')
    const title = assessmentItem?.getAttribute('title') || '(タイトルなし)'

    // インタラクションタイプ取得
    const interactionSelectors = [
      'qti-choice-interaction',
      'qti-inline-choice-interaction',
      'qti-match-interaction',
      'qti-order-interaction',
      'qti-text-entry-interaction',
      'qti-extended-text-interaction',
      'qti-graphic-choice-interaction',
      'qti-hotspot-interaction',
    ]

    const foundTypes: string[] = []
    for (const selector of interactionSelectors) {
      if (doc.querySelector(selector)) {
        foundTypes.push(selector.replace('qti-', '').replace('-interaction', ''))
      }
    }

    const interactionType = foundTypes.length > 0 ? foundTypes.join(', ') : '(不明)'

    // 外部リソース参照を検出（object, img, imageのdata/src/href属性）
    // 相対パスのみ警告対象（絶対URL http/https はアクセス可能なので除外）
    const externalResources: string[] = []
    const resourceElements = doc.querySelectorAll('object[data], img[src], image[href]')
    resourceElements.forEach((el) => {
      const src = el.getAttribute('data') || el.getAttribute('src') || el.getAttribute('href')
      if (src && !src.startsWith('data:') && !src.startsWith('http://') && !src.startsWith('https://')) {
        externalResources.push(src)
      }
    })

    return {
      title,
      interactionType,
      hasExternalResources: externalResources.length > 0,
      externalResources
    }
  } catch {
    return { title: '(解析エラー)', interactionType: '(不明)', hasExternalResources: false, externalResources: [] }
  }
}

/**
 * XMLをBase64エンコードしてData URLを生成
 */
function generateDataUrl(xml: string): string {
  // UTF-8でBase64エンコード
  const base64 = btoa(unescape(encodeURIComponent(xml)))
  return `data:application/xml;base64,${base64}`
}

/**
 * Playground ページコンポーネント
 */
export function PlaygroundPage() {
  // Player URL
  const playerUrl = process.env.NEXT_PUBLIC_PLAYER_URL || 'http://localhost:5173'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  // URLパラメータ
  const searchParams = useSearchParams()
  const router = useRouter()

  // プラットフォーム検出
  const { isWindows } = usePlatformDetection()

  // Settings から fontSize を取得
  const { fontSize, voiceInputEnabled } = useSettings()

  // Windows環境ではUDデジタル教科書体を追加
  const fontLabels: Partial<Record<FontOption, string>> = isWindows
    ? { ...baseFontLabels, 'ud-digikyo': 'UDデジタル教科書体' }
    : baseFontLabels

  // URLパラメータの前回値を保存（変更検知用）
  const prevParamsRef = useRef<string>('')

  // 入力状態
  const [xmlInput, setXmlInput] = useState<string>('')
  const [isDragging, setIsDragging] = useState<boolean>(false)

  // 表示状態
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [itemTitle, setItemTitle] = useState<string>('')
  const [interactionType, setInteractionType] = useState<string>('')
  const [iframeSrc, setIframeSrc] = useState<string>('')

  // 警告状態
  const [resourceWarning, setResourceWarning] = useState<string[] | null>(null)

  // 結果状態
  const [result, setResult] = useState<AnswerResult | null>(null)

  // 自動PLAY用フラグ（Paste/Drop時に使用）
  const [shouldAutoPlay, setShouldAutoPlay] = useState<boolean>(false)

  // 設定
  const [selectedFont, setSelectedFont] = useState<FontOption>('system')

  // TextField 表示設定
  const [textFieldRows, setTextFieldRows] = useState<number>(3)
  const [isExpanded, setIsExpanded] = useState<boolean>(false)

  // URLパラメータの font を優先、なければsessionStorageからフォント設定を復元
  useEffect(() => {
    const fontParam = searchParams.get('font')
    if (fontParam && Object.keys(fontLabels).includes(fontParam)) {
      setSelectedFont(fontParam as FontOption)
    } else {
      const savedFont = sessionStorage.getItem('playground-font')
      if (savedFont) {
        setSelectedFont(savedFont as FontOption)
      }
    }
  }, [searchParams, fontLabels])

  // フォント設定変更ハンドラ（sessionStorageに保存 + 自動PLAY）
  const handleFontChange = (font: FontOption) => {
    setSelectedFont(font)
    sessionStorage.setItem('playground-font', font)
    // XML入力がある場合は自動PLAYをトリガー
    if (xmlInput.trim()) {
      setShouldAutoPlay(true)
    }
  }

  /**
   * 表示拡張トグルハンドラ
   */
  const handleExpandToggle = () => {
    if (isExpanded) {
      setTextFieldRows(3)
    } else {
      setTextFieldRows(12)
    }
    setIsExpanded(!isExpanded)
  }

  /**
   * クリップボードコピーハンドラ
   */
  const handleCopyToClipboard = async () => {
    if (xmlInput.trim()) {
      await navigator.clipboard.writeText(xmlInput)
    }
  }

  /**
   * クリアハンドラ
   */
  const handleClear = () => {
    setXmlInput('')
    setIsPlaying(false)
    setResult(null)
    setItemTitle('')
    setInteractionType('')
    setIframeSrc('')
    setResourceWarning(null)
    // URLパラメータを消去
    router.replace('/playground', { scroll: false })
  }

  /**
   * ドラッグ＆ドロップハンドラ
   */
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  /**
   * ペーストハンドラ（自動PLAY用）
   */
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const pastedText = e.clipboardData.getData('text')
    if (pastedText.trim()) {
      // onChangeでxmlInputが更新された後、useEffectで自動PLAYが実行される
      setShouldAutoPlay(true)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length === 0) return

    // 最初のファイルのみ使用
    const file = files[0]

    // ファイル読み込み
    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      if (content) {
        // 既存データをクリアして新しい内容を設定
        setXmlInput(content)
        // 状態をリセット
        setResult(null)
        setResourceWarning(null)
        // URLパラメータを消去
        router.replace('/playground', { scroll: false })
        // 自動PLAYをトリガー
        setShouldAutoPlay(true)
      }
    }
    reader.onerror = () => {
      alert('ファイルの読み込みに失敗しました')
    }
    reader.readAsText(file)
  }

  /**
   * Playボタンハンドラ
   */
  const handlePlay = () => {
    const trimmedXml = xmlInput.trim()
    if (!trimmedXml) {
      alert('XMLデータを入力してください')
      return
    }

    // XMLメタデータ解析（外部リソース検出含む）
    const { title, interactionType: iType, hasExternalResources, externalResources } = parseXmlMetadata(trimmedXml)
    setItemTitle(title)
    setInteractionType(iType)

    // 外部リソース警告を設定
    if (hasExternalResources) {
      setResourceWarning(externalResources)
    } else {
      setResourceWarning(null)
    }

    // 結果をリセット
    setResult(null)

    // iframe URL生成（タイムスタンプを追加して毎回リロードを強制）
    const dataUrl = generateDataUrl(trimmedXml)
    const timestamp = Date.now()
    const voiceParam = voiceInputEnabled ? 'true' : 'false'
    const url = `${playerUrl}?item=${encodeURIComponent(dataUrl)}&font=${selectedFont}&fontSize=${fontSize}&voice=${voiceParam}&t=${timestamp}`
    setIframeSrc(url)

    // プレイ開始
    setIsPlaying(true)
  }

  /**
   * URLパラメータの処理（初期化＆変更検知）
   */
  useEffect(() => {
    const set = searchParams.get('set')
    const startswith = searchParams.get('startswith')
    const urlParam = searchParams.get('url')

    // url= パラメータがある場合は、そのURLからXMLをフェッチ
    if (urlParam) {
      // パラメータの変更を検知（同じパラメータなら何もしない）
      const currentParams = `url:${urlParam}`
      if (prevParamsRef.current === currentParams) return
      prevParamsRef.current = currentParams

      const loadXmlFromUrl = async () => {
        try {
          const response = await fetch(urlParam)
          if (response.ok) {
            const xmlContent = await response.text()
            setXmlInput(xmlContent)
            // 自動PLAYをトリガー
            setShouldAutoPlay(true)
          } else {
            console.error('Failed to load XML from URL:', response.status)
          }
        } catch (error) {
          console.error('Failed to load XML from URL:', error)
        }
      }

      loadXmlFromUrl()
      return
    }

    // 使用するパラメータを決定
    let effectiveSet: string
    let effectiveStartswith: string
    let shouldUpdateUrl = false

    if (!set && !startswith) {
      // パラメータなしの場合はデフォルト値を使用し、URLを書き換え
      effectiveSet = DEFAULT_SET
      effectiveStartswith = DEFAULT_STARTSWITH
      shouldUpdateUrl = true
    } else {
      // パラメータがある場合はそれを使用
      effectiveSet = set && FILE_LISTS[set] ? set : DEFAULT_SET
      effectiveStartswith = startswith || DEFAULT_STARTSWITH
    }

    // パラメータの変更を検知（同じパラメータなら何もしない）
    const currentParams = `${effectiveSet}:${effectiveStartswith}`
    if (prevParamsRef.current === currentParams) return
    prevParamsRef.current = currentParams

    // 非同期処理を内部関数で実行
    const loadXml = async () => {
      const fileList = FILE_LISTS[effectiveSet]
      if (!fileList) return

      // startswithに一致する最初のファイルを検索
      const matchedFile = fileList.find(file => file.startsWith(effectiveStartswith))
      if (!matchedFile) return

      // XMLファイルをfetch
      try {
        const response = await fetch(`${appUrl}/${effectiveSet}/${matchedFile}`)
        if (response.ok) {
          const xmlContent = await response.text()
          setXmlInput(xmlContent)
          // 自動PLAYをトリガー
          setShouldAutoPlay(true)
        }
      } catch (error) {
        console.error('Failed to load XML file:', error)
      }
    }

    // URLの更新（必要な場合のみ）
    if (shouldUpdateUrl) {
      router.replace(`/playground?set=${effectiveSet}&startswith=${effectiveStartswith}`, { scroll: false })
    }

    // XMLをロード
    loadXml()
  }, [searchParams, router, appUrl])

  /**
   * postMessageリスナー
   */
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data || !event.data.type) return

      if (event.data.type === 'ITEM_ANSWERED') {
        const { itemId, score, maxScore, isExternalScored, response, duration, correctAnswer } = event.data
        setResult({
          itemId: itemId ?? '',
          score: score ?? 0,
          maxScore: maxScore ?? 1,
          isExternalScored: isExternalScored ?? false,
          response: response ?? '',
          duration: duration ?? 0,
          correctAnswer: correctAnswer ?? '',
        })
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  /**
   * 自動PLAY実行（Paste/Drop時）
   */
  useEffect(() => {
    if (shouldAutoPlay && xmlInput.trim()) {
      setShouldAutoPlay(false)
      // handlePlayの処理を直接実行（state依存の問題を回避）
      const trimmedXml = xmlInput.trim()
      const { title, interactionType: iType, hasExternalResources, externalResources } = parseXmlMetadata(trimmedXml)
      setItemTitle(title)
      setInteractionType(iType)
      if (hasExternalResources) {
        setResourceWarning(externalResources)
      } else {
        setResourceWarning(null)
      }
      setResult(null)
      const dataUrl = generateDataUrl(trimmedXml)
      const timestamp = Date.now()
      const url = `${playerUrl}?item=${encodeURIComponent(dataUrl)}&font=${selectedFont}&fontSize=${fontSize}&t=${timestamp}`
      setIframeSrc(url)
      setIsPlaying(true)
    }
  }, [shouldAutoPlay, xmlInput, playerUrl, selectedFont, fontSize])

  /**
   * ページ表示時にスクロールを無効化
   */
  useLayoutEffect(() => {
    // body と html のoverflowを無効化
    const originalBodyOverflow = document.body.style.overflow
    const originalHtmlOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'

    // 親のmain要素のoverflowも無効化
    const mainElement = document.querySelector('main')
    const originalMainOverflow = mainElement?.style.overflow || ''
    if (mainElement) {
      mainElement.style.overflow = 'hidden'
    }

    return () => {
      document.body.style.overflow = originalBodyOverflow
      document.documentElement.style.overflow = originalHtmlOverflow
      if (mainElement) {
        mainElement.style.overflow = originalMainOverflow
      }
    }
  }, [])

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', px: 3, pt: 0.5, pb: 1, maxHeight: '100vh', overflow: 'hidden', boxSizing: 'border-box' }}>
      {/* 説明文 */}
      <Typography
        sx={{
          color: '#666',
          mb: 1,
        }}
      >
        QTI 3.0に準拠したXMLデータを入力して、テストを実行します。
      </Typography>

      {/* コントロール行: Playボタン + 表示拡張 + クリア + コピー + フォント選択 */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 1,
          backgroundColor: '#e8f4fd',
          p: 1,
          borderRadius: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={handlePlay}
            startIcon={<PlayArrowIcon />}
            sx={{
              height: 32,
              fontSize: '0.875rem',
              backgroundColor: '#fff',
              borderColor: '#333',
              color: '#333',
              '&:hover': {
                backgroundColor: '#f5f5f5',
                borderColor: '#333',
              },
            }}
          >
            PLAY
          </Button>
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
          <IconButton
            size="small"
            onClick={handleExpandToggle}
            title={isExpanded ? '表示を縮小' : '表示を拡張'}
            sx={{
              width: 32,
              height: 32,
              backgroundColor: '#fff',
              border: '1px solid #ccc',
              borderRadius: 1,
              color: '#666',
              '&:hover': {
                backgroundColor: '#f5f5f5',
                borderColor: '#999',
              },
            }}
          >
            {isExpanded ? <UnfoldLessIcon /> : <UnfoldMoreIcon />}
          </IconButton>
          <IconButton
            size="small"
            onClick={handleClear}
            title="クリア"
            sx={{
              width: 32,
              height: 32,
              backgroundColor: '#fff',
              border: '1px solid #ccc',
              borderRadius: 1,
              color: '#666',
              '&:hover': {
                backgroundColor: '#f5f5f5',
                borderColor: '#999',
              },
            }}
          >
            <ClearIcon />
          </IconButton>
          <IconButton
            size="small"
            onClick={handleCopyToClipboard}
            title="クリップボードにコピー"
            sx={{
              width: 32,
              height: 32,
              backgroundColor: '#fff',
              border: '1px solid #ccc',
              borderRadius: 1,
              color: '#666',
              '&:hover': {
                backgroundColor: '#f5f5f5',
                borderColor: '#999',
              },
            }}
          >
            <ContentCopyIcon />
          </IconButton>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FormControl size="small">
            <Select
              value={selectedFont}
              onChange={(e) => handleFontChange(e.target.value as FontOption)}
              sx={{
                minWidth: 150,
                height: 32,
                fontSize: '0.875rem',
                backgroundColor: '#fff',
              }}
            >
              {Object.entries(fontLabels).map(([value, label]) => (
                <MenuItem key={value} value={value} sx={{ fontSize: '0.875rem' }}>
                  {label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* XML入力エリア */}
      <Box
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        sx={{ position: 'relative' }}
      >
        <TextField
          variant="outlined"
          multiline
          rows={textFieldRows}
          fullWidth
          placeholder={"QTI 3.0のXMLデータを入力してください。\nクリップボード経由での貼り付けや、ExplorerからxmlファイルのDrag and Dropができます。"}
          value={xmlInput}
          onChange={(e) => {
            const newValue = e.target.value
            setXmlInput(newValue)
            // URLパラメータがあれば消去（Paste含む）
            if (searchParams.get('set') || searchParams.get('startswith')) {
              router.replace('/playground', { scroll: false })
            }
          }}
          onPaste={handlePaste}
          sx={{
            mb: 2,
            '& .MuiInputBase-root': {
              backgroundColor: isDragging ? '#d0e8ff' : '#e8f4fd',
              fontFamily: 'monospace',
              fontSize: '14px',
              transition: 'all 0.2s ease',
            },
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: isDragging ? '#1976d2' : '#ccc',
              borderWidth: isDragging ? 2 : 1,
            },
          }}
        />
        {/* ドラッグ中のオーバーレイ */}
        {isDragging && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(25, 118, 210, 0.1)',
              borderRadius: 1,
              pointerEvents: 'none',
            }}
          >
            <Typography
              sx={{
                color: '#1976d2',
                fontWeight: 'bold',
                fontSize: '16px',
              }}
            >
              XMLファイルをドロップしてください
            </Typography>
          </Box>
        )}
      </Box>

      {/* プレイ中の表示 */}
      {isPlaying && (
        <>
          {/* タイトル・インタラクション表示 */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              mb: 1,
              color: '#333',
            }}
          >
            <Typography>タイトル: {itemTitle}</Typography>
            <Typography>Interaction: {interactionType}</Typography>
          </Box>

          {/* 外部リソース警告 */}
          {resourceWarning && (
            <Box
              sx={{
                mb: 1,
                p: 1.5,
                backgroundColor: '#fff3e0',
                border: '1px solid #ffb74d',
                borderRadius: 1,
              }}
            >
              <Typography sx={{ color: '#e65100', fontWeight: 'bold', fontSize: '14px', mb: 0.5 }}>
                ⚠ 外部リソース参照があります
              </Typography>
              <Typography sx={{ color: '#666', fontSize: '12px', mb: 0.5 }}>
                PlaygroundではData URL経由でXMLを読み込むため、以下の外部リソースは読み込めません:
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2, color: '#666', fontSize: '12px' }}>
                {resourceWarning.map((src, i) => (
                  <li key={i}><code>{src}</code></li>
                ))}
              </Box>
            </Box>
          )}

          {/* iframe */}
          <Box
            sx={{
              border: '1px solid #ccc',
              mb: 1,
              boxSizing: 'border-box',
            }}
          >
            <iframe
              src={iframeSrc}
              style={{
                width: '100%',
                height: 'calc(100vh - 430px)',
                minHeight: '200px',
                border: 'none',
                display: 'block',
              }}
              title="QTI Player"
              allow="microphone"
            />
          </Box>

          {/* 結果表示（技術者向け：ItemAnsweredMessage 全要素） - 常に領域を確保 */}
          <Box
            sx={{
              height: '130px',
              visibility: result ? 'visible' : 'hidden',
            }}
          >
          {result && (
            <Box
              sx={{
                p: 1,
                backgroundColor: '#1e1e1e',
                borderRadius: 1,
                fontFamily: 'monospace',
                fontSize: '12px',
                lineHeight: 1.3,
              }}
            >
              <Typography
                sx={{
                  color: '#569cd6',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  mb: 0.5,
                }}
              >
                {'// ITEM_ANSWERED (postMessage)'}
              </Typography>
              <Box component="pre" sx={{ m: 0, color: '#d4d4d4', whiteSpace: 'pre-wrap', lineHeight: 1.3 }}>
                <Box component="span" sx={{ color: '#9cdcfe' }}>itemId</Box>
                <Box component="span" sx={{ color: '#d4d4d4' }}>: </Box>
                <Box component="span" sx={{ color: '#ce9178' }}>"{result.itemId}"</Box>
                <Box component="span" sx={{ color: '#d4d4d4' }}>, </Box>
                <Box component="span" sx={{ color: '#9cdcfe' }}>duration</Box>
                <Box component="span" sx={{ color: '#d4d4d4' }}>: </Box>
                <Box component="span" sx={{ color: '#b5cea8' }}>{result.duration}</Box>
                <Box component="span" sx={{ color: '#6a9955' }}> // 秒</Box>
                {'\n'}
                <Box component="span" sx={{ color: '#9cdcfe' }}>score</Box>
                <Box component="span" sx={{ color: '#d4d4d4' }}>: </Box>
                <Box component="span" sx={{ color: '#b5cea8' }}>{result.score}</Box>
                <Box component="span" sx={{ color: '#d4d4d4' }}>, </Box>
                <Box component="span" sx={{ color: '#9cdcfe' }}>maxScore</Box>
                <Box component="span" sx={{ color: '#d4d4d4' }}>: </Box>
                <Box component="span" sx={{ color: '#b5cea8' }}>{result.maxScore}</Box>
                <Box component="span" sx={{ color: '#d4d4d4' }}>, </Box>
                <Box component="span" sx={{ color: '#9cdcfe' }}>isExternalScored</Box>
                <Box component="span" sx={{ color: '#d4d4d4' }}>: </Box>
                <Box component="span" sx={{ color: '#569cd6' }}>{result.isExternalScored ? 'true' : 'false'}</Box>
                {'\n'}
                <Box component="span" sx={{ color: '#9cdcfe' }}>response</Box>
                <Box component="span" sx={{ color: '#d4d4d4' }}>: </Box>
                <Box component="span" sx={{ color: '#ce9178' }}>"{result.response}"</Box>
                <Box component="span" sx={{ color: '#d4d4d4' }}>, </Box>
                <Box component="span" sx={{ color: '#9cdcfe' }}>correctAnswer</Box>
                <Box component="span" sx={{ color: '#d4d4d4' }}>: </Box>
                <Box component="span" sx={{ color: '#ce9178' }}>"{result.correctAnswer}"</Box>
              </Box>
            </Box>
          )}
          </Box>
        </>
      )}
    </Box>
  )
}
