"""QTI問題生成バッチ - メインスクリプト"""

import argparse
import sys
import os
from pathlib import Path

# 親ディレクトリをパスに追加
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from config.settings import TARGET_CODES
from src.fetcher.cos_fetcher import COSFetcher
from src.generator.prompt_builder import PromptBuilder
from src.generator.question_generator import QuestionGenerator
from src.converter.qti_converter import QTIConverter
from src.storage.file_exporter import FileExporter


def generate_questions(
    code: str,
    count: int = 3,
    output_dir: Path = None,
) -> dict:
    """
    指定した学習指導要領コードから問題を生成

    Args:
        code: 学習指導要領コード
        count: 生成する問題数
        output_dir: 出力ディレクトリ

    Returns:
        dict: 生成結果のサマリー
    """
    print(f"\n{'='*60}")
    print(f"QTI問題生成バッチ")
    print(f"{'='*60}")
    print(f"学習指導要領コード: {code}")
    print(f"生成問題数: {count}")
    print(f"{'='*60}\n")

    # 1. 学習指導要領LODからデータ取得
    print("[Step 1/4] 学習指導要領LODからデータを取得中...")
    fetcher = COSFetcher()
    context = fetcher.get_full_context(code)

    print(f"  - 教科: {context['subject']}")
    print(f"  - 学年: {context['grade']}年")
    print(f"  - 解説テキスト数: {context['commentary_count']}")

    if not context['commentary']:
        print("[WARN] 解説テキストが見つかりませんでした")
        return {"error": "No commentary found"}

    # 2. 問題を生成
    print(f"\n[Step 2/4] Claude APIで問題を生成中...")
    generator = QuestionGenerator()
    questions = []

    for i in range(count):
        print(f"\n  問題 {i+1}/{count} を生成中...")

        # プロンプトを構築
        system_prompt, user_prompt = PromptBuilder.build(
            subject=context['subject'],
            grade=context['grade'],
            description=context['description'] or "",
            commentary=context['commentary'],
            question_number=i + 1,
        )

        try:
            question = generator.generate(system_prompt, user_prompt)
            questions.append(question)
            print(f"    タイトル: {question.get('title', 'N/A')}")
        except Exception as e:
            print(f"    [ERROR] 生成失敗: {e}")
            questions.append({"error": str(e)})

    # エラーなしの問題のみ抽出
    valid_questions = [q for q in questions if "error" not in q]

    if not valid_questions:
        print("\n[ERROR] 有効な問題が生成されませんでした")
        return {"error": "No valid questions generated"}

    # 3. QTI XMLに変換
    print(f"\n[Step 3/4] QTI XMLに変換中...")
    xml_contents = []
    for i, question in enumerate(valid_questions):
        identifier = f"{code}-{i+1:03d}"
        xml = QTIConverter.convert(question, identifier=identifier)
        xml_contents.append(xml)
        print(f"  - {identifier}: {question.get('title', 'N/A')}")

    # 4. ファイル出力
    print(f"\n[Step 4/4] ファイルを出力中...")
    exporter = FileExporter(output_dir)

    # 科目名を取得してプレフィックスに使用
    subject_map = {
        "社会": "social",
        "理科": "science",
    }
    prefix = f"{subject_map.get(context['subject'], 'item')}_{code[-10:-8]}"

    summary = exporter.export_batch(
        questions=valid_questions,
        xml_contents=xml_contents,
        prefix=prefix,
        metadata={
            "cos_code": code,
            "subject": context['subject'],
            "grade": context['grade'],
            "description": context['description'],
        }
    )

    print(f"\n{'='*60}")
    print(f"生成完了！")
    print(f"{'='*60}")
    print(f"生成問題数: {len(valid_questions)}/{count}")
    print(f"出力先: {summary['output_directory']}")
    print(f"{'='*60}\n")

    return summary


def main():
    """メイン関数"""
    parser = argparse.ArgumentParser(
        description="学習指導要領LODから4択問題を自動生成"
    )
    parser.add_argument(
        "--code",
        type=str,
        help="学習指導要領コード（例: 8220263100000000）",
    )
    parser.add_argument(
        "--subject",
        type=str,
        choices=list(TARGET_CODES.keys()),
        help="対象分野（コード指定の代わりに使用可能）",
    )
    parser.add_argument(
        "--count",
        type=int,
        default=3,
        help="生成する問題数（デフォルト: 3）",
    )
    parser.add_argument(
        "--output",
        type=str,
        help="出力ディレクトリ（デフォルト: output/）",
    )
    parser.add_argument(
        "--list-subjects",
        action="store_true",
        help="利用可能な分野一覧を表示",
    )

    args = parser.parse_args()

    # 分野一覧を表示
    if args.list_subjects:
        print("\n利用可能な分野一覧:")
        print("-" * 50)
        for name, code in TARGET_CODES.items():
            print(f"  {name}: {code}")
        print("-" * 50)
        print("\n使用例:")
        print("  python src/main.py --subject 社会_政治 --count 5")
        print("  python src/main.py --code 8220263100000000 --count 3")
        return

    # コードを決定
    if args.code:
        code = args.code
    elif args.subject:
        code = TARGET_CODES.get(args.subject)
        if not code:
            print(f"[ERROR] 不明な分野: {args.subject}")
            print("利用可能な分野: ", list(TARGET_CODES.keys()))
            return
    else:
        # デフォルトは社会・政治
        code = TARGET_CODES["社会_政治"]
        print(f"[INFO] コードが指定されていないため、デフォルト（社会・政治）を使用します")

    # 出力ディレクトリ
    output_dir = Path(args.output) if args.output else None

    # 問題生成を実行
    try:
        generate_questions(code=code, count=args.count, output_dir=output_dir)
    except Exception as e:
        print(f"\n[ERROR] 生成に失敗しました: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
