import { ref } from 'vue'

/**
 * URLパラメータから問題XMLを読み込むコンポーザブル
 */
export function useItemLoader() {
  const itemXml = ref(null)
  const isLoading = ref(false)
  const error = ref(null)

  /**
   * XML内の相対パスを絶対URLに変換する
   * @param {string} xml - XMLテキスト
   * @param {string} baseUrl - XMLのベースURL
   * @returns {string} 変換後のXML
   */
  const resolveRelativePaths = (xml, baseUrl) => {
    // baseUrlからディレクトリパスを取得
    const baseDir = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1)

    // data属性の相対パスを絶対URLに変換
    // data="/items/..." はそのまま（オリジン相対）
    // data="images/..." や data="./images/..." は baseDir を付与
    return xml.replace(
      /data="([^"]+)"/g,
      (match, path) => {
        // 絶対URL（http://, https://）はそのまま
        if (path.startsWith('http://') || path.startsWith('https://')) {
          return match
        }
        // オリジン相対（/で始まる）はオリジンを付与
        if (path.startsWith('/')) {
          const origin = new URL(baseUrl).origin
          return `data="${origin}${path}"`
        }
        // 相対パスはbaseDirを付与
        return `data="${baseDir}${path}"`
      }
    )
  }

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
      let xml = await response.text()
      // 相対パスを絶対URLに変換
      xml = resolveRelativePaths(xml, itemUrl)
      itemXml.value = xml
    } catch (e) {
      error.value = e.message
    } finally {
      isLoading.value = false
    }
  }

  return { itemXml, isLoading, error, loadItem }
}
