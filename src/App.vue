<template>
  <div class="test-runner">
    <h1>QTI3 テストデモ</h1>

    <!-- 問題番号表示 -->
    <div class="question-progress">
      問題 {{ currentItemIndex + 1 }} / {{ items.length }}
    </div>

    <!-- QTI3 Player -->
    <div class="player-container">
      <Qti3Player
        ref="qti3player"
        container-class="qti3-player-container"
        @notifyQti3PlayerReady="handlePlayerReady"
        @notifyQti3ItemReady="handleItemReady"
        @notifyQti3EndAttemptCompleted="handleEndAttempt"
      />
    </div>

    <!-- 採点ボタン（採点前のみ表示） -->
    <div v-if="isItemLoaded && !isScored" class="controls">
      <button @click="submitResponse" :disabled="!hasResponse">採点</button>
    </div>

    <!-- 結果表示 -->
    <div v-if="isScored" class="result">
      <h2>結果</h2>
      <p>スコア: {{ score }}</p>
      <p v-if="score === 1" class="correct">正解です！</p>
      <p v-else class="incorrect">不正解です</p>

      <!-- 次へボタン or 終了メッセージ -->
      <button v-if="hasNextItem" @click="goToNextItem" class="next-button">次へ</button>
      <div v-else class="complete-message">
        <p>全ての問題が終了しました</p>
        <button @click="restart">最初からやり直す</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const qti3player = ref(null)
let qti3Player = null
const isItemLoaded = ref(false)
const isScored = ref(false)
const hasResponse = ref(false)
const score = ref(null)
const currentItemIndex = ref(0)

// 問題リスト
const items = [
  {
    type: 'choice',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
  xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
  identifier="choice-item-001"
  title="選択問題サンプル"
  adaptive="false"
  time-dependent="false">

  <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">
    <qti-correct-response>
      <qti-value>A</qti-value>
    </qti-correct-response>
  </qti-response-declaration>

  <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
    <qti-default-value>
      <qti-value>0</qti-value>
    </qti-default-value>
  </qti-outcome-declaration>

  <qti-item-body>
    <p>日本の首都はどこですか？</p>
    <qti-choice-interaction response-identifier="RESPONSE" shuffle="false" max-choices="1">
      <qti-simple-choice identifier="A">東京</qti-simple-choice>
      <qti-simple-choice identifier="B">大阪</qti-simple-choice>
      <qti-simple-choice identifier="C">京都</qti-simple-choice>
      <qti-simple-choice identifier="D">名古屋</qti-simple-choice>
    </qti-choice-interaction>
  </qti-item-body>

  <qti-response-processing
    template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct"/>
</qti-assessment-item>`
  },
  {
    type: 'text',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
  xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
  identifier="text-item-001"
  title="記述問題サンプル"
  adaptive="false"
  time-dependent="false">

  <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="string">
    <qti-correct-response>
      <qti-value>3776</qti-value>
    </qti-correct-response>
  </qti-response-declaration>

  <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
    <qti-default-value>
      <qti-value>0</qti-value>
    </qti-default-value>
  </qti-outcome-declaration>

  <qti-item-body>
    <p>富士山の高さを答えてください（単位: メートル）</p>
    <qti-text-entry-interaction response-identifier="RESPONSE" expected-length="10"/>
  </qti-item-body>

  <qti-response-processing
    template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct"/>
</qti-assessment-item>`
  }
]

// 次の問題があるかどうか
const hasNextItem = computed(() => currentItemIndex.value < items.length - 1)

// Player準備完了ハンドラ
const handlePlayerReady = (player) => {
  qti3Player = player
  // 最初の問題を自動読み込み
  loadCurrentItem()
}

// アイテム読み込み完了ハンドラ
const handleItemReady = () => {
  isItemLoaded.value = true
  isScored.value = false
  hasResponse.value = true // 簡易的に常にtrue（実際は回答検知が必要）
  score.value = null
}

// 採点完了ハンドラ
const handleEndAttempt = (data) => {
  const attemptState = data.state || data
  if (attemptState.outcomeVariables) {
    const scoreOutcome = attemptState.outcomeVariables.find(v => v.identifier === 'SCORE')
    if (scoreOutcome) {
      score.value = scoreOutcome.value
      isScored.value = true
    }
  }
}

// 現在の問題を読み込み
const loadCurrentItem = () => {
  if (!qti3Player) return

  const item = items[currentItemIndex.value]
  const configuration = {
    guid: `item-${Date.now()}`,
    pnp: {
      textAppearance: { colorStyle: 'qti3-player-color-default' },
      glossaryOnScreen: true
    }
  }

  qti3Player.loadItemFromXml(item.xml, configuration)
}

// 次の問題へ
const goToNextItem = () => {
  if (hasNextItem.value) {
    currentItemIndex.value++
    isItemLoaded.value = false
    isScored.value = false
    score.value = null
    loadCurrentItem()
  }
}

// 最初からやり直す
const restart = () => {
  currentItemIndex.value = 0
  isItemLoaded.value = false
  isScored.value = false
  score.value = null
  loadCurrentItem()
}

// 採点実行
const submitResponse = () => {
  if (!qti3Player) return
  qti3Player.endAttempt()
}
</script>

<style>
.test-runner {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.question-progress {
  margin-bottom: 10px;
  font-size: 14px;
  color: #666;
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

.player-container {
  border: 1px solid #ccc;
  padding: 20px;
  min-height: 200px;
  overflow: hidden;
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
}

.complete-message p {
  margin-bottom: 10px;
  font-weight: bold;
}

.complete-message button {
  padding: 10px 20px;
  font-size: 14px;
  cursor: pointer;
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
