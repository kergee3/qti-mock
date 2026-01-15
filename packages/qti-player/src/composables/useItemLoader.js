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
    // data="/items-h/..." や data="/items-v/..." はそのまま（オリジン相対）
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
   * Data URLからXMLをデコードする
   * @param {string} dataUrl - Data URL (data:application/xml;base64,XXXX)
   * @returns {string} デコードされたXML
   */
  const decodeDataUrl = (dataUrl) => {
    // data:[<mediatype>][;base64],<data> 形式をパース
    const matches = dataUrl.match(/^data:([^;,]+)?(?:;([^,]+))?,(.*)$/)
    if (!matches) {
      throw new Error('Invalid data URL format')
    }

    const encoding = matches[2]
    const data = matches[3]

    if (encoding === 'base64') {
      // Base64デコード (UTF-8対応)
      return decodeURIComponent(escape(atob(data)))
    } else {
      // URLエンコードされたテキスト
      return decodeURIComponent(data)
    }
  }

  /**
   * URLパラメータからitemのURLを取得し、XMLをfetchする
   * Data URLの場合は直接デコードする
   */
  const loadItem = async () => {
    // SVGや画像などの埋め込みリソース内で実行された場合はスキップ
    const currentPath = window.location.pathname
    if (currentPath.match(/\.(svg|png|jpg|jpeg|gif|webp)$/i)) {
      return
    }

    const params = new URLSearchParams(window.location.search)
    const itemUrl = params.get('item')

    if (!itemUrl) {
      error.value = 'item parameter is required'
      return
    }

    isLoading.value = true
    error.value = null

    try {
      let xml

      // Data URLの場合
      if (itemUrl.startsWith('data:')) {
        xml = decodeDataUrl(itemUrl)
        // Data URLの場合は相対パス解決不要（画像等は使用できない）
      } else {
        // 通常のURL fetchの場合
        const response = await fetch(itemUrl)
        if (!response.ok) {
          throw new Error(`Failed to fetch item: ${response.status}`)
        }
        xml = await response.text()
        // 相対パスを絶対URLに変換
        xml = resolveRelativePaths(xml, itemUrl)
      }

      itemXml.value = xml
    } catch (e) {
      error.value = e.message
    } finally {
      isLoading.value = false
    }
  }

  return { itemXml, isLoading, error, loadItem }
}
