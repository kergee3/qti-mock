import { ref } from 'vue'

// セッションストレージのキー
const STORAGE_KEY = 'qti3_accumulated_results'

/**
 * セッションストレージから累積結果を復元
 */
const loadFromStorage = (sessionId) => {
  try {
    const stored = sessionStorage.getItem(`${STORAGE_KEY}_${sessionId}`)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.warn('Failed to load accumulated results from storage:', e)
  }
  return []
}

/**
 * セッションストレージに累積結果を保存
 */
const saveToStorage = (sessionId, results) => {
  try {
    sessionStorage.setItem(`${STORAGE_KEY}_${sessionId}`, JSON.stringify(results))
  } catch (e) {
    console.warn('Failed to save accumulated results to storage:', e)
  }
}

/**
 * セッションストレージから累積結果を削除
 */
const clearStorage = (sessionId) => {
  try {
    sessionStorage.removeItem(`${STORAGE_KEY}_${sessionId}`)
  } catch (e) {
    console.warn('Failed to clear accumulated results from storage:', e)
  }
}

/**
 * 採点結果をcallback URLに送信するコンポーザブル
 * サーバーレス環境対応: クライアント側で累積結果を管理（sessionStorage使用）
 */
export function useResultSubmit() {
  const isSubmitting = ref(false)
  const submitError = ref(null)
  const nextItemUrl = ref(null)
  const isComplete = ref(false)
  const summary = ref(null)
  const accumulatedResults = ref([])

  /**
   * 累積結果をリセット（セッション開始時に呼び出す）
   */
  const resetResults = () => {
    const params = new URLSearchParams(window.location.search)
    const sessionId = params.get('session')
    if (sessionId) {
      clearStorage(sessionId)
    }
    accumulatedResults.value = []
    isComplete.value = false
    summary.value = null
    nextItemUrl.value = null
  }

  /**
   * 採点結果をcallback URLにPOSTする
   * @param {string} itemId - 問題ID
   * @param {object} result - 採点結果
   */
  const submitResult = async (itemId, result) => {
    const params = new URLSearchParams(window.location.search)
    const callbackUrl = params.get('callback')
    const sessionId = params.get('session')
    const token = params.get('token')

    if (!callbackUrl || !sessionId) {
      submitError.value = 'callback and session parameters are required'
      return false
    }

    isSubmitting.value = true
    submitError.value = null

    try {
      // sessionStorageから既存の累積結果を復元
      const storedResults = loadFromStorage(sessionId)
      accumulatedResults.value = storedResults

      // 現在の結果を累積リストに追加（重複チェック）
      const existingIndex = accumulatedResults.value.findIndex(r => r.itemId === itemId)
      const currentResult = {
        itemId,
        score: result.score,
        maxScore: result.maxScore,
        timestamp: new Date().toISOString()
      }

      if (existingIndex >= 0) {
        accumulatedResults.value[existingIndex] = currentResult
      } else {
        accumulatedResults.value.push(currentResult)
      }

      // sessionStorageに保存（ページ遷移に備えて）
      saveToStorage(sessionId, accumulatedResults.value)

      const response = await fetch(callbackUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          sessionId,
          itemId,
          timestamp: new Date().toISOString(),
          result,
          // クライアント側の累積結果を送信
          accumulatedResults: accumulatedResults.value
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to submit result: ${response.status}`)
      }

      const data = await response.json()
      nextItemUrl.value = data.nextItem || null
      isComplete.value = data.isComplete || false
      summary.value = data.summary || null
      return true
    } catch (e) {
      submitError.value = e.message
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  return { isSubmitting, submitError, nextItemUrl, isComplete, summary, submitResult, resetResults, accumulatedResults }
}
