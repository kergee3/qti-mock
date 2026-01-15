import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const dir = searchParams.get('dir') || 'horizontal'
    const subDir = dir === 'vertical' ? 'items-v' : 'items-h'
    const itemsDir = path.join(process.cwd(), 'public', subDir)
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

      // QTI 3.0 全インタラクションタイプを検出（出現回数をカウント）
      // https://www.imsglobal.org/spec/qti/v3p0/impl#h.7jm6la7pne1i
      const interactionTypes: string[] = []

      const countOccurrences = (tagName: string, typeName: string) => {
        const regex = new RegExp(`<${tagName}[\\s>]`, 'g')
        const matches = content.match(regex)
        if (matches) {
          for (let i = 0; i < matches.length; i++) {
            interactionTypes.push(typeName)
          }
        }
      }

      // Simple/Common Interactions
      countOccurrences('qti-choice-interaction', 'choiceInteraction')
      countOccurrences('qti-order-interaction', 'orderInteraction')
      countOccurrences('qti-associate-interaction', 'associateInteraction')
      countOccurrences('qti-match-interaction', 'matchInteraction')
      countOccurrences('qti-gap-match-interaction', 'gapMatchInteraction')

      // Text-Based/Inline Interactions
      countOccurrences('qti-inline-choice-interaction', 'inlineChoiceInteraction')
      countOccurrences('qti-text-entry-interaction', 'textEntryInteraction')
      countOccurrences('qti-extended-text-interaction', 'extendedTextInteraction')
      countOccurrences('qti-hottext-interaction', 'hottextInteraction')

      // Graphical Interactions
      countOccurrences('qti-hotspot-interaction', 'hotspotInteraction')
      countOccurrences('qti-graphic-order-interaction', 'graphicOrderInteraction')
      countOccurrences('qti-graphic-associate-interaction', 'graphicAssociateInteraction')
      countOccurrences('qti-graphic-gap-match-interaction', 'graphicGapMatchInteraction')
      countOccurrences('qti-select-point-interaction', 'selectPointInteraction')
      countOccurrences('qti-position-object-interaction', 'positionObjectInteraction')

      // Miscellaneous Interactions
      countOccurrences('qti-slider-interaction', 'sliderInteraction')
      countOccurrences('qti-media-interaction', 'mediaInteraction')
      countOccurrences('qti-drawing-interaction', 'drawingInteraction')
      countOccurrences('qti-upload-interaction', 'uploadInteraction')
      countOccurrences('qti-custom-interaction', 'customInteraction')
      countOccurrences('qti-portable-custom-interaction', 'portableCustomInteraction')

      const id = file.replace('.xml', '')

      return {
        id,
        fileName: file,
        identifier: identifierMatch ? identifierMatch[1] : id,
        title: titleMatch ? titleMatch[1] : id,
        type: interactionTypes.length > 0 ? interactionTypes.join('\n') : 'unknown',
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
