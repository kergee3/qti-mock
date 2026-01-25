"""Claude APIを使用して問題を生成するモジュール"""

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


class QuestionGenerator:
    """Claude APIを使用して4択問題を生成"""

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
        単一の問題を生成

        Args:
            system_prompt: システムプロンプト
            user_prompt: ユーザープロンプト

        Returns:
            dict: 生成された問題データ
        """
        print(f"[INFO] Generating question with model: {self.model}")

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=1024,
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
            question_data = self._parse_json_response(content)

            print(f"[INFO] Generated question: {question_data.get('title', 'N/A')}")
            return question_data

        except Exception as e:
            print(f"[ERROR] Failed to generate question: {e}")
            raise

    def _parse_json_response(self, content: str) -> dict:
        """
        Claude応答からJSONを抽出してパース

        Args:
            content: Claude応答テキスト

        Returns:
            dict: パースされたJSONデータ
        """
        # JSONブロックを抽出（```json ... ``` または直接JSON）
        json_match = re.search(r"```json\s*([\s\S]*?)\s*```", content)
        if json_match:
            json_str = json_match.group(1)
        else:
            # JSONブロックがない場合は全体をJSONとして扱う
            json_str = content.strip()

        try:
            return json.loads(json_str)
        except json.JSONDecodeError as e:
            print(f"[WARN] JSON parse error: {e}")
            print(f"[DEBUG] Raw content:\n{content}")
            raise ValueError(f"Invalid JSON response: {e}")

    def generate_multiple(
        self, prompts: list[tuple[str, str]], delay_seconds: float = 1.0
    ) -> list[dict]:
        """
        複数の問題を順次生成

        Args:
            prompts: [(system_prompt, user_prompt), ...]のリスト
            delay_seconds: リクエスト間の待機時間

        Returns:
            list: 生成された問題データのリスト
        """
        import time

        results = []
        for i, (system_prompt, user_prompt) in enumerate(prompts):
            print(f"\n[INFO] Generating question {i + 1}/{len(prompts)}")
            try:
                question = self.generate(system_prompt, user_prompt)
                results.append(question)
            except Exception as e:
                print(f"[ERROR] Failed to generate question {i + 1}: {e}")
                results.append({"error": str(e)})

            # レートリミット対策
            if i < len(prompts) - 1:
                time.sleep(delay_seconds)

        return results

    def generate_batch(
        self, system_prompt: str, user_prompt: str, expected_count: int
    ) -> list[dict]:
        """
        複数の問題を一括生成

        Args:
            system_prompt: システムプロンプト
            user_prompt: ユーザープロンプト
            expected_count: 期待する問題数

        Returns:
            list[dict]: 生成された問題データのリスト
        """
        print(f"[INFO] Generating {expected_count} questions in batch with model: {self.model}")

        try:
            # max_tokens を問題数に応じて調整（1問あたり約400トークン + バッファ）
            # 30問を想定: 30 * 1000 = 30000、最大32000に制限
            max_tokens = min(expected_count * 1000, 32000)

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

        # title と options を含むJSONオブジェクトを探す
        pattern = r'\{\s*"title"\s*:\s*"[^"]+"\s*,[\s\S]*?"explanation"\s*:\s*"[^"]*"\s*\}'

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

        required_fields = ["title", "question", "options", "correct_index", "explanation"]

        for i, q in enumerate(questions):
            try:
                # 必須フィールドチェック
                missing = [f for f in required_fields if f not in q]
                if missing:
                    raise ValueError(f"必須フィールドがありません: {missing}")

                # options が4つあるか
                if not isinstance(q.get("options"), list) or len(q.get("options", [])) != 4:
                    raise ValueError("選択肢は4つ必要です")

                # correct_index が有効な範囲か
                if not isinstance(q.get("correct_index"), int) or not (0 <= q.get("correct_index", -1) < 4):
                    raise ValueError("correct_index は 0-3 の範囲である必要があります")

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

    # プロンプトを生成
    system_prompt, user_prompt = PromptBuilder.build(
        subject="社会",
        grade=6,
        description="我が国の政治の働きについて，学習の問題を追究・解決する活動を通して，次の事項を身に付けることができるよう指導する。",
        commentary="""選挙は国民の代表者を選出する大切な仕組みである。
国民の代表者として選出された国会議員は国民生活の安定と向上に努めなければならない。
国民は代表者を選出するため，選挙権を行使する必要がある。
国会と内閣と裁判所の三権相互の関連について理解する。
裁判員制度や租税の役割についても扱う。""",
        question_number=1,
    )

    print("=== Generating Question ===\n")

    try:
        generator = QuestionGenerator()
        question = generator.generate(system_prompt, user_prompt)

        print("\n=== Generated Question ===")
        print(json.dumps(question, ensure_ascii=False, indent=2))
    except ValueError as e:
        print(f"[ERROR] {e}")
        print("APIキーを.envファイルに設定してください。")
