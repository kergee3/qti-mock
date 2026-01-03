/**
 * Test Types - テスト関連の型定義
 */

/** テストのフェーズ */
export type TestPhase = 'initial' | 'testing' | 'results'

/** QTIアイテム情報 */
export interface ItemInfo {
  id: string
  fileName: string
  identifier: string
  title: string
  type: string
}

/** アイテムの回答結果 */
export interface ItemResult {
  itemId: string
  score: number
  maxScore: number
  isExternalScored: boolean
  answered: boolean
  response?: string
  duration?: number
}

/** 問題選択バーの位置 */
export type QuestionBarPosition = 'auto' | 'left' | 'right' | 'top-ltr' | 'top-rtl' | 'bottom-ltr' | 'bottom-rtl'

/** 書字方向 */
export type WritingDirection = 'horizontal' | 'vertical'

/** フォントオプション */
export type FontOption =
  | 'system'
  | 'noto-sans-jp'
  | 'noto-serif-jp'
  | 'biz-udpgothic'
  | 'biz-udpmincho'
  | 'source-han-sans'
  | 'kosugi-maru'

/** 問題のステータス */
export type QuestionStatus =
  | 'not-started'
  | 'in-progress'
  | 'answered-correct'
  | 'answered-incorrect'
  | 'answered-external'

/** postMessage で送受信するメッセージ型 */
export interface PlayerMessage {
  type: 'ITEM_LOADED' | 'ITEM_ANSWERED' | 'CHANGE_ITEM'
  itemId?: string
  itemUrl?: string
  score?: number
  maxScore?: number
  isExternalScored?: boolean
  response?: string
  duration?: number
}
