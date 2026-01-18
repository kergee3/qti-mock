import { ref, onUnmounted } from 'vue'

/**
 * Web Speech API を使用した音声認識コンポーザブル
 * Chrome/Edge/Safari で動作、Firefox は非対応
 */
export function useSpeechRecognition(options = {}) {
  const {
    lang = 'ja-JP',
    continuous = true,
    interimResults = true,
  } = options

  // ブラウザ対応チェック
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  const isSupported = ref(!!SpeechRecognition)

  // 状態
  const isListening = ref(false)
  const transcript = ref('')
  const interimTranscript = ref('')
  const error = ref(null)

  // 認識インスタンス
  let recognition = null

  /**
   * 音声認識を開始
   */
  const start = () => {
    if (!isSupported.value) {
      error.value = {
        type: 'not-supported',
        message: 'このブラウザは音声入力に対応していません。Chrome または Safari をご利用ください。'
      }
      return false
    }

    // HTTPS チェック（localhost は例外）
    if (!window.isSecureContext && window.location.hostname !== 'localhost') {
      error.value = {
        type: 'insecure-context',
        message: '音声入力には HTTPS 接続が必要です。'
      }
      return false
    }

    try {
      recognition = new SpeechRecognition()
      recognition.lang = lang
      recognition.continuous = continuous
      recognition.interimResults = interimResults
      recognition.maxAlternatives = 1

      recognition.onstart = () => {
        isListening.value = true
        error.value = null
      }

      recognition.onresult = (event) => {
        let interim = ''
        let final = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          if (result.isFinal) {
            final += result[0].transcript
          } else {
            interim += result[0].transcript
          }
        }

        if (final) {
          transcript.value += final
        }
        interimTranscript.value = interim
      }

      recognition.onerror = (event) => {
        const errorMessages = {
          'not-allowed': 'マイクへのアクセスが許可されていません。ブラウザの設定を確認してください。',
          'no-speech': '音声が検出されませんでした。',
          'audio-capture': 'マイクにアクセスできませんでした。',
          'network': 'ネットワークエラーが発生しました。',
          'aborted': '音声認識が中断されました。',
          'service-not-allowed': '音声認識サービスが許可されていません。',
        }

        error.value = {
          type: event.error,
          message: errorMessages[event.error] || `音声認識エラー: ${event.error}`
        }

        // no-speech エラーは録音継続可能なので isListening は変更しない
        if (event.error !== 'no-speech') {
          isListening.value = false
        }
      }

      recognition.onend = () => {
        // continuous モードでも自動的に終了することがあるので再開
        if (isListening.value && continuous) {
          try {
            recognition.start()
          } catch {
            isListening.value = false
          }
        } else {
          isListening.value = false
        }
      }

      recognition.start()
      return true
    } catch (e) {
      error.value = {
        type: 'unknown',
        message: `音声認識の開始に失敗しました: ${e.message}`
      }
      return false
    }
  }

  /**
   * 音声認識を停止
   */
  const stop = () => {
    isListening.value = false
    if (recognition) {
      try {
        recognition.stop()
      } catch {
        // 既に停止している場合は無視
      }
    }
    interimTranscript.value = ''
  }

  /**
   * トランスクリプトをリセット
   */
  const reset = () => {
    transcript.value = ''
    interimTranscript.value = ''
    error.value = null
  }

  /**
   * 開始/停止をトグル
   */
  const toggle = () => {
    if (isListening.value) {
      stop()
    } else {
      start()
    }
  }

  // クリーンアップ
  onUnmounted(() => {
    if (recognition) {
      try {
        recognition.abort()
      } catch {
        // 無視
      }
    }
  })

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    error,
    start,
    stop,
    reset,
    toggle,
  }
}
