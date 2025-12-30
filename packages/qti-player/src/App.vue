<template>
  <div class="qti-player-app">
    <!-- エラー -->
    <div v-if="error" class="error">
      <p>{{ error }}</p>
      <p class="error-hint">
        使用方法: ?item=XMLのURL&amp;callback=結果送信先URL&amp;session=セッションID
      </p>
    </div>

    <!-- 全問完了時のサマリー表示 -->
    <div v-else-if="isComplete && summary" class="summary">
      <h2>テスト結果</h2>
      <div class="summary-score">
        <span class="score-value">{{ summary.totalScore }}</span>
        <span class="score-separator">/</span>
        <span class="score-max">{{ summary.totalMaxScore }}</span>
        <span class="score-label">点</span>
      </div>
      <div class="summary-percentage">
        正答率: {{ Math.round((summary.totalScore / summary.totalMaxScore) * 100) }}%
      </div>
      <div class="summary-details">
        <h3>問題別結果</h3>
        <ul>
          <li v-for="(result, index) in summary.results" :key="result.itemId"
              :class="{ correct: result.score > 0, incorrect: result.score === 0 }">
            問{{ index + 1 }}: {{ result.score }} / {{ result.maxScore }}
            <span v-if="result.score > 0">○</span>
            <span v-else>×</span>
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

      <!-- 採点ボタン -->
      <div v-if="isItemLoaded && !isScored" class="controls">
        <button @click="submitResponse" :disabled="isSubmitting">
          {{ isSubmitting ? '送信中...' : '採点' }}
        </button>
      </div>

      <!-- 結果表示 -->
      <div v-if="isScored" class="result">
        <p>スコア: {{ score }}</p>
        <p v-if="score >= 1" class="correct">正解です！</p>
        <p v-else class="incorrect">不正解です</p>

        <!-- 次の問題へ -->
        <button v-if="nextItemUrl" @click="goToNextItem" class="next-button">
          次へ
        </button>
      </div>

      <!-- 送信エラー -->
      <div v-if="submitError" class="submit-error">
        結果送信エラー: {{ submitError }}
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useItemLoader } from './composables/useItemLoader'
import { useResultSubmit } from './composables/useResultSubmit'

const qti3player = ref(null)
let qti3Player = null

const { itemXml, isLoading, error, loadItem } = useItemLoader()
const { isSubmitting, submitError, nextItemUrl, isComplete, summary, submitResult } = useResultSubmit()

const isPlayerReady = ref(false)
const isItemLoaded = ref(false)
const isScored = ref(false)
const score = ref(null)
const currentItemId = ref(null)

onMounted(() => {
  loadItem()
})

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

  // XMLからidentifierを抽出
  const parser = new DOMParser()
  const doc = parser.parseFromString(itemXml.value, 'text/xml')
  currentItemId.value = doc.documentElement.getAttribute('identifier')

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

      // 結果をサーバーに送信
      await submitResult(currentItemId.value, {
        score: scoreOutcome.value,
        maxScore: 1,
        responses: attemptState.responseVariables,
        outcomeVariables: attemptState.outcomeVariables
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
    // URLパラメータを更新して再読み込み
    const url = new URL(window.location.href)
    url.searchParams.set('item', nextItemUrl.value)
    window.location.href = url.toString()
  }
}

const restartTest = () => {
  // 最初の問題に戻る（新しいセッションID）
  const url = new URL(window.location.href)
  const appUrl = url.searchParams.get('callback')?.replace('/api/results', '') || 'http://localhost:3000'
  url.searchParams.set('item', `${appUrl}/items/choice-item-001.xml`)
  url.searchParams.set('session', `session-${Date.now()}`)
  window.location.href = url.toString()
}
</script>

<style scoped>
.qti-player-app {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
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
}

.result .correct {
  color: #2e7d32;
  font-weight: bold;
}

.result .incorrect {
  color: #c62828;
  font-weight: bold;
}

.next-button {
  margin-top: 15px;
  padding: 10px 30px;
  font-size: 16px;
  background: #1976d2;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
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
  padding: 40px 20px;
}

.summary h2 {
  margin-bottom: 30px;
  color: #333;
}

.summary-score {
  font-size: 48px;
  margin-bottom: 10px;
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
  margin-bottom: 30px;
}

.summary-details {
  text-align: left;
  max-width: 400px;
  margin: 0 auto 30px;
  padding: 20px;
  background: #f5f5f5;
  border-radius: 8px;
}

.summary-details h3 {
  margin-bottom: 15px;
  font-size: 16px;
  color: #333;
}

.summary-details ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.summary-details li {
  padding: 10px;
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
</style>
