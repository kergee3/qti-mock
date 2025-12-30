// 問題の順序定義（本番ではDBから取得）
export const ITEM_SEQUENCE = [
  {
    id: 'choice-item-001',
    type: 'choiceInteraction',
    description: '選択問題 - 日本の首都',
  },
  {
    id: 'order-item-001',
    type: 'orderInteraction',
    description: '並べ替え問題 - 都道府県の順序',
  },
  {
    id: 'text-entry-item-001',
    type: 'textEntryInteraction',
    description: 'テキスト入力問題 - 日本一高い山',
  },
  {
    id: 'match-item-001',
    type: 'matchInteraction',
    description: 'マッチング問題 - 国と首都の組み合わせ',
  },
  {
    id: 'inline-choice-item-001',
    type: 'inlineChoiceInteraction',
    description: 'インライン選択問題 - 文中の空欄補充',
  },
  {
    id: 'graphic-choice-item-001',
    type: 'hotspotInteraction',
    description: 'ホットスポット問題 - 日本地図上で東京を選択',
  },
]

// アイテムIDの配列（後方互換性のため）
export const ITEM_IDS = ITEM_SEQUENCE.map((item) => item.id)
