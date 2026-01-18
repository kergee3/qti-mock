/**
 * AI Text Types - AI記述式採点関連の型定義
 */

/** ai-text.mdのテーブル行を表す型 */
export interface AiTextEntry {
  grade: string           // 学年 (例: "小6")
  subject: string         // 科目 (例: "社会")
  field: string           // 分野 (例: "政治")
  summaryUrl: string      // Summary JSONのURL
}

/** 文字数制限設定 */
export interface CharLimitConfig {
  min_chars: number
  max_chars: number
  model_answer_target: number
}

/** 文字数制限（短文/長文） */
export interface CharLimits {
  short: CharLimitConfig
  long: CharLimitConfig
}

/** Summary JSONのメタデータ */
export interface AiTextMetadata {
  cos_code: string        // 学習指導要領コード
  subject: string         // 教科
  grade: number           // 学年
  description: string     // 内容
  question_type: string   // 問題タイプ（extended_text）
  max_chars?: number      // 最大文字数（旧形式）
  min_chars?: number      // 最小文字数（旧形式）
  char_limits?: CharLimits // 文字数制限（新形式）
  max_score: number       // 満点
}

/** Summary JSONの構造 */
export interface AiTextSummary {
  timestamp: string
  model: string
  question_type: string   // 'extended_text'
  total_questions: number
  output_directory: string
  files: string[]         // XMLファイルの完全URL配列
  questions: AiTextQuestion[]
  metadata: AiTextMetadata
}

/** 個別問題のメタデータ */
export interface AiTextQuestion {
  question_id: string
  difficulty: number
  title: string
  question_text: string
  model_answer: string
  required_concepts: string[]
  scoring_matrix: ScoringMatrix
  common_errors: CommonError[]
  thinking_skills?: ThinkingSkills
  min_chars?: number  // 問題ごとの最小文字数
  max_chars?: number  // 問題ごとの最大文字数
}

/** 採点観点の構造 */
export interface ScoringAspect {
  aspect_name: string
  max_score: number
  levels: ScoringLevel[]
}

/** 採点レベル */
export interface ScoringLevel {
  score: number
  description: string
}

/** 採点マトリクス */
export interface ScoringMatrix {
  understanding: ScoringAspect
  expression: ScoringAspect
  accuracy: ScoringAspect
}

/** 典型的誤答パターン */
export interface CommonError {
  pattern: string
  feedback: string
}

/** 思考力の配分 */
export interface ThinkingSkills {
  critical_thinking: number
  judgment: number
  expression: number
}

/** QTI XMLから抽出した採点基準 */
export interface ScoringCriteria {
  model_answer: string
  required_concepts: string[]
  scoring_matrix: ScoringMatrix
  common_errors: CommonError[]
  min_chars?: number
  max_chars?: number
}

/** AI採点モデル */
export type AiModelType = 'claude-sonnet-4.5' | 'claude-haiku-4.5' | 'claude-sonnet-4' | 'claude-haiku-3.5'

/** AI採点リクエスト */
export interface AiScoringRequest {
  response: string           // 回答者の記述内容
  scoringCriteria: ScoringCriteria
  questionText: string       // 問題文
  model?: AiModelType        // 使用するAIモデル
}

/** AI採点の観点別スコア */
export interface AspectScore {
  score: number
  maxScore: number
  feedback: string
}

/** AI採点レスポンス */
export interface AiScoringResponse {
  score: number              // 総合スコア
  maxScore: number           // 満点（10）
  breakdown: {
    understanding: AspectScore
    expression: AspectScore
    accuracy: AspectScore
  }
  overallFeedback: string    // 総合フィードバック
  matchedErrors: string[]    // 該当した誤答パターン
  suggestions: string[]      // 改善提案
  // 採点メタ情報（コスト追跡用）
  scoringTimeMs?: number     // 採点にかかった時間（ミリ秒）
  inputTokens?: number       // 入力トークン数
  outputTokens?: number      // 出力トークン数
  modelUsed?: string         // 使用したモデル
}

/** AI採点結果（保存用） */
export interface AiScoringResult {
  itemId: string
  response: string           // 回答内容
  scoringResponse: AiScoringResponse | null
  scoredAt?: string          // 採点日時
  isScored: boolean          // 採点済みか
}
