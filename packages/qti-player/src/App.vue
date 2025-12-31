<template>
  <div class="qti-player-app" :class="fontClass" :style="{ fontFamily: fontStyle }">
    <!-- エラー -->
    <div v-if="error" class="error">
      <p>{{ error }}</p>
      <p class="error-hint">
        使用方法: ?item=XMLのURL&amp;callback=結果送信先URL&amp;session=セッションID
      </p>
    </div>

    <!-- 全問完了時のサマリー表示（showSummaryがtrueの場合のみ） -->
    <div v-else-if="showSummary && summary" class="summary">
      <h2>テスト結果</h2>
      <div class="summary-score">
        <span class="score-value">{{ summary.scoredTotalScore }}</span>
        <span class="score-separator">/</span>
        <span class="score-max">{{ summary.scoredTotalMaxScore }}</span>
        <span class="score-label">点</span>
      </div>
      <div class="summary-percentage">
        正答率: {{ calculatePercentage(summary.scoredTotalScore, summary.scoredTotalMaxScore) }}%
      </div>
      <div v-if="summary.externalScoredCount > 0" class="summary-external">
        ※ 未採点: {{ summary.externalScoredCount }}問
      </div>
      <div class="summary-details">
        <h3>問題別結果</h3>
        <ul>
          <li v-for="(result, index) in summary.results" :key="result.itemId"
              :class="{ correct: result.answered && !result.isExternalScored && result.score > 0, incorrect: result.answered && !result.isExternalScored && result.score === 0, external: result.answered && result.isExternalScored, unanswered: !result.answered }">
            <span>問{{ index + 1 }}:</span>
            <span v-if="result.answered && result.isExternalScored" class="external-label">未採点</span>
            <span v-else-if="result.answered">
              {{ result.score }} / {{ result.maxScore }}
              <span v-if="result.score > 0">○</span>
              <span v-else>×</span>
            </span>
            <span v-else class="no-answer">回答なし</span>
          </li>
        </ul>
      </div>
      <button @click="restartTest" class="restart-button">
        もう一度
      </button>
    </div>

    <!-- プレイヤー（常にレンダリング、ローディング中は非表示） -->
    <template v-else>
      <!-- ローディング -->
      <div v-if="isLoading || !isPlayerReady" class="loading">
        問題を読み込み中...
      </div>

      <div class="player-container" :class="{ 'hidden': isLoading || !isItemLoaded }">
        <Qti3Player
          ref="qti3player"
          container-class="qti3-player-container"
          @notifyQti3PlayerReady="handlePlayerReady"
          @notifyQti3ItemReady="handleItemReady"
          @notifyQti3EndAttemptCompleted="handleEndAttempt"
        />
      </div>

      <!-- 回答ボタン -->
      <div v-if="isItemLoaded && !isScored" class="controls">
        <button @click="submitResponse" :disabled="isSubmitting">
          {{ isSubmitting ? '送信中...' : '回答' }}
        </button>
      </div>

      <!-- 結果表示 -->
      <div v-if="isScored" class="result">
        <button v-if="nextItemUrl || isComplete" @click="goToNextItem" class="next-button">
          次へ
        </button>
        <span v-if="score >= 1" class="correct">正解です！</span>
        <span v-else-if="isExternalScored" class="external-scored">採点は別途行います</span>
        <span v-else class="incorrect">
          不正解です<template v-if="correctAnswer">。正解は「{{ correctAnswer }}」です。</template>
        </span>
        <span class="score-text">スコア: {{ score }}</span>
      </div>

      <!-- 送信エラー -->
      <div v-if="submitError" class="submit-error">
        結果送信エラー: {{ submitError }}
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useItemLoader } from './composables/useItemLoader'
import { useResultSubmit } from './composables/useResultSubmit'

const qti3player = ref(null)
let qti3Player = null

const { itemXml, isLoading, error, loadItem } = useItemLoader()
const { isSubmitting, submitError, nextItemUrl, isComplete, summary, submitResult, resetResults } = useResultSubmit()

const isPlayerReady = ref(false)
const isItemLoaded = ref(false)
const isScored = ref(false)
const score = ref(null)
const currentItemId = ref(null)
const correctAnswer = ref(null)  // 正解情報
const isExternalScored = ref(false)  // 外部採点フラグ
const showSummary = ref(false)  // サマリー表示フラグ（「次へ」ボタンで明示的に切り替え）

// フォント設定
const fontFamily = ref('system')

const fontStyle = computed(() => {
  switch (fontFamily.value) {
    case 'noto-sans-jp':
      return '"Noto Sans JP", sans-serif'
    case 'noto-serif-jp':
      return '"Noto Serif JP", serif'
    case 'biz-udpgothic':
      return '"BIZ UDPGothic", sans-serif'
    case 'biz-udpmincho':
      return '"BIZ UDPMincho", serif'
    case 'source-han-sans':
      return '"Source Han Sans JP", sans-serif'
    case 'kosugi-maru':
      return '"Kosugi Maru", sans-serif'
    default:
      return 'inherit'
  }
})

const fontClass = computed(() => {
  return `font-${fontFamily.value}`
})

// 正答率を計算（0除算対策）
const calculatePercentage = (score, maxScore) => {
  if (maxScore === 0) return 0
  return Math.round((score / maxScore) * 100)
}

// XMLから正解情報を抽出
const extractCorrectAnswer = (xml) => {
  if (!xml) return { answer: null, isExternal: false }

  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, 'text/xml')

    // 外部採点かどうかを確認
    const outcomeDecl = doc.querySelector('qti-outcome-declaration[identifier="SCORE"]')
    if (outcomeDecl && outcomeDecl.getAttribute('external-scored') === 'human') {
      return { answer: null, isExternal: true }
    }

    // テキスト入力問題（qti-text-entry-interaction）かどうかを確認
    const textEntryInteraction = doc.querySelector('qti-text-entry-interaction')
    const extendedTextInteraction = doc.querySelector('qti-extended-text-interaction')

    // 正解情報を取得
    const correctResponse = doc.querySelector('qti-correct-response qti-value')

    // テキスト入力問題で正解情報がない場合は外部採点扱い
    if ((textEntryInteraction || extendedTextInteraction) && !correctResponse) {
      return { answer: null, isExternal: true }
    }

    if (!correctResponse) {
      return { answer: null, isExternal: false }
    }

    const correctIdentifier = correctResponse.textContent?.trim()
    if (!correctIdentifier) {
      return { answer: null, isExternal: false }
    }

    // 選択肢から正解のテキストを取得
    const simpleChoice = doc.querySelector(`qti-simple-choice[identifier="${correctIdentifier}"]`)
    if (simpleChoice) {
      return { answer: simpleChoice.textContent?.trim(), isExternal: false }
    }

    // テキスト入力問題の場合は正解テキストをそのまま返す
    if (textEntryInteraction || extendedTextInteraction) {
      return { answer: correctIdentifier, isExternal: false }
    }

    // 選択肢が見つからない場合は識別子を返す
    return { answer: correctIdentifier, isExternal: false }
  } catch (e) {
    console.error('Error extracting correct answer:', e)
    return { answer: null, isExternal: false }
  }
}

// 親ウィンドウへメッセージを送信
const postMessageToParent = (message) => {
  if (window.parent !== window) {
    window.parent.postMessage(message, '*')
  }
}

// 親ウィンドウからのメッセージを受信
const handleParentMessage = (event) => {
  if (event.data.type === 'CHANGE_ITEM') {
    // 問題を変更
    const url = new URL(window.location.href)
    url.searchParams.set('item', event.data.itemUrl)
    url.searchParams.set('font', fontFamily.value)
    window.location.href = url.toString()
  }
  if (event.data.type === 'FINISH_TEST') {
    // テストを終了して結果を表示
    const results = event.data.results || []
    showTestSummary(results)
  }
}

// テスト結果サマリーを表示
const showTestSummary = (results) => {
  // 回答済み問題のみを抽出
  const answeredResults = results.filter(r => Boolean(r.answered))

  // 採点済み問題（外部採点でない）のスコアを計算
  const scoredResults = answeredResults.filter(r => !r.isExternalScored)
  const scoredTotalScore = scoredResults.reduce((sum, r) => sum + (r.score || 0), 0)
  const scoredTotalMaxScore = scoredResults.reduce((sum, r) => sum + (r.maxScore || 1), 0)

  // 外部採点問題数
  const externalScoredCount = answeredResults.filter(r => r.isExternalScored).length

  // 全体のスコア（参考用）
  const totalScore = answeredResults.reduce((sum, r) => sum + (r.score || 0), 0)
  const totalMaxScore = answeredResults.reduce((sum, r) => sum + (r.maxScore || 1), 0)

  // サマリーデータを設定（全問題を含む）
  summary.value = {
    sessionId: new URLSearchParams(window.location.search).get('session') || '',
    results: results.map((r, index) => ({
      itemId: r.itemId || `item-${index + 1}`,
      score: r.score || 0,
      maxScore: r.maxScore || 1,
      answered: Boolean(r.answered),
      isExternalScored: Boolean(r.isExternalScored)
    })),
    totalScore,
    totalMaxScore,
    scoredTotalScore,
    scoredTotalMaxScore,
    externalScoredCount,
    itemCount: results.length
  }

  // 現在の問題画面を非表示にしてサマリーを表示
  isItemLoaded.value = false
  isScored.value = false
  isComplete.value = true
  showSummary.value = true  // 「終了」ボタンからの呼び出しではすぐにサマリーを表示

  // 親ウィンドウにテスト完了を通知（サイドバーの現在選択を解除するため）
  postMessageToParent({
    type: 'TEST_COMPLETED'
  })
}

onMounted(() => {
  // 親ウィンドウからのメッセージを受信
  window.addEventListener('message', handleParentMessage)

  // URLパラメータからフォント設定を取得
  const params = new URLSearchParams(window.location.search)
  const fontParam = params.get('font')
  const validFonts = ['noto-sans-jp', 'noto-serif-jp', 'biz-udpgothic', 'biz-udpmincho', 'source-han-sans', 'kosugi-maru']
  if (fontParam && validFonts.includes(fontParam)) {
    fontFamily.value = fontParam
    // Google Fontsを動的に読み込み
    loadGoogleFont(fontParam)
  }

  loadItem()
})

// Google Fontsを動的に読み込む
const loadGoogleFont = (fontKey) => {
  const fontUrls = {
    'noto-sans-jp': 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap',
    'noto-serif-jp': 'https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;500;700&display=swap',
    'biz-udpgothic': 'https://fonts.googleapis.com/css2?family=BIZ+UDPGothic:wght@400;700&display=swap',
    'biz-udpmincho': 'https://fonts.googleapis.com/css2?family=BIZ+UDPMincho&display=swap',
    'source-han-sans': 'https://fonts.googleapis.com/css2?family=Source+Han+Sans+JP:wght@400;500;700&display=swap',
    'kosugi-maru': 'https://fonts.googleapis.com/css2?family=Kosugi+Maru&display=swap'
  }

  const linkId = `google-font-${fontKey}`
  if (!document.getElementById(linkId) && fontUrls[fontKey]) {
    const link = document.createElement('link')
    link.id = linkId
    link.rel = 'stylesheet'
    link.href = fontUrls[fontKey]
    document.head.appendChild(link)
  }
}

// XMLが読み込まれてプレイヤーも準備できたら読み込む
watch([itemXml, isPlayerReady], ([newXml, playerReady]) => {
  if (newXml && playerReady && qti3Player) {
    loadItemToPlayer()
  }
})

const handlePlayerReady = (player) => {
  qti3Player = player
  isPlayerReady.value = true
  // watchが処理するので、ここでは明示的に呼ばない
}

const loadItemToPlayer = () => {
  if (!qti3Player || !itemXml.value) return

  // URLからファイル名（拡張子なし）を抽出してitemIdとして使用
  const params = new URLSearchParams(window.location.search)
  const itemUrl = params.get('item')
  if (itemUrl) {
    // URLからファイル名を抽出（例: http://localhost:3000/items/choice-item-001.xml -> choice-item-001）
    const fileName = itemUrl.split('/').pop()?.replace('.xml', '') || ''
    currentItemId.value = fileName
  }

  qti3Player.loadItemFromXml(itemXml.value, {
    guid: `item-${Date.now()}`,
    pnp: {
      textAppearance: { colorStyle: 'qti3-player-color-default' }
    }
  })
}

const handleItemReady = () => {
  isItemLoaded.value = true
  isScored.value = false
  score.value = null

  // XMLから正解情報を抽出
  const { answer, isExternal } = extractCorrectAnswer(itemXml.value)
  correctAnswer.value = answer
  isExternalScored.value = isExternal

  // 親ウィンドウに問題読み込み完了を通知
  postMessageToParent({
    type: 'ITEM_LOADED',
    itemId: currentItemId.value
  })
}

const handleEndAttempt = async (data) => {
  const attemptState = data.state || data

  if (attemptState.outcomeVariables) {
    const scoreOutcome = attemptState.outcomeVariables.find(
      v => v.identifier === 'SCORE'
    )

    if (scoreOutcome) {
      score.value = scoreOutcome.value
      isScored.value = true

      // 親ウィンドウに回答完了を通知
      postMessageToParent({
        type: 'ITEM_ANSWERED',
        itemId: currentItemId.value,
        score: scoreOutcome.value,
        maxScore: 1,
        isExternalScored: isExternalScored.value
      })

      // 結果をサーバーに送信
      await submitResult(currentItemId.value, {
        score: scoreOutcome.value,
        maxScore: 1,
        responses: attemptState.responseVariables,
        outcomeVariables: attemptState.outcomeVariables,
        isExternalScored: isExternalScored.value
      })
    }
  }
}

const submitResponse = () => {
  if (qti3Player) {
    qti3Player.endAttempt()
  }
}

const goToNextItem = () => {
  if (nextItemUrl.value) {
    // URLパラメータを更新して再読み込み（フォント設定も引き継ぐ）
    const url = new URL(window.location.href)
    url.searchParams.set('item', nextItemUrl.value)
    url.searchParams.set('font', fontFamily.value)
    window.location.href = url.toString()
  } else if (isComplete.value && summary.value) {
    // 次の問題がなく、テストが完了している場合はサマリーを表示
    // isScored を false にして結果表示画面を閉じ、サマリー画面を表示
    isScored.value = false
    isItemLoaded.value = false
    showSummary.value = true

    // 親ウィンドウにテスト完了を通知（サイドバーの現在選択を解除するため）
    postMessageToParent({
      type: 'TEST_COMPLETED'
    })
  }
}

const restartTest = () => {
  // 累積結果をリセット
  resetResults()
  showSummary.value = false
  isComplete.value = false
  summary.value = null

  // 親ウィンドウにテスト再開を通知
  postMessageToParent({
    type: 'RESTART_TEST'
  })
}
</script>

<style scoped>
.qti-player-app {
  width: 100%;
  padding: 10px;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #666;
}

.error {
  text-align: center;
  padding: 40px;
  color: #c62828;
}

.error-hint {
  font-size: 12px;
  color: #666;
  margin-top: 20px;
}

.player-container {
  border: 1px solid #ccc;
  padding: 20px;
  min-height: 200px;
  overflow: hidden;
}

.player-container.hidden {
  position: absolute;
  left: -9999px;
  visibility: hidden;
}

.controls {
  margin-top: 20px;
}

.controls button {
  padding: 10px 30px;
  font-size: 16px;
  cursor: pointer;
}

.controls button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.result {
  margin-top: 20px;
  padding: 15px;
  background: #f5f5f5;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 15px;
}

.result .correct {
  color: #2e7d32;
  font-weight: bold;
}

.result .incorrect {
  color: #c62828;
  font-weight: bold;
}

.result .external-scored {
  color: #1976d2;
  font-weight: bold;
}

.next-button {
  padding: 10px 30px;
  font-size: 16px;
  background: #1976d2;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.score-text {
  margin-left: auto;
}

.next-button:hover {
  background: #1565c0;
}

.complete-message {
  margin-top: 15px;
  font-weight: bold;
  color: #2e7d32;
}

.submit-error {
  margin-top: 10px;
  padding: 10px;
  background: #ffebee;
  color: #c62828;
  border-radius: 4px;
}

/* サマリー表示 */
.summary {
  text-align: center;
  padding: 5px 20px;
}

.summary h2 {
  margin-bottom: 5px;
  color: #333;
}

.summary-score {
  font-size: 48px;
  margin-bottom: 5px;
}

.summary-score .score-value {
  font-weight: bold;
  color: #1976d2;
}

.summary-score .score-separator {
  color: #666;
  margin: 0 5px;
}

.summary-score .score-max {
  color: #666;
}

.summary-score .score-label {
  font-size: 24px;
  color: #666;
  margin-left: 5px;
}

.summary-percentage {
  font-size: 24px;
  color: #666;
  margin-bottom: 15px;
}

.summary-details {
  text-align: left;
  max-width: 400px;
  margin: 0 auto 15px;
  padding: 15px;
  background: #f5f5f5;
  border-radius: 8px;
}

.summary-details h3 {
  margin-bottom: 10px;
  font-size: 16px;
  color: #333;
}

.summary-details ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.summary-details li {
  padding: 8px;
  border-bottom: 1px solid #ddd;
  display: flex;
  justify-content: space-between;
}

.summary-details li:last-child {
  border-bottom: none;
}

.summary-details li.correct {
  color: #2e7d32;
}

.summary-details li.incorrect {
  color: #c62828;
}

.summary-details li.unanswered {
  color: #757575;
}

.summary-details li.external {
  color: #ff9800;
}

.summary-details li .no-answer {
  font-style: italic;
}

.summary-details li .external-label {
  color: #ff9800;
  font-weight: bold;
}

.summary-external {
  font-size: 16px;
  color: #ff9800;
  margin-bottom: 15px;
}

.restart-button {
  padding: 12px 40px;
  font-size: 18px;
  background: #1976d2;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.restart-button:hover {
  background: #1565c0;
}
</style>

<style>
/* QTI3 Player 選択肢の幅調整（グローバル） */
.player-container ul.qti-choice-list.qti-orientation-vertical {
  display: flex !important;
  flex-direction: column !important;
  align-items: flex-start !important;
}

.player-container ul.qti-choice-list.qti-orientation-vertical > li {
  width: auto !important;
}

/* フォント設定（グローバル - QTI Player内部にも適用） */
.font-noto-sans-jp,
.font-noto-sans-jp * {
  font-family: "Noto Sans JP", sans-serif !important;
}

.font-noto-serif-jp,
.font-noto-serif-jp * {
  font-family: "Noto Serif JP", serif !important;
}

.font-biz-udpgothic,
.font-biz-udpgothic * {
  font-family: "BIZ UDPGothic", sans-serif !important;
}

.font-biz-udpmincho,
.font-biz-udpmincho * {
  font-family: "BIZ UDPMincho", serif !important;
}

.font-source-han-sans,
.font-source-han-sans * {
  font-family: "Source Han Sans JP", sans-serif !important;
}

.font-kosugi-maru,
.font-kosugi-maru * {
  font-family: "Kosugi Maru", sans-serif !important;
}

</style>
