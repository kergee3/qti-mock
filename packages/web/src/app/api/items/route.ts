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

      // QTI 3.0 全インタラクションタイプを検出
      // https://www.imsglobal.org/spec/qti/v3p0/impl#h.7jm6la7pne1i
      const interactionTypes: string[] = []

      // Simple/Common Interactions
      if (content.includes('qti-choice-interaction')) interactionTypes.push('choiceInteraction')
      if (content.includes('qti-order-interaction')) interactionTypes.push('orderInteraction')
      if (content.includes('qti-associate-interaction')) interactionTypes.push('associateInteraction')
      if (content.includes('qti-match-interaction')) interactionTypes.push('matchInteraction')
      if (content.includes('qti-gap-match-interaction')) interactionTypes.push('gapMatchInteraction')

      // Text-Based/Inline Interactions
      if (content.includes('qti-inline-choice-interaction')) interactionTypes.push('inlineChoiceInteraction')
      if (content.includes('qti-text-entry-interaction')) interactionTypes.push('textEntryInteraction')
      if (content.includes('qti-extended-text-interaction')) interactionTypes.push('extendedTextInteraction')
      if (content.includes('qti-hottext-interaction')) interactionTypes.push('hottextInteraction')

      // Graphical Interactions
      if (content.includes('qti-hotspot-interaction')) interactionTypes.push('hotspotInteraction')
      if (content.includes('qti-graphic-order-interaction')) interactionTypes.push('graphicOrderInteraction')
      if (content.includes('qti-graphic-associate-interaction')) interactionTypes.push('graphicAssociateInteraction')
      if (content.includes('qti-graphic-gap-match-interaction')) interactionTypes.push('graphicGapMatchInteraction')
      if (content.includes('qti-select-point-interaction')) interactionTypes.push('selectPointInteraction')
      if (content.includes('qti-position-object-interaction')) interactionTypes.push('positionObjectInteraction')

      // Miscellaneous Interactions
      if (content.includes('qti-slider-interaction')) interactionTypes.push('sliderInteraction')
      if (content.includes('qti-media-interaction')) interactionTypes.push('mediaInteraction')
      if (content.includes('qti-drawing-interaction')) interactionTypes.push('drawingInteraction')
      if (content.includes('qti-upload-interaction')) interactionTypes.push('uploadInteraction')
      if (content.includes('qti-custom-interaction')) interactionTypes.push('customInteraction')
      if (content.includes('qti-portable-custom-interaction')) interactionTypes.push('portableCustomInteraction')

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
