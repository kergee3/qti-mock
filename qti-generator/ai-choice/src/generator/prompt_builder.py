"""Claude APIへのプロンプトを構築するモジュール"""

from typing import Optional


class PromptBuilder:
    """問題生成用プロンプトを構築"""

    SYSTEM_PROMPT = """あなたは小学校教育の専門家です。
学習指導要領に基づいた高品質な4択問題を作成してください。

## ルール
1. 正解は必ず1つのみ
2. 全選択肢は同程度の長さで、紛らわしい誤答（ディストラクター）を含める
3. 提供された学習指導要領と解説テキストの情報のみを使用（事実を創作しない）
4. 小学生が理解できる平易な表現を使用
5. 問題文は具体的で明確に
6. 解説は正解の理由と学習ポイントを簡潔に説明

## 出力形式
必ず以下のJSON形式で出力してください。余計な説明は不要です。

```json
{
  "title": "問題のタイトル（10文字以内で簡潔に）",
  "question": "問題文（具体的で明確に）",
  "options": [
    "選択肢1のテキスト",
    "選択肢2のテキスト",
    "選択肢3のテキスト",
    "選択肢4のテキスト"
  ],
  "correct_index": 0,
  "explanation": "正解の理由と学習ポイントの解説"
}
```

※ correct_index は0から始まる正解の選択肢番号（0=選択肢1, 1=選択肢2, ...）"""

    @classmethod
    def build(
        cls,
        subject: str,
        grade: int,
        description: str,
        commentary: str,
        question_number: int = 1,
        focus_topic: Optional[str] = None,
        existing_questions: list[dict] = None,
    ) -> tuple[str, str]:
        """
        問題生成用のプロンプトを構築

        Args:
            subject: 教科名（社会、理科など）
            grade: 学年（5, 6など）
            description: 学習目標
            commentary: 解説テキスト
            question_number: 問題番号（同じ内容から複数問生成時に使用）
            focus_topic: フォーカスするトピック（オプション）
            existing_questions: 既に生成された問題のリスト（重複防止用）
                               各要素は {"title": str, "question": str, "correct_answer": str} の辞書

        Returns:
            tuple: (system_prompt, user_prompt)
        """
        # 解説テキストを適度な長さに制限（トークン節約）
        max_commentary_length = 3000
        if len(commentary) > max_commentary_length:
            commentary = commentary[:max_commentary_length] + "..."

        # トピック指定の指示
        topic_instruction = ""
        if focus_topic:
            topic_instruction = f"""- 【重要】今回は必ず「{focus_topic}」に関する問題を作成してください
- 他のトピックではなく、指定されたトピックに焦点を当ててください"""
        else:
            topic_instruction = "- 前の問題と重複しない内容にしてください"

        # 既存問題がある場合の重複防止指示
        existing_questions_instruction = ""
        if existing_questions and len(existing_questions) > 0:
            # タイトル一覧
            titles_list = "、".join([f"「{q.get('title', '')}」" for q in existing_questions if q.get('title')])

            # 過去の問題と正解を詳細に表示
            questions_list = "\n".join([
                f"  {i+1}. タイトル: {q.get('title', '無題')}\n     問題文: {q.get('question', '')[:100]}\n     正解: {q.get('correct_answer', '')[:60]}"
                for i, q in enumerate(existing_questions[-15:])  # 直近15問を表示
            ])

            # 使用済みトピック・テーマを抽出（タイトルから）
            used_topics = []
            for q in existing_questions:
                title = q.get('title', '')
                if title:
                    used_topics.append(title)

            existing_questions_instruction = f"""

## 重複防止（最重要）
以下のタイトル・問題・正解は既に使用されています。**同一または類似の内容は絶対に禁止**です：

### 使用済みタイトル：
{titles_list}

### 既存問題の詳細（重複禁止）：
{questions_list}

### 禁止事項（厳守）：
1. 上記と同じトピック・テーマで問題を作成しない
2. 同じ正解を導く問題を作成しない
3. 言い換えただけの類似問題を作成しない
4. 「国旗と国歌」「租税の役割」など、既に出題されたテーマは別の角度でも使用禁止

### 新しい問題の要件：
- 上記の問題とは**完全に異なるテーマ・観点**から出題すること
- 解説テキスト内の**未使用の情報**を活用すること
- 上記の正解とは**異なる知識・概念**を問うこと"""

        user_prompt = f"""以下の学習指導要領に基づいて4択問題を1問作成してください。

## 対象
- 教科: {subject}
- 学年: 小学{grade}年生

## 学習目標
{description}

## 解説テキスト（参考情報）
{commentary}

## 追加指示
- 問題番号: {question_number}問目
{topic_instruction}{existing_questions_instruction}

上記の情報に基づいて、小学{grade}年生向けの4択問題をJSON形式で出力してください。"""

        return cls.SYSTEM_PROMPT, user_prompt

    @classmethod
    def build_batch_prompt(
        cls,
        subject: str,
        grade: int,
        description: str,
        commentary: str,
        questions_config: list[dict],
    ) -> tuple[str, str]:
        """
        複数問題を一括生成するためのプロンプトを構築

        Args:
            subject: 教科名
            grade: 学年
            description: 学習目標
            commentary: 解説テキスト
            questions_config: 問題設定のリスト
                各要素は {"number": int, "topic": str|None}

        Returns:
            tuple[str, str]: (システムプロンプト, ユーザープロンプト)
        """
        count = len(questions_config)

        # 解説テキストを適度な長さに制限（トークン節約）
        max_commentary_length = 6000
        if len(commentary) > max_commentary_length:
            commentary = commentary[:max_commentary_length] + "..."

        # 問題条件テーブルを構築
        questions_table = "| 問題番号 | テーマ |\n"
        questions_table += "|----------|--------|\n"

        for config in questions_config:
            num = config["number"]
            topic = config.get("topic") or "（指定なし）"
            questions_table += f"| {num} | {topic} |\n"

        system_prompt = f"""あなたは小学校教育の専門家です。
学習指導要領に基づいた高品質な4択問題を**{count}問**作成してください。

## ルール
1. 正解は必ず1つのみ
2. 全選択肢は同程度の長さで、紛らわしい誤答（ディストラクター）を含める
3. 提供された学習指導要領と解説テキストの情報のみを使用（事実を創作しない）
4. 小学生が理解できる平易な表現を使用
5. 問題文は具体的で明確に
6. 解説は正解の理由と学習ポイントを簡潔に説明
7. 【重要】各問題のタイトルと内容は互いに重複しないようにしてください
8. 【重要】各問題は異なる切り口・視点・具体例で作成してください

## 出力形式
必ず以下のJSON形式で{count}問を配列として出力してください。余計な説明は不要です。

```json
{{
  "questions": [
    {{
      "title": "問題のタイトル（10文字以内で簡潔に）",
      "question": "問題文（具体的で明確に）",
      "options": [
        "選択肢1のテキスト",
        "選択肢2のテキスト",
        "選択肢3のテキスト",
        "選択肢4のテキスト"
      ],
      "correct_index": 0,
      "explanation": "正解の理由と学習ポイントの解説"
    }}
  ]
}}
```

※ correct_index は0から始まる正解の選択肢番号（0=選択肢1, 1=選択肢2, ...）"""

        user_prompt = f"""以下の学習指導要領に基づいて4択問題を{count}問作成してください。

## 対象
- 教科: {subject}
- 学年: 小学{grade}年生

## 学習目標
{description}

## 解説テキスト（参考情報）
{commentary}

## 生成する問題一覧
以下の条件で{count}問を生成してください。各問題は異なる切り口・内容にしてください。

{questions_table}

## 注意事項
- 各問題のタイトルと内容は重複しないようにしてください
- テーマが指定されている場合はそのテーマに沿った問題を作成してください
- {count}問すべてを含む配列として出力してください

上記の情報に基づいて、小学{grade}年生向けの4択問題をJSON形式で出力してください。"""

        return system_prompt, user_prompt


# テスト用
if __name__ == "__main__":
    # サンプルデータでプロンプトを生成
    system_prompt, user_prompt = PromptBuilder.build(
        subject="社会",
        grade=6,
        description="我が国の政治の働きについて学習する",
        commentary="選挙は国民の代表者を選出する大切な仕組みである。国会議員は国民生活の安定と向上に努めなければならない。",
        question_number=1,
    )

    print("=== System Prompt ===")
    print(system_prompt)
    print("\n=== User Prompt ===")
    print(user_prompt)
