import { ref } from 'vue'

/**
 * URLパラメータから問題XMLを読み込むコンポーザブル
 */
export function useItemLoader() {
  const itemXml = ref(null)
  const isLoading = ref(false)
  const error = ref(null)

  /**
   * URLパラメータからitemのURLを取得し、XMLをfetchする
   */
  const loadItem = async () => {
    const params = new URLSearchParams(window.location.search)
    const itemUrl = params.get('item')

    if (!itemUrl) {
      error.value = 'item parameter is required'
      return
    }

    isLoading.value = true
    error.value = null

    try {
      const response = await fetch(itemUrl)
      if (!response.ok) {
        throw new Error(`Failed to fetch item: ${response.status}`)
      }
      itemXml.value = await response.text()
    } catch (e) {
      error.value = e.message
    } finally {
      isLoading.value = false
    }
  }

  return { itemXml, isLoading, error, loadItem }
}
