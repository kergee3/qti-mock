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

        Returns:
            tuple: (system_prompt, user_prompt)
        """
        # 解説テキストを適度な長さに制限（トークン節約）
        max_commentary_length = 3000
        if len(commentary) > max_commentary_length:
            commentary = commentary[:max_commentary_length] + "..."

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
{f'''- 【重要】今回は必ず「{focus_topic}」に関する問題を作成してください
- 他のトピックではなく、指定されたトピックに焦点を当ててください''' if focus_topic else "- 前の問題と重複しない内容にしてください"}

上記の情報に基づいて、小学{grade}年生向けの4択問題をJSON形式で出力してください。"""

        return cls.SYSTEM_PROMPT, user_prompt

    @classmethod
    def build_batch(
        cls,
        subject: str,
        grade: int,
        description: str,
        commentary: str,
        count: int = 5,
    ) -> list[tuple[str, str]]:
        """
        複数問題生成用のプロンプトリストを構築

        Args:
            subject: 教科名
            grade: 学年
            description: 学習目標
            commentary: 解説テキスト
            count: 生成する問題数

        Returns:
            list: [(system_prompt, user_prompt), ...]のリスト
        """
        prompts = []
        for i in range(count):
            system_prompt, user_prompt = cls.build(
                subject=subject,
                grade=grade,
                description=description,
                commentary=commentary,
                question_number=i + 1,
            )
            prompts.append((system_prompt, user_prompt))
        return prompts


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
