import React from 'react';

/**
 * インライン形式のルビ {漢字|よみ} を React コンポーネントに変換
 *
 * @param text インライン形式のルビを含むテキスト
 * @returns React.ReactNode の配列
 *
 * @example
 * renderRubyText("{国旗|こっき}と{国歌|こっか}")
 * // => <><ruby>国旗<rt>こっき</rt></ruby>と<ruby>国歌<rt>こっか</rt></ruby></>
 */
export function renderRubyText(text: string): React.ReactNode {
  if (!text) return null;

  const pattern = /\{([^|{}]+)\|([^|{}]+)\}/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    // マッチ前のテキストを追加
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    // ルビ要素を追加
    const [, kanji, reading] = match;
    parts.push(
      <ruby key={key++}>
        {kanji}
        <rt>{reading}</rt>
      </ruby>
    );

    lastIndex = pattern.lastIndex;
  }

  // 残りのテキストを追加
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? <>{parts}</> : text;
}

/**
 * インライン形式のルビを除去して漢字のみ残す
 *
 * @param text インライン形式のルビを含むテキスト
 * @returns ルビを除去したテキスト
 *
 * @example
 * stripRuby("{国旗|こっき}と{国歌|こっか}")
 * // => "国旗と国歌"
 */
export function stripRuby(text: string): string {
  if (!text) return '';
  return text.replace(/\{([^|{}]+)\|[^|{}]+\}/g, '$1');
}

/**
 * HTML/XML形式のrubyタグを除去する
 * <ruby>漢字<rt>よみ</rt></ruby> → 漢字
 */
export function stripRubyFromXml(xml: string): string {
  let result = xml.replace(/<rt[^>]*>[\s\S]*?<\/rt>/gi, '');
  result = result.replace(/<rp[^>]*>[\s\S]*?<\/rp>/gi, '');
  result = result.replace(/<\/?ruby[^>]*>/gi, '');
  result = result.replace(/<\/?rb[^>]*>/gi, '');
  return result;
}

/**
 * XMLをfetchしてrubyを除去し、相対パスを解決してData URLを生成する
 * QTI PlayerがData URLをネイティブサポートしているため、Player側の変更不要
 *
 * @param xmlUrl 元のXML URL
 * @returns ruby除去済みXMLのData URL
 */
export async function fetchAndStripRuby(xmlUrl: string): Promise<string> {
  const response = await fetch(xmlUrl);
  if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
  let xml = await response.text();

  // 相対パスを元URLベースで絶対URLに解決（Player側のresolveRelativePathsと同等）
  // Data URLではPlayer側の相対パス解決がスキップされるため、事前に解決する
  const baseDir = xmlUrl.substring(0, xmlUrl.lastIndexOf('/') + 1);
  xml = xml.replace(/data="([^"]+)"/g, (match, path) => {
    if (path.startsWith('http://') || path.startsWith('https://')) return match;
    if (path.startsWith('/')) {
      const origin = new URL(xmlUrl).origin;
      return `data="${origin}${path}"`;
    }
    return `data="${baseDir}${path}"`;
  });

  // ruby除去
  xml = stripRubyFromXml(xml);

  // Data URL化（base64エンコード）
  const base64 = btoa(unescape(encodeURIComponent(xml)));
  return `data:application/xml;base64,${base64}`;
}
