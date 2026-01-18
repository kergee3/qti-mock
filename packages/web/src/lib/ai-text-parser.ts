/**
 * AI Text Parser - ai-text-menu.md 解析ユーティリティ
 */

import type { AiTextEntry } from '@/types/ai-text'

/**
 * ai-text-menu.md をフェッチしてパースする
 *
 * @returns AiTextEntry[] - パースされた問題集リスト
 */
export async function parseAiTextMd(): Promise<AiTextEntry[]> {
  const response = await fetch('/ai-text/ai-text-menu.md')
  if (!response.ok) {
    throw new Error(`Failed to fetch ai-text-menu.md: ${response.status}`)
  }

  const mdContent = await response.text()
  return parseMarkdownTable(mdContent)
}

/**
 * Summary URLを正規化する
 *
 * - 絶対URL (http/https) はそのまま返す
 * - 相対パス (xxx.json) は /ai-text/ を付与して絶対パスに変換
 *
 * @param urlOrPath - URLまたは相対パス
 * @returns 正規化されたURL、無効な場合はnull
 */
function normalizeSummaryUrl(urlOrPath: string): string | null {
  const trimmed = urlOrPath.trim()

  // 空文字チェック
  if (!trimmed) return null

  // 絶対URLの場合はそのまま返す
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed
  }

  // .json ファイルの場合は相対パスとして処理
  if (trimmed.endsWith('.json')) {
    // 先頭のスラッシュを除去して正規化
    const cleanPath = trimmed.replace(/^\/+/, '')
    return `/ai-text/${cleanPath}`
  }

  // その他は無効
  return null
}

/**
 * Markdownテーブルをパースする
 *
 * テーブル形式:
 * | 学年 | 科目 | 分野 | Summary_URL |
 * |------|------|------|---------|
 * | 小6 | 社会 | 政治 | https://... |
 */
function parseMarkdownTable(content: string): AiTextEntry[] {
  const lines = content.split('\n')
  const entries: AiTextEntry[] = []

  // テーブル行を検索（| で始まり | で終わる行）
  let headerFound = false
  let separatorPassed = false

  for (const line of lines) {
    const trimmed = line.trim()

    // 空行をスキップ
    if (!trimmed) continue

    // テーブル行でない場合はスキップ
    if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) continue

    // セルを抽出
    const cells = trimmed
      .slice(1, -1)  // 先頭と末尾の | を除去
      .split('|')
      .map(cell => cell.trim())

    // ヘッダー行（最初のテーブル行）
    if (!headerFound) {
      headerFound = true
      continue
    }

    // セパレーター行（---）
    if (!separatorPassed && cells.every(cell => /^-+$/.test(cell))) {
      separatorPassed = true
      continue
    }

    // データ行
    if (headerFound && separatorPassed && cells.length >= 4) {
      const [grade, subject, field, summaryUrlRaw] = cells

      if (summaryUrlRaw) {
        // 絶対URLまたは相対パスを正規化
        const summaryUrl = normalizeSummaryUrl(summaryUrlRaw)
        if (summaryUrl) {
          entries.push({
            grade,
            subject,
            field,
            summaryUrl,
          })
        }
      }
    }
  }

  return entries
}

/**
 * Vercel BlobのURLからファイル名（サフィックスなし）を抽出
 *
 * 例:
 * "https://xxx.blob.vercel-storage.com/ai-text/text_social_31_20260117/text_social_31_001-JICHoAWk.xml"
 * → "text_social_31_001"
 */
export function extractFileNameFromUrl(url: string): string {
  // URLからファイル名部分を取得
  const parts = url.split('/')
  const filename = parts[parts.length - 1]

  // 拡張子を除去
  const withoutExt = filename.replace(/\.xml$/, '')

  // Vercel Blobのサフィックス（-XXX形式）を除去
  // 例: text_social_31_001-JICHoAWk → text_social_31_001
  const match = withoutExt.match(/^(.+?)-[A-Za-z0-9]+$/)
  if (match) {
    return match[1]
  }

  return withoutExt
}
