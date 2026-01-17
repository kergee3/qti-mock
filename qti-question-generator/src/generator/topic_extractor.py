"""解説テキストからトピックを抽出するモジュール"""

import json
import re
from typing import Optional
from anthropic import Anthropic
import sys
import os

# 親ディレクトリをパスに追加
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from config.settings import ANTHROPIC_API_KEY, DEFAULT_MODEL


class TopicExtractor:
    """解説テキストから問題作成用のトピックを抽出"""

    SYSTEM_PROMPT = """あなたは教育コンテンツの分析専門家です。
与えられた学習指導要領の解説テキストから、4択問題を作成できる具体的なトピック（テーマ）を抽出してください。

## ルール
1. 各トピックは独立した問題を作成できる具体的なテーマにしてください
2. 抽象的すぎるトピックは避け、具体的な概念・制度・事象を抽出してください
3. 重複や類似するトピックは避けてください
4. 小学生が理解できる内容に限定してください

## 出力形式
必ず以下のJSON形式で出力してください。余計な説明は不要です。

```json
{
  "topics": [
    "トピック1（例: 三権分立の仕組み）",
    "トピック2（例: 選挙権と投票）",
    "トピック3（例: 裁判員制度）"
  ]
}
```"""

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        """
        Args:
            api_key: Anthropic APIキー（省略時は環境変数から取得）
            model: 使用するモデル（省略時はデフォルト設定を使用）
        """
        self.api_key = api_key or ANTHROPIC_API_KEY
        self.model = model or DEFAULT_MODEL

        if not self.api_key:
            raise ValueError(
                "APIキーが設定されていません。"
                "ANTHROPIC_API_KEY環境変数を設定するか、api_key引数を指定してください。"
            )

        self.client = Anthropic(api_key=self.api_key)

    def extract(self, commentary: str, max_topics: int = 10) -> list[str]:
        """
        解説テキストからトピックを抽出

        Args:
            commentary: 解説テキスト
            max_topics: 抽出する最大トピック数

        Returns:
            list[str]: 抽出されたトピックのリスト
        """
        print(f"[INFO] Extracting topics (max: {max_topics}) with model: {self.model}")

        # 解説テキストを適度な長さに制限
        max_length = 5000
        if len(commentary) > max_length:
            commentary = commentary[:max_length] + "..."

        user_prompt = f"""以下の学習指導要領の解説テキストから、4択問題を作成できる具体的なトピックを{max_topics}個以内で抽出してください。

## 解説テキスト
{commentary}

上記の解説テキストから、独立した問題を作成できる具体的なトピックをJSON形式で出力してください。"""

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=1024,
                system=self.SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_prompt}],
            )

            # レスポンスからテキストを抽出
            content = response.content[0].text

            # JSONをパース
            topics = self._parse_json_response(content)

            print(f"[INFO] Extracted {len(topics)} topics")
            for i, topic in enumerate(topics, 1):
                print(f"  {i}. {topic}")

            return topics

        except Exception as e:
            print(f"[ERROR] Failed to extract topics: {e}")
            raise

    def _parse_json_response(self, content: str) -> list[str]:
        """
        Claude応答からJSONを抽出してトピックリストを取得

        Args:
            content: Claude応答テキスト

        Returns:
            list[str]: トピックのリスト
        """
        # JSONブロックを抽出（```json ... ``` または直接JSON）
        json_match = re.search(r"```json\s*([\s\S]*?)\s*```", content)
        if json_match:
            json_str = json_match.group(1)
        else:
            # JSONブロックがない場合は全体をJSONとして扱う
            json_str = content.strip()

        try:
            data = json.loads(json_str)
            return data.get("topics", [])
        except json.JSONDecodeError as e:
            print(f"[WARN] JSON parse error: {e}")
            print(f"[DEBUG] Raw content:\n{content}")
            raise ValueError(f"Invalid JSON response: {e}")

    def extract_from_sections(
        self, sections: list[dict], max_topics: int = 10
    ) -> list[str]:
        """
        複数セクション（下位コード別）からトピックを均等に抽出

        Args:
            sections: 各セクションの辞書リスト
                      [{"code": "...", "description": "...", "commentary": "..."}, ...]
            max_topics: 抽出する最大トピック数

        Returns:
            list[str]: 抽出されたトピックのリスト（全セクションから均等に）
        """
        if not sections:
            return []

        print(f"[INFO] セクション数: {len(sections)}, 目標トピック数: {max_topics}")

        # 各セクションから抽出するトピック数を計算（均等配分）
        topics_per_section = max(1, max_topics // len(sections))
        # 端数は最初のセクションに追加
        extra_topics = max_topics - (topics_per_section * len(sections))

        all_topics = []

        for i, section in enumerate(sections):
            commentary = section.get("commentary", "")
            if not commentary:
                print(f"[WARN] セクション {section.get('code', i)} に解説テキストがありません")
                continue

            # このセクションから抽出するトピック数
            section_max = topics_per_section + (1 if i < extra_topics else 0)

            print(f"[INFO] セクション {i+1}/{len(sections)} ({section.get('code', 'unknown')}) からトピックを抽出中... (目標: {section_max}個)")

            try:
                topics = self.extract(commentary, max_topics=section_max)
                all_topics.extend(topics)
                print(f"[INFO] セクション {i+1} から {len(topics)} トピックを抽出")
            except Exception as e:
                print(f"[WARN] セクション {section.get('code', i)} のトピック抽出に失敗: {e}")
                continue

        # 重複を除去（順序を維持）
        seen = set()
        unique_topics = []
        for topic in all_topics:
            if topic not in seen:
                seen.add(topic)
                unique_topics.append(topic)

        print(f"[INFO] 全セクションから合計 {len(unique_topics)} トピックを抽出（重複除去後）")
        return unique_topics[:max_topics]  # 最大数を超えないように


# テスト用
if __name__ == "__main__":
    # サンプルの解説テキスト
    sample_commentary = """
    国会は国権の最高機関であり、国の唯一の立法機関として法律の制定や予算の議決を行います。
    内閣は行政権を持ち実際の政治を行い、裁判所は司法権を持ち法律に基づいて裁判を行います。
    この三権分立により、権力の集中を防ぎ、国民の権利を守っています。

    ---

    選挙は国民の代表者を選出する大切な仕組みです。
    国民は18歳以上になると選挙権を持ち、投票によって代表者を選びます。

    ---

    裁判員制度は、国民が裁判に参加する制度です。
    重大な刑事事件について、選ばれた国民が裁判官と一緒に審理を行います。

    ---

    税金は国や地方公共団体が行う様々な事業の費用として使われます。
    社会保障、教育、公共事業など、国民生活の向上と安定のために重要です。
    """

    print("=== Extracting Topics ===\n")

    try:
        extractor = TopicExtractor()
        topics = extractor.extract(sample_commentary, max_topics=10)

        print("\n=== Extracted Topics ===")
        for i, topic in enumerate(topics, 1):
            print(f"  {i}. {topic}")
    except ValueError as e:
        print(f"[ERROR] {e}")
        print("APIキーを.envファイルに設定してください。")
