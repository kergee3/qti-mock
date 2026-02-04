<template>
  <div class="qti-player-app" :class="[fontClass, { 'vertical-layout': isVerticalWriting }]" :style="{ fontFamily: fontStyle, ...fontSizeStyle }">
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

      <!-- メインコンテンツ: 縦書き時は横並び、横書き時は縦並び -->
      <div
        class="main-content"
        :class="{
          'main-content-vertical': isVerticalWriting,
          'hidden': isLoading || !isItemLoaded
        }"
      >
        <!-- 縦書き時: 回答/結果エリア（HTMLで先に配置、CSSで右側の問題の左隣に） -->
        <div v-if="isVerticalWriting" class="vertical-controls-area">
          <!-- 回答ボタン -->
          <div v-if="isItemLoaded && !isScored" class="controls-vertical">
            <button @click="submitResponse" :disabled="isSubmitting">
              <template v-if="isSubmitting">
                <ruby v-if="rubyEnabled">送信中<rt>そうしんちゅう</rt></ruby>
                <template v-else>送信中</template>
              </template>
              <template v-else>
                <ruby v-if="rubyEnabled">回答<rt>かいとう</rt></ruby>
                <template v-else>回答</template>
              </template>
            </button>
          </div>

          <!-- 結果表示（フィードバックがない場合のみ表示） -->
          <div v-if="isScored && !currentFeedback" class="result-vertical">
            <span class="result-label">
              <ruby v-if="rubyEnabled">回答済<rt>かいとうずみ</rt></ruby>
              <template v-else>回答済</template>
            </span>
            <span v-if="score >= 1" class="correct">
              <ruby v-if="rubyEnabled">正解<rt>せいかい</rt></ruby>
              <template v-else>正解</template>
            </span>
            <span v-else-if="noScoringLogic" class="external-scored">
              <ruby v-if="rubyEnabled">未採点<rt>みさいてん</rt></ruby>
              <template v-else>未採点</template>
            </span>
            <span v-else-if="isExternalScored" class="external-scored">
              <ruby v-if="rubyEnabled">未採点<rt>みさいてん</rt></ruby>
              <template v-else>未採点</template>
            </span>
            <span v-else class="incorrect">
              <ruby v-if="rubyEnabled">不正解<rt>ふせいかい</rt></ruby>
              <template v-else>不正解</template>
            </span>
          </div>
          <!-- フィードバック表示（縦書き） -->
          <div v-if="isScored && currentFeedback" class="feedback-vertical" v-html="processedFeedback"></div>
        </div>

        <!-- プレイヤー（常に1つだけ） -->
        <div class="player-container" :class="{ 'vertical-player': isVerticalWriting }">
          <Qti3Player
            ref="qti3player"
            container-class="qti3-player-container"
            @notifyQti3PlayerReady="handlePlayerReady"
            @notifyQti3ItemReady="handleItemReady"
            @notifyQti3EndAttemptCompleted="handleEndAttempt"
          />

          <!-- 音声入力ボタン（text-entry / extended-text） -->
          <VoiceInputButton
            v-if="voiceInputEnabled && hasTextInputInteraction && isItemLoaded && !isScored"
            target-selector=".qti-text-entry-interaction input, .qti-extended-text-interaction textarea"
            lang="ja-JP"
          />
        </div>

        <!-- 横書き時: 下に回答/結果 -->
        <template v-if="!isVerticalWriting">
          <!-- 回答ボタン -->
          <div v-if="isItemLoaded && !isScored" class="controls">
            <button @click="submitResponse" :disabled="isSubmitting">
              <template v-if="isSubmitting">
                <ruby v-if="rubyEnabled">送信中<rt>そうしんちゅう</rt></ruby>
                <template v-else>送信中...</template>
              </template>
              <template v-else>
                <ruby v-if="rubyEnabled">回答<rt>かいとう</rt></ruby>
                <template v-else>回答</template>
              </template>
            </button>
          </div>

          <!-- 結果表示 -->
          <div v-if="isScored && !currentFeedback" class="result">
            <span class="result-label">
              <ruby v-if="rubyEnabled">回答済<rt>かいとうずみ</rt></ruby>
              <template v-else>回答済</template>：
            </span>
            <span v-if="score >= 1" class="correct">
              <ruby v-if="rubyEnabled">正解<rt>せいかい</rt></ruby>
              <template v-else>正解</template>
            </span>
            <span v-else-if="noScoringLogic" class="external-scored">
              <template v-if="rubyEnabled"><ruby>未採点<rt>みさいてん</rt></ruby>（<ruby>採点<rt>さいてん</rt></ruby>ロジックなし）</template>
              <template v-else>未採点（採点ロジックなし）</template>
            </span>
            <span v-else-if="isExternalScored" class="external-scored">
              <ruby v-if="rubyEnabled">未採点<rt>みさいてん</rt></ruby>
              <template v-else>未採点</template>
            </span>
            <span v-else class="incorrect">
              <ruby v-if="rubyEnabled">不正解<rt>ふせいかい</rt></ruby>
              <template v-else>不正解</template>
              <template v-if="correctAnswer">
                <template v-if="rubyEnabled">。<ruby>正解<rt>せいかい</rt></ruby>は「{{ correctAnswer }}」です。</template>
                <template v-else>。正解は「{{ correctAnswer }}」です。</template>
              </template>
            </span>
          </div>
          <!-- フィードバック表示（横書き） -->
          <div v-if="isScored && currentFeedback" class="feedback" v-html="processedFeedback"></div>
        </template>
      </div>

      <!-- 送信エラー -->
      <div v-if="submitError" class="submit-error">
        結果送信エラー: {{ submitError }}
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useItemLoader } from './composables/useItemLoader'
import { useResultSubmit } from './composables/useResultSubmit'
import VoiceInputButton from './components/VoiceInputButton.vue'

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

// 音声入力の有効/無効
const voiceInputEnabled = ref(true)

// ルビ表示の有効/無効
const rubyEnabled = ref(true)

// テキスト入力系インタラクション（extended-text または text-entry）があるかどうか
const hasTextInputInteraction = computed(() => {
  if (!itemXml.value) return false
  return itemXml.value.includes('qti-extended-text-interaction') ||
         itemXml.value.includes('qti-text-entry-interaction')
})

// モーダルフィードバック
const modalFeedbacks = ref({}) // { identifier: { content: HTMLコンテンツ, outcomeIdentifier: 'FEEDBACK' } }
const currentFeedback = ref(null) // 表示するフィードバックのHTMLコンテンツ

// フィードバックHTML内の「正解」「不正解」にルビを追加（rubyEnabled時のみ）
const processedFeedback = computed(() => {
  if (!currentFeedback.value) return null
  if (!rubyEnabled.value) return currentFeedback.value

  let html = currentFeedback.value
  // 「不正解」を先に置換（「正解」が部分一致しないよう）
  // 既にrubyタグ内にあるテキストは置換しない（負の後読みで<rt>直後を除外）
  html = html.replace(/(?<!<ruby>)不正解(?!<\/ruby>|<rt>)/g, '<ruby>不正解<rt>ふせいかい</rt></ruby>')
  html = html.replace(/(?<!<ruby>|不)正解(?!<\/ruby>|<rt>)/g, '<ruby>正解<rt>せいかい</rt></ruby>')
  html = html.replace(/(?<!<ruby>)残念(?!<\/ruby>|<rt>)/g, '<ruby>残念<rt>ざんねん</rt></ruby>')
  return html
})

// フォント設定
const fontFamily = ref('system')

// フォントサイズ設定（100 = 100%）
const fontSize = ref(100)

// フォントサイズをCSS変数として適用するスタイル
const fontSizeStyle = computed(() => {
  return {
    '--qti-font-size': fontSize.value / 100
  }
})

// フォントサイズが変更されたらQTI Playerコンテナに直接スタイルを適用
const applyFontSizeToPlayer = () => {
  const scale = fontSize.value / 100
  const container = document.querySelector('.qti3-player-container')
  if (container) {
    // zoomプロパティを使用（レイアウトも含めて拡大縮小）
    // Firefoxではサポートされていないが、Safari/Chromeでは動作する
    container.style.zoom = String(scale)
    // Firefoxフォールバック: transformを使用
    if (!('zoom' in document.body.style)) {
      container.style.transform = `scale(${scale})`
      container.style.transformOrigin = 'top left'
    }
  }
}

// 縦書きかどうか（XMLの内容から判定）
const isVerticalWriting = ref(false)

// XMLから縦書きかどうかを判定（文字列検索 - 高速）
const detectWritingDirection = (xml) => {
  if (!xml) return false
  return xml.includes('qti3-player-writing-mode-vertical-rl')
}

// html要素に縦書きクラスを追加/削除
const updateHtmlWritingClass = (isVertical) => {
  if (isVertical) {
    document.documentElement.classList.add('vertical-writing')
  } else {
    document.documentElement.classList.remove('vertical-writing')
  }
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
    case 'klee-one':
      return '"Klee One", cursive'
    case 'ud-digikyo':
      return '"UD Digi Kyokasho N-R", "UD デジタル 教科書体 N", sans-serif'
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

// XMLからモーダルフィードバックを抽出
const extractModalFeedbacks = (xml) => {
  if (!xml) return {}

  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, 'text/xml')

    const feedbacks = {}
    const modalFeedbackElements = doc.querySelectorAll('qti-modal-feedback')

    modalFeedbackElements.forEach(feedback => {
      const identifier = feedback.getAttribute('identifier')
      const outcomeIdentifier = feedback.getAttribute('outcome-identifier')
      const showHide = feedback.getAttribute('show-hide') || 'show'

      if (identifier && showHide === 'show') {
        // qti-content-body内のHTMLを取得
        const contentBody = feedback.querySelector('qti-content-body')
        if (contentBody) {
          feedbacks[identifier] = {
            content: contentBody.innerHTML,
            outcomeIdentifier: outcomeIdentifier
          }
        }
      }
    })

    return feedbacks
  } catch (e) {
    console.error('Error extracting modal feedbacks:', e)
    return {}
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
  const validFonts = ['noto-sans-jp', 'noto-serif-jp', 'biz-udpgothic', 'biz-udpmincho', 'source-han-sans', 'kosugi-maru', 'klee-one', 'ud-digikyo']
  if (fontParam && validFonts.includes(fontParam)) {
    fontFamily.value = fontParam
    // Google Fontsを動的に読み込み（システムフォントは除く）
    if (fontParam !== 'ud-digikyo') {
      loadGoogleFont(fontParam)
    }
  }

  // フォントサイズ設定
  const fontSizeParam = params.get('fontSize')
  if (fontSizeParam) {
    const parsedSize = parseInt(fontSizeParam, 10)
    const validSizes = [80, 90, 100, 110, 120, 130, 150]
    if (validSizes.includes(parsedSize)) {
      fontSize.value = parsedSize
    }
  }

  // 音声入力設定
  const voiceParam = params.get('voice')
  if (voiceParam === 'false') {
    voiceInputEnabled.value = false
  }

  // ルビ表示設定
  const rubyParam = params.get('ruby')
  if (rubyParam === 'false') {
    rubyEnabled.value = false
  }

  loadItem()

})

onUnmounted(() => {
  window.removeEventListener('message', handleParentMessage)
})

// Google Fontsを動的に読み込む
const loadGoogleFont = (fontKey) => {
  const fontUrls = {
    'noto-sans-jp': 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap',
    'noto-serif-jp': 'https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;500;700&display=swap',
    'biz-udpgothic': 'https://fonts.googleapis.com/css2?family=BIZ+UDPGothic:wght@400;700&display=swap',
    'biz-udpmincho': 'https://fonts.googleapis.com/css2?family=BIZ+UDPMincho&display=swap',
    'source-han-sans': 'https://fonts.googleapis.com/css2?family=Source+Han+Sans+JP:wght@400;500;700&display=swap',
    'kosugi-maru': 'https://fonts.googleapis.com/css2?family=Kosugi+Maru&display=swap',
    'klee-one': 'https://fonts.googleapis.com/css2?family=Klee+One:wght@400;600&display=swap'
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
    const isVertical = detectWritingDirection(newXml)
    isVerticalWriting.value = isVertical
    updateHtmlWritingClass(isVertical)
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
  currentFeedback.value = null

  // フォントサイズを適用
  applyFontSizeToPlayer()

  // XMLから正解情報を抽出
  const { answer, isExternal, noScoringLogic: noLogic } = extractCorrectAnswer(itemXml.value)
  correctAnswer.value = answer
  isExternalScored.value = isExternal
  noScoringLogic.value = noLogic

  // XMLからモーダルフィードバックを抽出
  modalFeedbacks.value = extractModalFeedbacks(itemXml.value)

  // 縦書き時はスクロール位置を右端（読み始め）に設定
  if (isVerticalWriting.value) {
    setTimeout(() => {
      const playerContainer = document.querySelector('.main-content-vertical .player-container')
      if (playerContainer) {
        playerContainer.scrollLeft = playerContainer.scrollWidth
      }
    }, 150)
  }

  // 親ウィンドウに問題読み込み完了を通知
  postMessageToParent({
    type: 'ITEM_LOADED',
    itemId: currentItemId.value
  })

  // iPadOS対応: 縦書き時のinlineChoiceドロップダウン位置を修正
  if (isVerticalWriting.value) {
    setupInlineChoicePositionFix()
  }
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

      // モーダルフィードバックを探す
      // FEEDBACK変数の値に対応するフィードバックを取得
      const feedbackOutcome = attemptState.outcomeVariables.find(
        v => v.identifier === 'FEEDBACK'
      )
      if (feedbackOutcome && feedbackOutcome.value) {
        const feedbackId = feedbackOutcome.value
        const feedback = modalFeedbacks.value[feedbackId]
        if (feedback) {
          currentFeedback.value = feedback.content
        }
      }

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

// iPadOS対応: 縦書き時のinlineChoiceドロップダウン位置修正
// WebKitのwriting-mode: vertical-rlとposition: absoluteの組み合わせで
// 位置計算がおかしくなるバグを回避
const setupInlineChoicePositionFix = () => {
  // iPadOS/iOSの判定
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

  if (!isIOS) return

  setTimeout(() => {
    // すべてのinlineChoice buttonにクリックイベントを追加
    const buttons = document.querySelectorAll('.inline-choice-select-prompt button')

    buttons.forEach(button => {
      button.addEventListener('click', () => {
        // 少し遅延してlistboxが表示されてから位置を調整
        requestAnimationFrame(() => {
          setTimeout(() => {
            fixListboxPosition(button)
          }, 10)
        })
      })
    })
  }, 200)
}

// listboxの位置をボタンに合わせて調整
const fixListboxPosition = (button) => {
  const wrapper = button.closest('.inline-choice-wrapper')
  if (!wrapper) return

  const listbox = wrapper.querySelector('.inline-choice-select-listbox')
  if (!listbox || listbox.classList.contains('inline-choice-select-listbox-hidden')) return

  // ボタンの位置を取得
  const buttonRect = button.getBoundingClientRect()
  const wrapperRect = wrapper.getBoundingClientRect()

  // listboxのサイズを取得
  const listboxRect = listbox.getBoundingClientRect()

  // 縦書きの場合、listboxをボタンの下に配置
  // ボタンの下端からlistboxを表示
  const topOffset = buttonRect.bottom - wrapperRect.top + 4

  // 横位置はボタンの左端に合わせる
  const leftOffset = buttonRect.left - wrapperRect.left

  // 画面外にはみ出す場合の調整
  const viewportHeight = window.innerHeight
  const viewportWidth = window.innerWidth

  let finalTop = topOffset
  let finalLeft = leftOffset

  // 下にはみ出す場合は上に表示
  if (buttonRect.bottom + listboxRect.height > viewportHeight) {
    finalTop = buttonRect.top - wrapperRect.top - listboxRect.height - 4
  }

  // 右にはみ出す場合は左にずらす
  if (buttonRect.left + listboxRect.width > viewportWidth) {
    finalLeft = viewportWidth - wrapperRect.left - listboxRect.width - 10
  }

  // スタイルを適用
  listbox.style.position = 'absolute'
  listbox.style.top = `${finalTop}px`
  listbox.style.left = `${finalLeft}px`
  listbox.style.transform = 'none'
}
</script>

<style scoped>
.qti-player-app {
  width: 100%;
  padding: 4px;
}

.qti-player-app.vertical-layout {
  /* Safari対応: dvhの代わりにvhを使用 */
  height: 100vh;
  max-height: 100vh;
  box-sizing: border-box;
  overflow: hidden;
  width: 100%;
  padding: 0;
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
}

.player-container.hidden {
  position: absolute;
  left: -9999px;
  visibility: hidden;
}

/* 横書き用レイアウト */
.controls {
  margin-top: 8px;
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

/* メインコンテンツ */
.main-content {
  display: flex;
  flex-direction: column;
}

.main-content.hidden {
  position: absolute;
  left: -9999px;
  visibility: hidden;
}

/* 縦書き用レイアウト: 回答ボタン（左固定）+ 問題領域（右、スクロール可能）*/
.main-content-vertical {
  flex-direction: row;
  justify-content: flex-end; /* 右端揃え */
  align-items: stretch;
  height: 100dvh;
  max-height: 100dvh;
  overflow: hidden; /* Safari対応: visible→hiddenに変更 */
  width: 100%;
}

@supports not (height: 100dvh) {
  .main-content-vertical {
    height: 100vh;
    max-height: 100vh;
  }
}

.main-content-vertical .player-container {
  flex: 1 1 auto; /* Safari対応: flex-shrinkを1に */
  height: 100%;
  max-height: 100%;
  min-width: 0; /* Safari対応: flexアイテムの最小幅を0に */
  overflow-x: scroll; /* 常にスクロールバーを表示 */
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch; /* iOS Safari: 慣性スクロール有効化 */
  position: relative;
  display: flex;
  justify-content: flex-end; /* 内容を右寄せ */
}

/* モバイル縦画面: player-containerが残りのスペースを使う */
@media (max-width: 600px) and (orientation: portrait) {
  .main-content-vertical .player-container {
    flex: 1 1 0;
    min-width: 0;
    overflow-x: scroll;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
  }
}

.vertical-controls-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 8px 12px; /* 左右のパディングを増やす */
  flex-shrink: 0;
  min-width: 60px; /* 最小幅を設定 */
  border-right: 1px solid #ccc; /* 問題領域との境界線 */
  margin-right: 8px;
}

.controls-vertical {
  writing-mode: vertical-rl;
}

.controls-vertical button {
  padding: 20px 10px;
  font-size: 16px;
  cursor: pointer;
  writing-mode: vertical-rl;
  letter-spacing: 0.2em;
}

.controls-vertical button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.result-vertical {
  writing-mode: vertical-rl;
  padding: 15px 8px;
  background: #f5f5f5;
  border-radius: 4px;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  letter-spacing: 0.1em; /* 文字間隔を少し狭くして収まりやすく */
  white-space: nowrap; /* 改行を防止 */
  font-size: 14px; /* フォントサイズを少し小さく */
}

.result-vertical .result-label {
  font-weight: bold;
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

/* フィードバック表示（横書き） */
.feedback {
  margin-top: 8px;
  padding: 15px 20px;
  background: #e3f2fd;
  border-left: 4px solid #1976d2;
  border-radius: 4px;
  line-height: 1.6;
}

.feedback :deep(p) {
  margin: 0 0 8px 0;
}

.feedback :deep(p:last-child) {
  margin-bottom: 0;
}

/* フィードバック表示（縦書き） */
.feedback-vertical {
  writing-mode: vertical-rl;
  padding: 12px 15px;
  background: #e3f2fd;
  border-top: 4px solid #1976d2;
  border-radius: 4px;
  line-height: 1.8;
  max-height: 60vh;
  overflow-y: auto;
  font-size: 14px;
}

.feedback-vertical :deep(p) {
  margin: 0 8px 0 0;
}

.feedback-vertical :deep(p:last-child) {
  margin-right: 0;
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
/* 縦書きレイアウト時: html, body, #app を100vh高さに設定 */
/* Safari対応: dvhの代わりにvhを使用 */
html.vertical-writing {
  height: 100vh !important;
  max-height: 100vh !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
  box-sizing: border-box !important;
}

html.vertical-writing body,
html.vertical-writing #app {
  height: 100vh !important;
  max-height: 100vh !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
  box-sizing: border-box !important;
}

/* 縦書きレイアウト時の設定（グローバル） */
/* すべての要素にbox-sizing: border-boxを適用 */
.vertical-layout,
.vertical-layout *,
.vertical-layout *::before,
.vertical-layout *::after {
  box-sizing: border-box !important;
}

/* 縦書きレイアウト: 回答ボタン（左固定）+ 問題領域（右、スクロール可能）*/
/* Safari対応: dvhの代わりにvhを使用 */
.vertical-layout .main-content-vertical {
  height: 100vh !important;
  max-height: 100vh !important;
  overflow: hidden !important; /* Safari対応: visible→hiddenに */
  width: 100% !important;
  flex-direction: row !important;
  justify-content: flex-end !important; /* 右端揃え */
  position: relative !important;
}

.vertical-layout .main-content-vertical .player-container {
  flex: 1 1 auto !important; /* Safari対応: flex-shrinkを1に */
  min-width: 0 !important; /* Safari対応: flexアイテムの最小幅を0に */
  overflow-x: scroll !important; /* 常にスクロールバーを表示 */
  overflow-y: hidden !important;
  -webkit-overflow-scrolling: touch !important; /* iOS Safari: 慣性スクロール有効化 */
  display: flex !important;
  justify-content: flex-end !important; /* 内容を右寄せ */
}

/* Safari用: スクロールバーを常に表示 */
.vertical-layout .main-content-vertical .player-container::-webkit-scrollbar {
  -webkit-appearance: none !important;
  height: 14px !important; /* 横スクロールバーの高さを大きく */
  display: block !important; /* Safari対応: 強制表示 */
}

.vertical-layout .main-content-vertical .player-container::-webkit-scrollbar-track {
  background-color: #e0e0e0 !important; /* より目立つ色 */
  border: 1px solid #ccc !important; /* ボーダーを追加 */
}

.vertical-layout .main-content-vertical .player-container::-webkit-scrollbar-thumb {
  background-color: #666 !important; /* より濃い色 */
  border: 1px solid #555 !important; /* ボーダーを追加 */
  min-width: 50px !important; /* 最小幅を設定 */
}

.vertical-layout .main-content-vertical .player-container::-webkit-scrollbar-thumb:hover {
  background-color: #444 !important;
}

/* Safari対応: padding-bottomでスクロールバー用のスペースを確保 */
.vertical-layout .main-content-vertical .player-container {
  padding-bottom: 0px !important; /* paddingは不要（スクロールバーは外側） */
}

/* モバイル縦画面: player-containerが残りのスペースを使う */
@media (max-width: 600px) and (orientation: portrait) {
  .vertical-layout .main-content-vertical .player-container {
    flex: 1 1 0 !important;
    min-width: 0 !important;
    overflow-x: scroll !important;
    overflow-y: hidden !important;
    -webkit-overflow-scrolling: touch !important;
  }
}

.vertical-layout .main-content-vertical .vertical-controls-area {
  flex-shrink: 0 !important;
  background: white !important;
}

/* player-container: スクロール領域 */
.vertical-layout .player-container {
  height: 100% !important;
  max-height: 100% !important;
  padding: 0 4px !important; /* 左右のみパディング */
  border: none !important;
}

/* 内部要素: player-containerの内側で内容に応じた幅 */
/* Safari対応: max-contentで内容の最大幅を確保 + flex-shrinkで縮小防止 */
.vertical-layout .qti3-player-container {
  height: 100% !important;
  max-height: 100% !important;
  overflow: visible !important; /* inlineChoiceドロップダウン用 */
  width: max-content !important; /* Safari対応: 内容の最大幅を使用 */
  flex-shrink: 0 !important; /* Safari対応: flexboxで縮小しない */
  display: block !important;
}

.vertical-layout .qti-assessment-item {
  height: 100% !important;
  max-height: 100% !important;
  overflow: visible !important; /* inlineChoiceドロップダウン用 */
  width: max-content !important; /* Safari対応: 内容の最大幅を使用 */
  flex-shrink: 0 !important; /* Safari対応: flexboxで縮小しない */
  display: block !important;
}

.vertical-layout .qti-item-body {
  height: 100% !important;
  max-height: 100% !important;
  overflow: visible !important; /* inlineChoiceドロップダウン用 */
  width: max-content !important; /* Safari対応: 内容の最大幅を使用 */
  flex-shrink: 0 !important; /* Safari対応: flexboxで縮小しない */
  display: block !important;
}

/* 縦書きコンテンツ・共有刺激・高さ指定要素: 高さを固定（上下マージン確保） */
.vertical-layout [class*="qti3-player-writing-mode-vertical"]:not(.qti-item-body),
.vertical-layout .qti-shared-stimulus,
.vertical-layout [class*="qti-height-"]:not(.qti-item-body) {
  height: calc(100% - 24px) !important;
  max-height: calc(100% - 24px) !important;
  margin-top: 12px !important;
  margin-bottom: 12px !important;
  width: max-content !important; /* Safari対応: 内容の最大幅を使用 */
  overflow: visible !important; /* inlineChoiceドロップダウン用 */
}

/* QTI3 Player 選択肢の幅調整（グローバル） */
.player-container ul.qti-choice-list.qti-orientation-vertical {
  display: flex !important;
  flex-direction: column !important;
  align-items: flex-start !important;
}

.player-container ul.qti-choice-list.qti-orientation-vertical > li {
  width: auto !important;
}

/* Safari対応: 選択肢のハイライト表示を確実にする */
.player-container [role="radio"]:before,
.player-container [role="checkbox"]:before {
  /* Safari で背景色の変化を強制的に描画 */
  will-change: background-color, border-color !important;
  /* GPU アクセラレーションを有効化（疑似要素のみに適用） */
  -webkit-backface-visibility: hidden !important;
  backface-visibility: hidden !important;
}

.player-container [role="radio"][aria-checked="true"]:before,
.player-container [role="checkbox"][aria-checked="true"]:before {
  /* Safari で選択状態の描画を強制 */
  -webkit-backface-visibility: hidden !important;
  backface-visibility: hidden !important;
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

.font-ud-digikyo,
.font-ud-digikyo * {
  font-family: "UD Digi Kyokasho N-R", "UD デジタル 教科書体 N", sans-serif !important;
}

/* qti3-player-containerの固定幅と中央揃えを解除（横書き・縦書き共通） */
.qti3-player-container {
  width: 100% !important;
  max-width: 100% !important;
  margin-left: 0 !important;
  margin-right: 0 !important;
}

/* 縦書き時のinlineChoice ドロップダウン表示のためのスタイル */
.vertical-layout .qti-inline-choice-interaction,
.vertical-layout .inline-choice-wrapper,
.vertical-layout .inline-choice-select-prompt {
  overflow: visible !important;
  position: relative !important;
  z-index: 100 !important;
}

.vertical-layout .inline-choice-select-prompt button {
  pointer-events: auto !important;
  cursor: pointer !important;
  position: relative !important;
  z-index: 101 !important;
}

/* ドロップダウンリストボックス - 最前面に表示 */
/* iPadOS Safari/Chrome では position: fixed と writing-mode: vertical-rl の組み合わせで */
/* 座標計算がおかしくなるため、position: absolute を維持 */
.vertical-layout [role="listbox"],
.vertical-layout .inline-choice-select-listbox {
  z-index: 10000 !important;
  pointer-events: auto !important;
  position: absolute !important; /* iPadOS対応: fixedではなくabsoluteを使用 */
  overflow: visible !important;
}

/* iPadOS対応: listboxの親要素（inline-choice-wrapper）を相対位置に設定 */
.vertical-layout .qti-inline-choice-interaction {
  position: relative !important;
  overflow: visible !important;
  z-index: 100 !important;
}

/* iPadOS対応: 縦書きコンテナでのoverflow:visibleを確保 */
.vertical-layout .inline-choice-wrapper {
  position: relative !important;
  overflow: visible !important;
}

/* ========================================
   フォントサイズ設定（グローバル）
   JavaScriptから直接transform: scale()を適用
   handleItemReady()でapplyFontSizeToPlayer()を呼び出し
   ======================================== */

/* ========================================
   選択肢の配置修正（横書き時）
   ======================================== */

/*
 * 注意: ライブラリのデフォルトCSS:
 * .qti-choice-label: display: inline-block; vertical-align: top; width: 1.5rem;
 * .qti-choice-description: display: inline-block; vertical-align: top; width: calc(100% - 1.5em);
 *
 * デフォルトではラベルと説明文が横に並ぶはず。
 * 以下は必要最小限の調整のみ。
 */

/* ルビ要素のスタイル調整（横書き時のみ） */
.qti-player-app:not(.vertical-layout) .qti-choice-description ruby {
  ruby-position: over !important;
  ruby-align: center !important;
}

.qti-player-app:not(.vertical-layout) .qti-choice-description rt {
  font-size: 0.5em !important;
  line-height: 1 !important;
}

/* 縦書き時: 元のレイアウトを維持 */
.vertical-layout .qti-simple-choice,
.vertical-layout li[role="radio"],
.vertical-layout li[role="checkbox"] {
  display: block !important;
  align-items: initial !important;
}

.vertical-layout .qti-choice-label {
  display: inline-block !important;
  vertical-align: top !important;
}

.vertical-layout .qti-choice-description {
  display: inline-block !important;
  vertical-align: top !important;
}

/* フォントクラス - QTI Playerライブラリ内部にも強制適用 */
.font-klee-one,
.font-klee-one * {
  font-family: "Klee One", cursive !important;
  font-weight: 600 !important;
}
</style>
