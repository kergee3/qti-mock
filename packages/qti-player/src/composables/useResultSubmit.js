import { ref } from 'vue'

/**
 * 採点結果をcallback URLに送信するコンポーザブル
 * シンプル版: 単一アイテムの結果のみを送信
 */
export function useResultSubmit() {
  const isSubmitting = ref(false)
  const submitError = ref(null)

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

    // callback URLがない場合は何もしない（エラーにはしない）
    if (!callbackUrl) {
      return { success: true }
    }

    isSubmitting.value = true
    submitError.value = null

    try {
      const response = await fetch(callbackUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          sessionId: sessionId || '',
          itemId,
          timestamp: new Date().toISOString(),
          result: {
            score: result.score,
            maxScore: result.maxScore,
            responses: result.responses,
            outcomeVariables: result.outcomeVariables,
            isExternalScored: result.isExternalScored || false
          }
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to submit result: ${response.status}`)
      }

      return await response.json()
    } catch (e) {
      submitError.value = e.message
      return { success: false, error: e.message }
    } finally {
      isSubmitting.value = false
    }
  }

  return { isSubmitting, submitError, submitResult }
}
