<template>
  <div class="qti-player-app" :class="fontClass" :style="{ fontFamily: fontStyle }">
    <!-- エラー -->
    <div v-if="error" class="error">
      <p>{{ error }}</p>
      <p class="error-hint">
        使用方法: ?item=XMLのURL&amp;callback=結果送信先URL&amp;session=セッションID
      </p>
    </div>

    <!-- プレイヤー -->
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
      <div v-if="isItemLoaded && !isScored" class="controls" :class="{ 'controls-rtl': isVerticalWriting }">
        <button @click="submitResponse" :disabled="isSubmitting">
          {{ isSubmitting ? '送信中...' : '回答' }}
        </button>
      </div>

      <!-- 結果表示 -->
      <div v-if="isScored" class="result">
        <span class="result-label">回答済：</span>
        <span v-if="score >= 1" class="correct">正解</span>
        <span v-else-if="noScoringLogic" class="external-scored">未採点（採点ロジックなし）</span>
        <span v-else-if="isExternalScored" class="external-scored">未採点</span>
        <span v-else class="incorrect">
          不正解<template v-if="correctAnswer">。正解は「{{ correctAnswer }}」です。</template>
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
const { isSubmitting, submitError, submitResult } = useResultSubmit()

const isPlayerReady = ref(false)
const isItemLoaded = ref(false)
const isScored = ref(false)
const score = ref(null)
const currentItemId = ref(null)
const correctAnswer = ref(null)
const isExternalScored = ref(false)
const noScoringLogic = ref(false)

// フォント設定
const fontFamily = ref('system')

// 縦書きかどうか（XMLの内容から判定）
const isVerticalWriting = ref(false)

// XMLから縦書きかどうかを判定（文字列検索 - 高速）
const detectWritingDirection = (xml) => {
  if (!xml) return false
  return xml.includes('qti3-player-writing-mode-vertical-rl')
}

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

// responseVariablesから回答テキストとdurationを抽出
// 除外する変数（メタ情報）
const EXCLUDED_VARIABLES = ['numAttempts', 'duration']

// HTMLタグを除去してテキストのみ抽出
const stripHtmlTags = (str) => {
  if (typeof str !== 'string') return String(str)
  return str.replace(/<[^>]*>/g, '').trim()
}

const extractResponseData = (responseVariables) => {
  // 配列でもオブジェクトでも対応
  if (!responseVariables) {
    return { response: '', duration: null }
  }

  const responses = []
  let duration = null

  // responseVariablesを配列に正規化
  let rvArray = []
  if (Array.isArray(responseVariables)) {
    rvArray = responseVariables
  } else if (typeof responseVariables === 'object') {
    // オブジェクトの場合はエントリを配列化
    rvArray = Object.entries(responseVariables).map(([identifier, value]) => ({
      identifier,
      value: typeof value === 'object' && value !== null && 'value' in value ? value.value : value
    }))
  }

  if (rvArray.length === 0) {
    return { response: '', duration: null }
  }

  for (const rv of rvArray) {
    const identifier = rv.identifier || rv.id || ''
    const value = rv.value

    if (value === null || value === undefined) continue

    // durationは別途取得
    if (identifier === 'duration') {
      duration = typeof value === 'number' ? value : parseFloat(value) || null
      continue
    }

    // メタ変数は除外
    if (EXCLUDED_VARIABLES.includes(identifier)) continue

    // 配列の場合（複数選択、並べ替えなど）
    if (Array.isArray(value)) {
      if (value.length > 0) {
        const cleanedValues = value.map(v => stripHtmlTags(v))
        responses.push(cleanedValues.join(', '))
      }
    }
    // オブジェクトの場合（マッチングなど）
    else if (typeof value === 'object') {
      const pairs = Object.entries(value)
        .filter(([, v]) => v !== null && v !== undefined)
        .map(([k, v]) => `${stripHtmlTags(k)}-${stripHtmlTags(v)}`)
      if (pairs.length > 0) {
        responses.push(pairs.join(', '))
      }
    }
    // 文字列や数値の場合
    else if (value !== '') {
      responses.push(stripHtmlTags(String(value)))
    }
  }

  return {
    response: responses.join(' / '),
    duration: duration
  }
}

// XMLから正解情報を抽出
const extractCorrectAnswer = (xml) => {
  if (!xml) return { answer: null, isExternal: false, noScoringLogic: false }

  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, 'text/xml')

    // 外部採点かどうかを確認
    const outcomeDecl = doc.querySelector('qti-outcome-declaration[identifier="SCORE"]')
    if (outcomeDecl && outcomeDecl.getAttribute('external-scored') === 'human') {
      return { answer: null, isExternal: true, noScoringLogic: false }
    }

    // テキスト入力問題かどうかを確認
    const textEntryInteraction = doc.querySelector('qti-text-entry-interaction')
    const extendedTextInteraction = doc.querySelector('qti-extended-text-interaction')

    // 正解情報を取得
    const correctResponse = doc.querySelector('qti-correct-response qti-value')

    // 採点ロジック（response-processing）の有無を確認
    const responseProcessing = doc.querySelector('qti-response-processing')

    // テキスト入力問題で正解情報がない場合は外部採点扱い
    if ((textEntryInteraction || extendedTextInteraction) && !correctResponse) {
      return { answer: null, isExternal: true, noScoringLogic: false }
    }

    // 正解情報も採点ロジックもない場合は「採点不可」として扱う
    if (!correctResponse && !responseProcessing) {
      return { answer: null, isExternal: true, noScoringLogic: true }
    }

    if (!correctResponse) {
      return { answer: null, isExternal: false, noScoringLogic: false }
    }

    const correctIdentifier = correctResponse.textContent?.trim()
    if (!correctIdentifier) {
      return { answer: null, isExternal: false, noScoringLogic: false }
    }

    // 選択肢から正解のテキストを取得
    const simpleChoice = doc.querySelector(`qti-simple-choice[identifier="${correctIdentifier}"]`)
    if (simpleChoice) {
      return { answer: simpleChoice.textContent?.trim(), isExternal: false, noScoringLogic: false }
    }

    // テキスト入力問題の場合は正解テキストをそのまま返す
    if (textEntryInteraction || extendedTextInteraction) {
      return { answer: correctIdentifier, isExternal: false, noScoringLogic: false }
    }

    // 選択肢が見つからない場合は識別子を返す
    return { answer: correctIdentifier, isExternal: false, noScoringLogic: false }
  } catch (e) {
    console.error('Error extracting correct answer:', e)
    return { answer: null, isExternal: false, noScoringLogic: false }
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
}

onMounted(() => {
  // 親ウィンドウからのメッセージを受信
  window.addEventListener('message', handleParentMessage)

  // URLパラメータから設定を取得
  const params = new URLSearchParams(window.location.search)

  // フォント設定
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

// XMLが読み込まれたら縦書き判定を実行
watch(itemXml, (newXml) => {
  if (newXml) {
    isVerticalWriting.value = detectWritingDirection(newXml)
  }
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
}

const loadItemToPlayer = () => {
  if (!qti3Player || !itemXml.value) return

  // XMLからidentifierを抽出してitemIdとして使用
  const extractItemIdFromXml = (xml) => {
    try {
      const parser = new DOMParser()
      const doc = parser.parseFromString(xml, 'text/xml')
      const assessmentItem = doc.querySelector('qti-assessment-item')
      return assessmentItem?.getAttribute('identifier') || ''
    } catch {
      return ''
    }
  }

  // まずXMLのidentifierを試す
  const xmlIdentifier = extractItemIdFromXml(itemXml.value)
  if (xmlIdentifier) {
    currentItemId.value = xmlIdentifier
  } else {
    // フォールバック: URLからファイル名（拡張子なし）を抽出
    const params = new URLSearchParams(window.location.search)
    const itemUrl = params.get('item')
    if (itemUrl && !itemUrl.startsWith('data:')) {
      const fileName = itemUrl.split('/').pop()?.replace('.xml', '') || ''
      currentItemId.value = fileName
    }
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
  const { answer, isExternal, noScoringLogic: noLogic } = extractCorrectAnswer(itemXml.value)
  correctAnswer.value = answer
  isExternalScored.value = isExternal
  noScoringLogic.value = noLogic

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

      // 回答内容とdurationを抽出（表示用）
      const { response, duration } = extractResponseData(attemptState.responseVariables)

      // 親ウィンドウに回答完了を通知
      postMessageToParent({
        type: 'ITEM_ANSWERED',
        itemId: currentItemId.value,
        score: scoreOutcome.value,
        maxScore: 1,
        isExternalScored: isExternalScored.value,
        response: response,
        duration: duration,
        correctAnswer: correctAnswer.value
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
</script>

<style scoped>
.qti-player-app {
  width: 100%;
  padding: 4px;
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
  padding: 12px;
  min-height: 200px;
  overflow: hidden;
}

.player-container.hidden {
  position: absolute;
  left: -9999px;
  visibility: hidden;
}

.controls {
  margin-top: 8px;
}

.controls.controls-rtl {
  text-align: right;
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
  margin-top: 8px;
  padding: 10px 15px;
  background: #f5f5f5;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 15px;
}

.result .result-label {
  font-weight: bold;
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
  color: #ff9800;
  font-weight: bold;
}

.score-text {
  margin-left: auto;
}

.submit-error {
  margin-top: 10px;
  padding: 10px;
  background: #ffebee;
  color: #c62828;
  border-radius: 4px;
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
