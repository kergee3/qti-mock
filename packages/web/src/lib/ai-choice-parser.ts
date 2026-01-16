/**
 * AI Choice Parser - ai-choice.mdのMarkdownテーブル解析ユーティリティ
 */

import type { AiChoiceEntry } from '@/types/ai-choice'

/**
 * ai-choice.mdをフェッチしてテーブルを解析する
 * @returns AiChoiceEntry[]
 */
export async function parseAiChoiceMd(): Promise<AiChoiceEntry[]> {
  const response = await fetch('/ai-choice.md')
  if (!response.ok) {
    throw new Error('ai-choice.mdの取得に失敗しました')
  }

  const text = await response.text()
  return parseMarkdownTable(text)
}

/**
 * Markdownテーブルを解析する
 * @param text Markdownテキスト
 * @returns AiChoiceEntry[]
 */
export function parseMarkdownTable(text: string): AiChoiceEntry[] {
  const lines = text.split('\n')
  const entries: AiChoiceEntry[] = []

  for (const line of lines) {
    // テーブル行のみを処理（| で始まり、区切り行やヘッダー行を除外）
    if (!line.startsWith('|')) continue
    if (line.includes('---')) continue
    if (line.includes('学年')) continue

    const cells = line
      .split('|')
      .map(c => c.trim())
      .filter(Boolean)

    // 5列（学年、科目、分野、学習指導要領コード、Summary_URL）が必要
    if (cells.length >= 5) {
      entries.push({
        grade: cells[0],
        subject: cells[1],
        field: cells[2],
        curriculumCode: cells[3],
        summaryUrl: cells[4],
      })
    }
  }

  return entries
}

/**
 * ファイルURLからファイル名を抽出する
 * @param fileUrl 完全なファイルURL
 * @returns ファイル名（拡張子なし）
 *
 * 例:
 * 入力: https://.../social_31_001-xxx.xml
 * 出力: social_31_001
 */
export function extractFileNameFromUrl(fileUrl: string): string {
  // URLの最後の / 以降を取得
  const lastSlash = fileUrl.lastIndexOf('/')
  const fileNameWithSuffix = lastSlash >= 0 ? fileUrl.substring(lastSlash + 1) : fileUrl

  // .xml拡張子を除去
  const withoutExtension = fileNameWithSuffix.replace(/\.xml$/i, '')

  // Vercel Blobのサフィックス (-xxx) を除去してベース名を取得
  // パターン: social_31_001-dUEggn3wU9CLDoneCUjZ5Dgpbd5BwL → social_31_001
  const match = withoutExtension.match(/^(.+?)-[a-zA-Z0-9]+$/)
  return match ? match[1] : withoutExtension
}
