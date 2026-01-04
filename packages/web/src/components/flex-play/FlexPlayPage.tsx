'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
} from '@mui/material'
import type { FontOption } from '@/types/test'

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

/** 回答結果 */
interface AnswerResult {
  score: number
  maxScore: number
  isCorrect: boolean
  isExternalScored: boolean
  correctAnswer: string
}

/**
 * XMLからメタデータ（タイトル、インタラクションタイプ）を抽出
 */
function parseXmlMetadata(xml: string): { title: string; interactionType: string } {
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
    ]

    const foundTypes: string[] = []
    for (const selector of interactionSelectors) {
      if (doc.querySelector(selector)) {
        foundTypes.push(selector.replace('qti-', '').replace('-interaction', ''))
      }
    }

    const interactionType = foundTypes.length > 0 ? foundTypes.join(', ') : '(不明)'

    return { title, interactionType }
  } catch {
    return { title: '(解析エラー)', interactionType: '(不明)' }
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

/** サンプルXMLデータ */
const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
  xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
  identifier="choice-item-001"
  title="日本の首都はどこですか？"
  adaptive="false"
  time-dependent="false">

  <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">
    <qti-correct-response>
      <qti-value>A</qti-value>
    </qti-correct-response>
  </qti-response-declaration>

  <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
    <qti-default-value>
      <qti-value>0</qti-value>
    </qti-default-value>
  </qti-outcome-declaration>

  <qti-item-body>
    <p>日本の首都はどこですか？</p>
    <qti-choice-interaction response-identifier="RESPONSE" shuffle="false" max-choices="1">
      <qti-simple-choice identifier="A">東京</qti-simple-choice>
      <qti-simple-choice identifier="B">大阪</qti-simple-choice>
      <qti-simple-choice identifier="C">京都</qti-simple-choice>
      <qti-simple-choice identifier="D">名古屋</qti-simple-choice>
    </qti-choice-interaction>
  </qti-item-body>

  <qti-response-processing
    template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct"/>
</qti-assessment-item>`

/**
 * Flex Play ページコンポーネント
 */
export function FlexPlayPage() {
  // Player URL
  const playerUrl = process.env.NEXT_PUBLIC_PLAYER_URL || 'http://localhost:5173'

  // 入力状態
  const [xmlInput, setXmlInput] = useState<string>(sampleXml)
  const [isDragging, setIsDragging] = useState<boolean>(false)

  // 表示状態
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [itemTitle, setItemTitle] = useState<string>('')
  const [interactionType, setInteractionType] = useState<string>('')
  const [iframeSrc, setIframeSrc] = useState<string>('')

  // 結果状態
  const [result, setResult] = useState<AnswerResult | null>(null)

  // 設定
  const [selectedFont, setSelectedFont] = useState<FontOption>('system')

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
        // iframe表示をクリア
        setIsPlaying(false)
        setResult(null)
        setItemTitle('')
        setInteractionType('')
        setIframeSrc('')
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

    // XMLメタデータ解析
    const { title, interactionType: iType } = parseXmlMetadata(trimmedXml)
    setItemTitle(title)
    setInteractionType(iType)

    // 結果をリセット
    setResult(null)

    // iframe URL生成
    const dataUrl = generateDataUrl(trimmedXml)
    const url = `${playerUrl}?item=${encodeURIComponent(dataUrl)}&font=${selectedFont}`
    setIframeSrc(url)

    // プレイ開始
    setIsPlaying(true)
  }

  /**
   * postMessageリスナー
   */
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data || !event.data.type) return

      if (event.data.type === 'ITEM_ANSWERED') {
        const { score, maxScore, isExternalScored, correctAnswer } = event.data
        setResult({
          score: score ?? 0,
          maxScore: maxScore ?? 1,
          isCorrect: (score ?? 0) >= 1,
          isExternalScored: isExternalScored ?? false,
          correctAnswer: correctAnswer ?? '',
        })
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', px: 3, pt: 0.5, pb: 1 }}>
      {/* 説明文 + クリアボタン */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 1,
        }}
      >
        <Typography
          sx={{
            color: '#666',
          }}
        >
          QTI 3.0に準拠したXMLデータを入力して、テストを実行します。
        </Typography>
        <Button
          variant="outlined"
          size="small"
          onClick={() => {
            setXmlInput('')
            setIsPlaying(false)
            setResult(null)
            setItemTitle('')
            setInteractionType('')
            setIframeSrc('')
          }}
          sx={{
            color: '#666',
            borderColor: '#ccc',
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
              borderColor: '#999',
            },
          }}
        >
          クリア
        </Button>
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
          multiline
          rows={5}
          fullWidth
          placeholder="QTI 3.0のXMLデータを入力してください。"
          value={xmlInput}
          onChange={(e) => setXmlInput(e.target.value)}
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

      {/* コントロール行: Playボタン + フォント選択 */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
          backgroundColor: '#e8f4fd',
          p: 1,
          borderRadius: 1,
        }}
      >
        <Button
          variant="outlined"
          onClick={handlePlay}
          sx={{
            minWidth: 120,
            backgroundColor: '#fff',
            borderColor: '#333',
            color: '#333',
            '&:hover': {
              backgroundColor: '#f5f5f5',
              borderColor: '#333',
            },
          }}
        >
          Play
        </Button>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ color: '#333' }}>フォント:</Typography>
          <FormControl size="small">
            <Select
              value={selectedFont}
              onChange={(e) => setSelectedFont(e.target.value as FontOption)}
              sx={{
                minWidth: 150,
                backgroundColor: '#fff',
              }}
            >
              {Object.entries(fontLabels).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
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

          {/* iframe */}
          <Box
            sx={{
              border: '1px solid #ccc',
              minHeight: 300,
              mb: 2,
            }}
          >
            <iframe
              src={iframeSrc}
              style={{
                width: '100%',
                height: '400px',
                border: 'none',
              }}
              title="QTI Player"
            />
          </Box>

          {/* 結果表示 */}
          {result && (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: 2,
                backgroundColor: '#f5f5f5',
                borderRadius: 1,
              }}
            >
              <Box>
                <Typography component="span" fontWeight="bold">
                  回答済:
                </Typography>{' '}
                {result.isExternalScored ? (
                  <Typography component="span" sx={{ color: 'warning.main' }}>
                    未採点
                  </Typography>
                ) : result.isCorrect ? (
                  <Typography component="span" sx={{ color: 'success.main' }}>
                    正解
                  </Typography>
                ) : (
                  <Typography component="span" sx={{ color: 'error.main' }}>
                    不正解。正解は「{result.correctAnswer}」です。
                  </Typography>
                )}
              </Box>
              <Typography>スコア: {result.score}</Typography>
            </Box>
          )}
        </>
      )}
    </Box>
  )
}
