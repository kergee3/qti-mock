<template>
  <!-- 非対応ブラウザでは非表示 -->
  <div v-if="isSupported" class="voice-input-container" :style="containerStyle">
    <!-- マイクボタン -->
    <button
      class="voice-input-button"
      :class="{
        'voice-input-button--listening': isListening,
        'voice-input-button--error': error
      }"
      @click="handleClick"
      :title="buttonTitle"
      type="button"
    >
      <!-- マイクアイコン（停止中） -->
      <svg v-if="!isListening" class="voice-icon" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/>
      </svg>

      <!-- 停止アイコン（録音中） -->
      <svg v-else class="voice-icon" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 6h12v12H6z"/>
      </svg>

      <!-- パルスアニメーション（録音中） -->
      <span v-if="isListening" class="voice-pulse"></span>
    </button>

    <!-- リアルタイム認識結果のツールチップ -->
    <div
      v-if="isListening && (interimTranscript || transcript)"
      class="voice-interim-tooltip"
    >
      <span class="voice-interim-final">{{ transcript }}</span>
      <span class="voice-interim-current">{{ interimTranscript }}</span>
    </div>

    <!-- エラー表示 -->
    <div v-if="error && !isListening" class="voice-error-tooltip">
      {{ error.message }}
    </div>
  </div>
</template>

<script setup>
import { computed, watch, onMounted, onUnmounted, ref } from 'vue'
import { useSpeechRecognition } from '../composables/useSpeechRecognition'

const props = defineProps({
  // ターゲット input/textarea の CSS セレクター（カンマ区切りで複数指定可）
  targetSelector: {
    type: String,
    default: '.qti-text-entry-interaction input, .qti-extended-text-interaction textarea'
  },
  // 言語設定
  lang: {
    type: String,
    default: 'ja-JP'
  }
})

const emit = defineEmits(['transcript', 'start', 'stop', 'error'])

const {
  isSupported,
  isListening,
  transcript,
  interimTranscript,
  error,
  toggle,
  reset
} = useSpeechRecognition({ lang: props.lang })

// ボタン位置（textarea に合わせて動的に配置）
const containerStyle = ref({})

// textarea を取得
const getTargetTextarea = () => {
  return document.querySelector(props.targetSelector)
}

// ボタン位置を更新
const updatePosition = () => {
  const textarea = getTargetTextarea()
  if (!textarea) {
    containerStyle.value = { display: 'none' }
    return
  }

  const rect = textarea.getBoundingClientRect()
  containerStyle.value = {
    position: 'fixed',
    top: `${rect.bottom - 48}px`,
    left: `${rect.right - 48}px`,
    zIndex: 1000
  }
}

// テキストを input/textarea に挿入
const injectText = (text) => {
  const element = getTargetTextarea()
  if (!element || !text) return

  // input[type="text"] や textarea の両方に対応
  const start = element.selectionStart ?? element.value.length
  const end = element.selectionEnd ?? element.value.length
  const before = element.value.slice(0, start)
  const after = element.value.slice(end)

  element.value = before + text + after

  // Vue/ライブラリへの変更通知
  element.dispatchEvent(new Event('input', { bubbles: true }))
  element.dispatchEvent(new Event('change', { bubbles: true }))

  // カーソル位置を更新
  const newPosition = start + text.length
  if (element.setSelectionRange) {
    element.setSelectionRange(newPosition, newPosition)
  }
  element.focus()
}

// 確定したテキストを監視して textarea に挿入
watch(transcript, (newValue, oldValue) => {
  if (newValue && newValue !== oldValue) {
    const addedText = newValue.slice(oldValue?.length || 0)
    if (addedText) {
      injectText(addedText)
      emit('transcript', addedText)
    }
  }
})

// エラーを監視
watch(error, (newError) => {
  if (newError) {
    emit('error', newError)
  }
})

// クリックハンドラ
const handleClick = () => {
  if (isListening.value) {
    emit('stop')
  } else {
    reset()
    emit('start')
  }
  toggle()
}

// ボタンのツールチップ
const buttonTitle = computed(() => {
  if (!isSupported.value) {
    return 'このブラウザは音声入力に対応していません'
  }
  if (isListening.value) {
    return '音声入力を停止'
  }
  if (error.value) {
    return error.value.message
  }
  return '音声入力を開始'
})

// 位置更新用の ResizeObserver と MutationObserver
let resizeObserver = null
let mutationObserver = null
let positionInterval = null

onMounted(() => {
  // 初期位置設定
  setTimeout(updatePosition, 100)

  // ウィンドウリサイズ時に位置更新
  window.addEventListener('resize', updatePosition)
  window.addEventListener('scroll', updatePosition, true)

  // textarea のサイズ変更を監視
  resizeObserver = new ResizeObserver(updatePosition)

  // DOM 変更を監視（textarea が後から追加される場合）
  mutationObserver = new MutationObserver(() => {
    const textarea = getTargetTextarea()
    if (textarea) {
      resizeObserver.observe(textarea)
      updatePosition()
    }
  })

  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true
  })

  // 定期的に位置を更新（スクロールなどに対応）
  positionInterval = setInterval(updatePosition, 500)

  // 初期 textarea があれば監視開始
  const textarea = getTargetTextarea()
  if (textarea) {
    resizeObserver.observe(textarea)
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', updatePosition)
  window.removeEventListener('scroll', updatePosition, true)

  if (resizeObserver) {
    resizeObserver.disconnect()
  }
  if (mutationObserver) {
    mutationObserver.disconnect()
  }
  if (positionInterval) {
    clearInterval(positionInterval)
  }
})
</script>

<style scoped>
.voice-input-container {
  pointer-events: auto;
}

.voice-input-button {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid #1976d2;
  background: white;
  color: #1976d2;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: all 0.2s ease;
  position: relative;
  padding: 0;
}

.voice-input-button:hover {
  background: #e3f2fd;
  transform: scale(1.05);
}

.voice-input-button:active {
  transform: scale(0.95);
}

.voice-input-button--listening {
  background: #1976d2;
  color: white;
  border-color: #1976d2;
}

.voice-input-button--listening:hover {
  background: #1565c0;
}

.voice-input-button--error {
  border-color: #f44336;
  color: #f44336;
}

.voice-icon {
  width: 20px;
  height: 20px;
}

/* パルスアニメーション */
.voice-pulse {
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 2px solid #1976d2;
  animation: voice-pulse-animation 1.5s infinite;
  pointer-events: none;
}

@keyframes voice-pulse-animation {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  100% {
    transform: scale(1.4);
    opacity: 0;
  }
}

/* リアルタイム認識結果ツールチップ */
.voice-interim-tooltip {
  position: fixed;
  bottom: auto;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 12px 20px;
  background: rgba(33, 33, 33, 0.95);
  color: white;
  border-radius: 12px;
  font-size: 16px;
  min-width: 200px;
  max-width: 80vw;
  word-wrap: break-word;
  white-space: pre-wrap;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  /* 縦書きモードでも横書きで表示 */
  writing-mode: horizontal-tb;
  text-orientation: mixed;
  direction: ltr;
  text-align: center;
  z-index: 10000;
}

.voice-interim-final {
  color: white;
}

.voice-interim-current {
  color: #90caf9;
  font-style: italic;
}

/* エラーツールチップ */
.voice-error-tooltip {
  position: fixed;
  bottom: auto;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 12px 20px;
  background: rgba(244, 67, 54, 0.95);
  color: white;
  border-radius: 12px;
  font-size: 14px;
  min-width: 200px;
  max-width: 80vw;
  word-wrap: break-word;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  /* 縦書きモードでも横書きで表示 */
  writing-mode: horizontal-tb;
  text-orientation: mixed;
  direction: ltr;
  text-align: center;
  z-index: 10000;
}
</style>
