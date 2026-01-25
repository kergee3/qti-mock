"""記述式問題を生成するモジュール"""

import json
import re
from datetime import datetime
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
        self.api_call_logs = []  # API呼び出しログ蓄積用

    def _log_api_call(
        self,
        call_type: str,
        system_prompt: str,
        user_prompt: str,
        response_content: str,
        input_tokens: int,
        output_tokens: int,
    ):
        """API呼び出しをログに記録"""
        self.api_call_logs.append({
            "call_number": len(self.api_call_logs) + 1,
            "call_type": call_type,
            "timestamp": datetime.now().isoformat(),
            "model": self.model,
            "request": {
                "system_prompt": system_prompt,
                "user_prompt": user_prompt,
            },
            "response": {
                "content": response_content,
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
            }
        })

    def get_api_call_logs(self) -> list[dict]:
        """蓄積されたAPI呼び出しログを取得"""
        return self.api_call_logs

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

            # API呼び出しをログに記録
            self._log_api_call(
                call_type="fallback",
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                response_content=content,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
            )

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

    def generate_batch(
        self, system_prompt: str, user_prompt: str, expected_count: int
    ) -> list[dict]:
        """
        複数の記述式問題を一括生成

        Args:
            system_prompt: システムプロンプト
            user_prompt: ユーザープロンプト
            expected_count: 期待する問題数

        Returns:
            list[dict]: 生成された問題データのリスト
        """
        print(f"[INFO] Generating {expected_count} text questions in batch with model: {self.model}")

        try:
            # max_tokens を問題数に応じて調整（1問あたり約1000トークン + バッファ）
            max_tokens = min(expected_count * 2000, 32000)

            response = self.client.messages.create(
                model=self.model,
                max_tokens=max_tokens,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}],
            )

            # 統計情報を記録
            input_tokens = response.usage.input_tokens
            output_tokens = response.usage.output_tokens
            api_stats.add_call("問題生成（バッチ）", input_tokens, output_tokens)
            print(f"[INFO] API使用量: 入力={input_tokens:,} tokens, 出力={output_tokens:,} tokens")

            # レスポンスからテキストを抽出
            content = response.content[0].text

            # API呼び出しをログに記録
            self._log_api_call(
                call_type="batch",
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                response_content=content,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
            )

            # JSONをパース
            questions = self._parse_batch_response(content)

            # 各問題をバリデーション
            valid_questions = self._validate_batch(questions, expected_count)

            return valid_questions

        except Exception as e:
            print(f"[ERROR] Failed to generate batch questions: {e}")
            raise

    def _parse_batch_response(self, content: str) -> list[dict]:
        """
        バッチ生成のClaude応答からJSON配列を抽出

        Args:
            content: Claude応答テキスト

        Returns:
            list[dict]: パースされた問題リスト
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
            data = json.loads(json_str)

            # {"questions": [...]} 形式の場合
            if isinstance(data, dict) and "questions" in data:
                return data["questions"]
            # 直接配列の場合
            elif isinstance(data, list):
                return data
            else:
                print("[WARN] Unexpected JSON structure, attempting to extract questions")
                return []

        except json.JSONDecodeError as e:
            print(f"[WARN] JSON parse error: {e}")
            print(f"[DEBUG] Attempting partial extraction...")

            # 部分的なJSON抽出を試みる
            questions = self._extract_partial_questions(content)
            if questions:
                print(f"[INFO] Extracted {len(questions)} questions from partial JSON")
                return questions

            print(f"[DEBUG] Raw content:\n{content[:500]}...")
            raise ValueError(f"Invalid JSON response: {e}")

    def _extract_partial_questions(self, content: str) -> list[dict]:
        """
        部分的に有効なJSONから問題を抽出

        Args:
            content: Claude応答テキスト

        Returns:
            list[dict]: 抽出された問題リスト
        """
        questions = []

        # question_id を含むJSONオブジェクトを探す
        # より堅牢なパターンマッチング
        pattern = r'\{\s*"question_id"\s*:\s*"[^"]+"\s*,[\s\S]*?"thinking_skills"\s*:\s*\{[^}]+\}\s*\}'

        matches = re.findall(pattern, content)

        for match in matches:
            try:
                q = json.loads(match)
                questions.append(q)
            except json.JSONDecodeError:
                continue

        return questions

    def _validate_batch(self, questions: list[dict], expected_count: int) -> list[dict]:
        """
        バッチ生成された問題のバリデーション

        Args:
            questions: 問題リスト
            expected_count: 期待する問題数

        Returns:
            list[dict]: バリデーションを通過した問題リスト
        """
        valid_questions = []
        errors = []

        for i, q in enumerate(questions):
            try:
                self._validate_question(q)
                valid_questions.append(q)
            except ValueError as e:
                errors.append(f"問題{i+1}: {e}")
                print(f"[WARN] 問題{i+1}のバリデーション失敗: {e}")

        if len(valid_questions) < expected_count:
            print(f"[WARN] 生成数不足: {len(valid_questions)}/{expected_count}")

        if errors:
            print(f"[WARN] バリデーションエラー: {len(errors)}件")

        return valid_questions


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
