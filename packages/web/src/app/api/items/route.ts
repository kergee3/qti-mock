import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  try {
    const itemsDir = path.join(process.cwd(), 'public', 'items')
    const files = fs.readdirSync(itemsDir)

    // XMLファイルのみをフィルタリングし、ファイル名でソート
    const xmlFiles = files
      .filter((file) => file.endsWith('.xml'))
      .sort((a, b) => a.localeCompare(b))

    // 各XMLファイルからメタデータを抽出
    const items = xmlFiles.map((file) => {
      const filePath = path.join(itemsDir, file)
      const content = fs.readFileSync(filePath, 'utf-8')

      // XMLからidentifierとtitleを抽出
      const identifierMatch = content.match(/identifier="([^"]+)"/)
      const titleMatch = content.match(/title="([^"]+)"/)

      // インタラクションタイプを検出
      const interactionTypes = []
      if (content.includes('qti-choice-interaction')) interactionTypes.push('choiceInteraction')
      if (content.includes('qti-order-interaction')) interactionTypes.push('orderInteraction')
      if (content.includes('qti-text-entry-interaction')) interactionTypes.push('textEntryInteraction')
      if (content.includes('qti-match-interaction')) interactionTypes.push('matchInteraction')
      if (content.includes('qti-inline-choice-interaction')) interactionTypes.push('inlineChoiceInteraction')
      if (content.includes('qti-hotspot-interaction')) interactionTypes.push('hotspotInteraction')
      if (content.includes('qti-graphic-choice-interaction')) interactionTypes.push('graphicChoiceInteraction')

      const id = file.replace('.xml', '')

      return {
        id,
        fileName: file,
        identifier: identifierMatch ? identifierMatch[1] : id,
        title: titleMatch ? titleMatch[1] : id,
        type: interactionTypes.length > 0 ? interactionTypes.join(', ') : 'unknown',
      }
    })

    return NextResponse.json({
      success: true,
      items,
      count: items.length,
    })
  } catch (error) {
    console.error('Error reading items directory:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to read items' },
      { status: 500 }
    )
  }
}
