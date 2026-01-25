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
