"""記述式問題生成用のプロンプト構築モジュール"""

import sys
import os

# 親ディレクトリをパスに追加
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from config.settings import SCORING_ASPECTS, get_char_limits, get_difficulty


class PromptBuilder:
    """記述式問題生成用のプロンプトを構築"""

    # ルビ指示セクション
    RUBY_INSTRUCTION = """
## ルビ（ふりがな）の付け方
問題文（question_text）と模範解答（model_answer）の全ての漢字にルビを付けてください。
形式: {漢字|よみがな}

### ルール
1. **全ての漢字に必ずルビを付ける**（ひらがな・カタカナ・数字・記号は不要）
2. 読み方は文脈に応じた正しい読みを使用（例: 「今日」→「きょう」）
3. 熟語は1つのルビでまとめる（例: {国会|こっかい}）
4. 送り仮名は含めない（例: {考|かんが}える）
5. **連続する熟語は個別にルビを付ける**（例: 国際社会 → {国際|こくさい}{社会|しゃかい}）
6. **カタカナと漢字が混在する場合、漢字部分のみにルビを付ける**（例: スポーツ施設 → スポーツ{施設|しせつ}）

### 例
- {三権分立|さんけんぶんりつ}は{大切|たいせつ}な{仕組|しく}みです。
- {国民|こくみん}の{代表|だいひょう}を{選|えら}ぶ。
- {国際|こくさい}{社会|しゃかい}において、{国旗|こっき}と{国歌|こっか}は{大切|たいせつ}にされています。
- スポーツ{施設|しせつ}、ボランティア{活動|かつどう}、インターネット{検索|けんさく}

### 注意
- 漢字を含む単語には必ずルビを付けてください。ルビなしの漢字が残らないようにしてください。
- カタカナにはルビを付けないでください。カタカナと漢字が続く場合も、漢字部分のみを{}で囲んでください。
"""

    @staticmethod
    def build(
        subject: str,
        grade: int,
        description: str,
        commentary: str,
        question_number: int,
        difficulty: int,
        focus_topic: str = None,
        existing_questions: list[dict] = None,
        enable_ruby: bool = True,
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
            existing_questions: 既に生成された問題のリスト（重複防止用）
                               各要素は {"title": str, "question_text": str} の辞書

        Returns:
            tuple[str, str]: (システムプロンプト, ユーザープロンプト)
        """
        # ルビ指示を条件に応じて追加
        ruby_instruction = PromptBuilder.RUBY_INSTRUCTION if enable_ruby else ""

        # 問題番号に応じた字数制限を取得
        char_limits = get_char_limits(question_number)
        max_chars = char_limits["max_chars"]
        min_chars = char_limits["min_chars"]
        model_answer_target = char_limits["model_answer_target"]

        # 難易度に応じた説明（全体的に易しめに調整）
        difficulty_descriptions = {
            1: "最も基礎的な問題。教科書に書かれている内容をそのまま答えられる易しい問題。単語や短いフレーズで回答できる。",
            2: "基礎的な理解を確認する問題。教科書の内容を自分の言葉で簡単に説明できればよい。",
            3: "基礎概念を応用する問題。具体例を1つ挙げて説明できればよい。",
            4: "複数の概念を関連付けて説明する問題。2つ以上の要素を結びつけて考える。",
            5: "やや発展的な問題。学んだ内容を別の場面に当てはめて考える。",
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
  "model_answer": "模範解答（{model_answer_target}文字程度）",
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
3. 模範解答は{model_answer_target}文字程度で作成してください（{min_chars}文字以上{max_chars}文字以内）
4. 必須概念は最低3つ含めてください
5. 典型的誤答パターンは具体的なものを3つ以上挙げてください
6. thinking_skills の合計は100になるようにしてください
7. タイトルは他の問題と重複しないユニークなものにしてください
8. 【重要】問題文（question_text）の中に文字数制限や回答条件を記述しないでください。文字数制限はシステムが自動で表示します
{ruby_instruction}"""

        # トピック指定がある場合の追加指示
        topic_instruction = ""
        if focus_topic:
            topic_instruction = f"""
## 出題テーマ
この問題は「{focus_topic}」に関する内容を中心に作成してください。
"""

        # 既存問題がある場合の重複防止指示
        existing_questions_instruction = ""
        if existing_questions and len(existing_questions) > 0:
            # タイトル一覧
            titles_list = "、".join([f"「{q.get('title', '')}」" for q in existing_questions if q.get('title')])

            # 過去の問題文一覧（簡潔に表示）
            questions_list = "\n".join([
                f"  - {q.get('title', '無題')}: {q.get('question_text', '')[:50]}..."
                for q in existing_questions[-5:]  # 直近5問のみ表示（トークン節約）
            ])

            existing_questions_instruction = f"""
## 重複防止（重要）
以下のタイトルと問題は既に使用されています。これらと同じまたは類似の内容は絶対に使用しないでください：

### 使用済みタイトル：
{titles_list}

### 直近の問題文（参考）：
{questions_list}

【重要】タイトルだけでなく、問題文の内容も異なるものにしてください。
同じ概念を問う場合でも、異なる角度・切り口・具体例で問題を作成してください。
"""

        user_prompt = f"""以下の学習指導要領の内容に基づいて、記述式問題を1問作成してください。

## 問題番号
{question_number}問目

## 難易度
{difficulty}（{difficulty_desc}）
{topic_instruction}{existing_questions_instruction}
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

    @staticmethod
    def build_batch(
        subject: str,
        grade: int,
        description: str,
        commentary: str,
        questions_config: list[dict],
        enable_ruby: bool = True,
    ) -> tuple[str, str]:
        """
        複数の記述式問題を一括生成するためのプロンプトを構築

        Args:
            subject: 教科名
            grade: 学年
            description: 学習目標
            commentary: 解説テキスト
            questions_config: 問題設定のリスト
                各要素は {"number": int, "difficulty": int, "char_limits": dict, "topic": str|None}
            enable_ruby: ルビを付けるかどうか

        Returns:
            tuple[str, str]: (システムプロンプト, ユーザープロンプト)
        """
        # ルビ指示を条件に応じて追加
        ruby_instruction = PromptBuilder.RUBY_INSTRUCTION if enable_ruby else ""

        count = len(questions_config)

        # 難易度に応じた説明
        difficulty_descriptions = {
            1: "最も基礎的な問題。教科書に書かれている内容をそのまま答えられる易しい問題。",
            2: "基礎的な理解を確認する問題。教科書の内容を自分の言葉で簡単に説明できればよい。",
            3: "基礎概念を応用する問題。具体例を1つ挙げて説明できればよい。",
            4: "複数の概念を関連付けて説明する問題。2つ以上の要素を結びつけて考える。",
            5: "やや発展的な問題。学んだ内容を別の場面に当てはめて考える。",
        }

        # 問題条件テーブルを構築
        questions_table = "| 問題番号 | 難易度 | 難易度説明 | 字数制限 | テーマ |\n"
        questions_table += "|----------|--------|------------|----------|--------|\n"

        for config in questions_config:
            num = config["number"]
            diff = config["difficulty"]
            char_limits = config["char_limits"]
            topic = config.get("topic") or "（指定なし）"
            diff_desc = difficulty_descriptions.get(diff, "基礎的な問題")[:20] + "..."

            questions_table += f"| {num} | {diff} | {diff_desc} | {char_limits['min_chars']}-{char_limits['max_chars']}字 | {topic} |\n"

        system_prompt = f"""あなたは小学校{grade}年生向けの{subject}の記述式問題を作成する教育専門家です。

## あなたの役割
思考力、判断力、表現力を総合的に評価できる記述式問題を**{count}問**作成します。

## 採点観点
以下の3つの観点で採点します（合計10点満点）：
1. 理解力（{SCORING_ASPECTS['understanding']['max_score']}点）: 概念や内容を正しく理解しているか
2. 表現力（{SCORING_ASPECTS['expression']['max_score']}点）: 論理的かつ明確に表現できているか
3. 正確性（{SCORING_ASPECTS['accuracy']['max_score']}点）: 用語や事実関係が正確か

## 出力形式
必ず以下のJSON形式で{count}問を配列として出力してください。余計な説明は不要です。

```json
{{
  "questions": [
    {{
      "question_id": "text-001",
      "difficulty": 1,
      "title": "問題のタイトル（20文字以内）",
      "question_text": "問題文（条件・制約を明示）",
      "model_answer": "模範解答",
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
  ]
}}
```

## 重要な注意点
1. 問題文は小学{grade}年生が理解できる平易な言葉で書いてください
2. 回答に必要な情報は全て問題文に含めてください
3. 模範解答は各問題の指定文字数程度で作成してください
4. 必須概念は最低3つ含めてください
5. 典型的誤答パターンは具体的なものを3つ以上挙げてください
6. thinking_skills の合計は100になるようにしてください
7. 【重要】各問題のタイトルと内容は互いに重複しないようにしてください
8. 【重要】各問題は異なる切り口・視点・具体例で作成してください
9. 【重要】問題文（question_text）の中に文字数制限や回答条件を記述しないでください
{ruby_instruction}"""

        user_prompt = f"""以下の学習指導要領の内容に基づいて、記述式問題を{count}問作成してください。

## 生成する問題一覧
以下の条件で{count}問を生成してください。各問題は異なる切り口・内容にしてください。

{questions_table}

## 学習目標
{description}

## 解説テキスト（参考資料）
{commentary[:10000]}

## 注意事項
- 各問題のquestion_idは "text-001", "text-002", ... の形式にしてください
- 各問題は指定された難易度と字数制限に従ってください
- テーマが指定されている場合はそのテーマに沿った問題を作成してください
- {count}問すべてを含む配列として出力してください

上記の内容に基づいて、思考力・判断力・表現力を評価できる記述式問題をJSON形式で出力してください。"""

        return system_prompt, user_prompt
