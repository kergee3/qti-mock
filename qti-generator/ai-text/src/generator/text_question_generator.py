"""記述式問題を生成するモジュール"""

import json
import re
from typing import Optional
from anthropic import Anthropic
import sys
import os

# 親ディレクトリをパスに追加
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from config.settings import ANTHROPIC_API_KEY, DEFAULT_MODEL
from src.utils.api_stats import api_stats


class TextQuestionGenerator:
    """Claude APIを使用して記述式問題を生成"""

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

    def generate(self, system_prompt: str, user_prompt: str) -> dict:
        """
        記述式問題を生成

        Args:
            system_prompt: システムプロンプト
            user_prompt: ユーザープロンプト

        Returns:
            dict: 生成された問題データ
        """
        print(f"[INFO] Generating text question with model: {self.model}")

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=4096,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}],
            )

            # 統計情報を記録
            input_tokens = response.usage.input_tokens
            output_tokens = response.usage.output_tokens
            api_stats.add_call("問題生成", input_tokens, output_tokens)
            print(f"[INFO] API使用量: 入力={input_tokens:,} tokens, 出力={output_tokens:,} tokens")

            # レスポンスからテキストを抽出
            content = response.content[0].text

            # JSONをパース
            question = self._parse_json_response(content)

            # バリデーション
            self._validate_question(question)

            return question

        except Exception as e:
            print(f"[ERROR] Failed to generate question: {e}")
            raise

    def _parse_json_response(self, content: str) -> dict:
        """
        Claude応答からJSONを抽出

        Args:
            content: Claude応答テキスト

        Returns:
            dict: パースされたJSON
        """
        # JSONブロックを抽出（```json ... ``` または直接JSON）
        json_match = re.search(r"```json\s*([\s\S]*?)\s*```", content)
        if json_match:
            json_str = json_match.group(1)
        else:
            # JSONブロックがない場合は全体をJSONとして扱う
            json_str = content.strip()
            # 先頭の非JSON文字を除去
            if not json_str.startswith("{"):
                brace_pos = json_str.find("{")
                if brace_pos != -1:
                    json_str = json_str[brace_pos:]

        try:
            return json.loads(json_str)
        except json.JSONDecodeError as e:
            print(f"[WARN] JSON parse error: {e}")
            print(f"[DEBUG] Raw content:\n{content[:500]}...")
            raise ValueError(f"Invalid JSON response: {e}")

    def _validate_question(self, question: dict) -> None:
        """
        生成された問題データのバリデーション

        Args:
            question: 問題データ

        Raises:
            ValueError: バリデーションエラー
        """
        required_fields = [
            "question_id",
            "difficulty",
            "title",
            "question_text",
            "model_answer",
            "required_concepts",
            "scoring_matrix",
            "common_errors",
        ]

        for field in required_fields:
            if field not in question:
                raise ValueError(f"必須フィールドがありません: {field}")

        # 必須概念のチェック
        if len(question.get("required_concepts", [])) < 2:
            print("[WARN] 必須概念が2つ未満です")

        # 採点マトリクスのチェック
        scoring_matrix = question.get("scoring_matrix", {})
        required_aspects = ["understanding", "expression", "accuracy"]
        for aspect in required_aspects:
            if aspect not in scoring_matrix:
                print(f"[WARN] 採点観点がありません: {aspect}")

        # 誤答パターンのチェック
        if len(question.get("common_errors", [])) < 2:
            print("[WARN] 典型的誤答パターンが2つ未満です")


# テスト用
if __name__ == "__main__":
    from prompt_builder import PromptBuilder

    print("=== Testing TextQuestionGenerator ===\n")

    try:
        generator = TextQuestionGenerator()

        system_prompt, user_prompt = PromptBuilder.build(
            subject="社会",
            grade=6,
            description="国会の働きについて理解する",
            commentary="""
            国会は国権の最高機関であり、国の唯一の立法機関として法律の制定や予算の議決を行います。
            衆議院と参議院の二院制で構成され、国民の代表として民主主義の根幹を担っています。
            """,
            question_number=1,
            difficulty=1,
            focus_topic="国会の役割",
        )

        question = generator.generate(system_prompt, user_prompt)

        print("\n=== Generated Question ===")
        print(f"ID: {question.get('question_id')}")
        print(f"Title: {question.get('title')}")
        print(f"Question: {question.get('question_text')[:100]}...")
        print(f"Model Answer: {question.get('model_answer')[:100]}...")
        print(f"Required Concepts: {question.get('required_concepts')}")

    except ValueError as e:
        print(f"[ERROR] {e}")
        print("APIキーを.envファイルに設定してください。")
