/**
 * AI Choice Types - AI生成問題関連の型定義
 */

/** ai-choice.mdのテーブル行を表す型 */
export interface AiChoiceEntry {
  grade: string           // 学年 (例: "小6")
  subject: string         // 科目 (例: "社会")
  field: string           // 分野 (例: "政治")
  summaryUrl: string      // Summary JSONのURL
}

/** Summary JSONのメタデータ */
export interface AiChoiceMetadata {
  cos_code: string        // 学習指導要領コード
  subject: string         // 教科
  grade: number           // 学年
  description: string     // 内容
}

/** Summary JSONの構造 */
export interface AiChoiceSummary {
  timestamp: string
  model: string
  total_questions: number
  output_directory: string
  files: string[]         // XMLファイルの完全URL配列
  questions: AiChoiceQuestion[]
  metadata: AiChoiceMetadata
}

/** 個別問題のメタデータ */
export interface AiChoiceQuestion {
  title: string
  question: string
  options: string[]
  correct_index: number
  explanation: string
}
