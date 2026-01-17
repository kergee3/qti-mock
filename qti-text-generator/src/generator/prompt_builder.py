"""記述式問題生成用のプロンプト構築モジュール"""

import sys
import os

# 親ディレクトリをパスに追加
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from config.settings import TEXT_QUESTION_CONFIG, SCORING_ASPECTS


class PromptBuilder:
    """記述式問題生成用のプロンプトを構築"""

    @staticmethod
    def build(
        subject: str,
        grade: int,
        description: str,
        commentary: str,
        question_number: int,
        difficulty: int,
        focus_topic: str = None,
    ) -> tuple[str, str]:
        """
        記述式問題生成用のプロンプトを構築

        Args:
            subject: 教科名
            grade: 学年
            description: 学習目標
            commentary: 解説テキスト
            question_number: 問題番号（1-5）
            difficulty: 難易度（1-5、1が易しく5が難しい）
            focus_topic: 問題のテーマとなるトピック（オプション）

        Returns:
            tuple[str, str]: (システムプロンプト, ユーザープロンプト)
        """
        max_chars = TEXT_QUESTION_CONFIG["max_chars"]
        min_chars = TEXT_QUESTION_CONFIG["min_chars"]

        # 難易度に応じた説明
        difficulty_descriptions = {
            1: "基礎的な概念の理解を確認する易しい問題。単純な説明で回答できる。",
            2: "基礎概念を応用する問題。具体例を挙げて説明する必要がある。",
            3: "複数の概念を関連付けて説明する中程度の難しさの問題。",
            4: "批判的思考や多角的な視点を必要とするやや難しい問題。",
            5: "複雑な状況判断や高度な論理的思考を必要とする最も難しい問題。",
        }
        difficulty_desc = difficulty_descriptions.get(difficulty, difficulty_descriptions[3])

        system_prompt = f"""あなたは小学校{grade}年生向けの{subject}の記述式問題を作成する教育専門家です。

## あなたの役割
思考力、判断力、表現力を総合的に評価できる記述式問題を作成します。

## 採点観点
以下の3つの観点で採点します（合計10点満点）：
1. 理解力（{SCORING_ASPECTS['understanding']['max_score']}点）: 概念や内容を正しく理解しているか
2. 表現力（{SCORING_ASPECTS['expression']['max_score']}点）: 論理的かつ明確に表現できているか
3. 正確性（{SCORING_ASPECTS['accuracy']['max_score']}点）: 用語や事実関係が正確か

## 出力形式
必ず以下のJSON形式で出力してください。余計な説明は不要です。

```json
{{
  "question_id": "text-{question_number:03d}",
  "difficulty": {difficulty},
  "title": "問題のタイトル（20文字以内）",
  "question_text": "問題文（条件・制約を明示）",
  "model_answer": "模範解答（{min_chars}〜{max_chars}文字）",
  "required_concepts": ["必須概念1", "必須概念2", "必須概念3"],
  "scoring_matrix": {{
    "understanding": {{
      "aspect_name": "理解力",
      "max_score": {SCORING_ASPECTS['understanding']['max_score']},
      "levels": [
        {{"score": 4, "description": "完全に理解している"}},
        {{"score": 3, "description": "概ね理解している"}},
        {{"score": 2, "description": "部分的に理解している"}},
        {{"score": 1, "description": "理解が不十分"}},
        {{"score": 0, "description": "理解していない"}}
      ]
    }},
    "expression": {{
      "aspect_name": "表現力",
      "max_score": {SCORING_ASPECTS['expression']['max_score']},
      "levels": [
        {{"score": 3, "description": "論理的で明確な表現"}},
        {{"score": 2, "description": "概ね論理的な表現"}},
        {{"score": 1, "description": "やや不明確な表現"}},
        {{"score": 0, "description": "表現が不適切"}}
      ]
    }},
    "accuracy": {{
      "aspect_name": "正確性",
      "max_score": {SCORING_ASPECTS['accuracy']['max_score']},
      "levels": [
        {{"score": 3, "description": "正確で適切な用語使用"}},
        {{"score": 2, "description": "概ね正確"}},
        {{"score": 1, "description": "一部不正確"}},
        {{"score": 0, "description": "不正確"}}
      ]
    }}
  }},
  "common_errors": [
    {{"pattern": "典型的誤答パターン1", "feedback": "誤答へのフィードバック1"}},
    {{"pattern": "典型的誤答パターン2", "feedback": "誤答へのフィードバック2"}},
    {{"pattern": "典型的誤答パターン3", "feedback": "誤答へのフィードバック3"}}
  ],
  "thinking_skills": {{
    "critical_thinking": 40,
    "judgment": 30,
    "expression": 30
  }}
}}
```

## 重要な注意点
1. 問題文は小学{grade}年生が理解できる平易な言葉で書いてください
2. 回答に必要な情報は全て問題文に含めてください
3. 模範解答は{min_chars}文字以上{max_chars}文字以内で作成してください
4. 必須概念は最低3つ含めてください
5. 典型的誤答パターンは具体的なものを3つ以上挙げてください
6. thinking_skills の合計は100になるようにしてください"""

        # トピック指定がある場合の追加指示
        topic_instruction = ""
        if focus_topic:
            topic_instruction = f"""
## 出題テーマ
この問題は「{focus_topic}」に関する内容を中心に作成してください。
"""

        user_prompt = f"""以下の学習指導要領の内容に基づいて、記述式問題を1問作成してください。

## 問題番号
{question_number}問目

## 難易度
{difficulty}（{difficulty_desc}）
{topic_instruction}
## 学習目標
{description}

## 解説テキスト（参考資料）
{commentary[:8000]}

## 回答条件
- 最小文字数: {min_chars}文字
- 最大文字数: {max_chars}文字
- {min_chars}文字未満の回答は採点対象外となります

上記の内容に基づいて、思考力・判断力・表現力を評価できる記述式問題をJSON形式で出力してください。"""

        return system_prompt, user_prompt
