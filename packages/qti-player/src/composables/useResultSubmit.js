import { ref } from 'vue'

/**
 * 採点結果をcallback URLに送信するコンポーザブル
 */
export function useResultSubmit() {
  const isSubmitting = ref(false)
  const submitError = ref(null)
  const nextItemUrl = ref(null)
  const isComplete = ref(false)
  const summary = ref(null)

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
          result
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

  return { isSubmitting, submitError, nextItemUrl, isComplete, summary, submitResult }
}
