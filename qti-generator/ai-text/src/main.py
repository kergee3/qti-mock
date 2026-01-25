"""記述式問題生成バッチ - メインスクリプト"""

import argparse
import sys
import os
import shutil
import time
from pathlib import Path

# 親ディレクトリをパスに追加
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from config.settings import TARGET_CODES, TEXT_QUESTION_CONFIG, CHAR_LIMIT_CONFIG, get_difficulty, get_char_limits
from src.fetcher.cos_fetcher import COSFetcher
from src.generator.prompt_builder import PromptBuilder
from src.generator.text_question_generator import TextQuestionGenerator
from src.converter.qti_text_converter import QTITextConverter
from src.storage.file_exporter import FileExporter
from src.storage.blob_uploader import BlobUploader
from src.utils.api_stats import api_stats
from src.utils.logger import TeeLogger


def generate_text_questions(
    code: str,
    count: int = 5,
    output_dir: Path = None,
    upload: bool = False,
    enable_ruby: bool = True,
) -> dict:
    """
    指定した学習指導要領コードから記述式問題を生成

    Args:
        code: 学習指導要領コード
        count: 生成する問題数（デフォルト: 5）
        output_dir: 出力ディレクトリ
        upload: Vercel Blobにアップロードするか
        enable_ruby: ルビ（ふりがな）を付けるかどうか（デフォルト: True）

    Returns:
        dict: 生成結果のサマリー
    """
    # API統計をリセット
    api_stats.reset()

    # 時間計測用
    step_times = {}
    total_start_time = time.time()

    # ログ記録を開始（一時ファイルに保存、後で出力フォルダにコピー）
    logger = TeeLogger()
    logger.start()

    print(f"\n{'='*60}")
    print(f"記述式問題生成バッチ")
    print(f"{'='*60}")
    print(f"学習指導要領コード: {code}")
    print(f"生成問題数: {count}")
    print(f"{'='*60}\n")

    # 1. 学習指導要領LODからデータ取得
    step1_start = time.time()
    print("[Step 1/5] 学習指導要領LODからデータを取得中...")
    fetcher = COSFetcher()
    context = fetcher.get_full_context_with_sections(code)

    print(f"  - 教科: {context['subject']}")
    print(f"  - 学年: {context['grade']}年")
    print(f"  - 解説テキスト数: {context['commentary_count']}")
    print(f"  - 下位コード数: {context.get('child_codes_count', 0)}")

    # 各セクションの情報を表示
    if context.get('sections'):
        print(f"  - セクション情報:")
        for i, section in enumerate(context['sections'], 1):
            desc = section.get('description', '')[:30] if section.get('description') else ''
            print(f"    {i}. {section['code']}: {section['commentary_count']}件 ({desc}...)")

    sections = context.get('sections', [])
    if not sections and not context.get('parent_commentary'):
        print("[WARN] 解説テキストが見つかりませんでした")
        logger.stop()
        return {"error": "No commentary found"}

    step_times['Step 1: データ取得'] = time.time() - step1_start

    # 2. 問題を生成（一括生成）
    step2_start = time.time()
    print(f"\n[Step 2/5] Claude APIで記述式問題を一括生成中...")
    generator = TextQuestionGenerator()
    api_stats.set_model(generator.model)  # モデル情報を設定

    # 全セクションの解説を結合
    all_commentary_parts = []
    if context.get('parent_commentary'):
        all_commentary_parts.append(context['parent_commentary'])
    for section in sections:
        if section.get('commentary'):
            all_commentary_parts.append(section['commentary'])
    combined_commentary = "\n\n---\n\n".join(all_commentary_parts)

    # 問題条件リストを構築
    questions_config = []
    for i in range(count):
        question_number = i + 1
        questions_config.append({
            "number": question_number,
            "difficulty": get_difficulty(question_number, count),
            "char_limits": get_char_limits(question_number),
            "topic": None,
        })

    # 問題条件を表示
    print(f"\n  生成条件:")
    for config in questions_config:
        print(f"    問題{config['number']}: 難易度{config['difficulty']}, "
              f"字数{config['char_limits']['min_chars']}-{config['char_limits']['max_chars']}字")

    # 一括生成用プロンプトを構築
    system_prompt, user_prompt = PromptBuilder.build_batch(
        subject=context['subject'],
        grade=context['grade'],
        description=context['description'] or "",
        commentary=combined_commentary,
        questions_config=questions_config,
        enable_ruby=enable_ruby,
    )

    # 一括生成を実行
    print(f"\n  一括生成中...")
    try:
        valid_questions = generator.generate_batch(system_prompt, user_prompt, count)
        print(f"\n  [INFO] 一括生成完了: {len(valid_questions)}/{count}問")

        # 各問題の情報を表示
        for i, q in enumerate(valid_questions):
            print(f"    問題{i+1}: {q.get('title', 'N/A')} (難易度: {q.get('difficulty', 'N/A')})")

    except Exception as e:
        print(f"\n  [ERROR] 一括生成に失敗: {e}")
        valid_questions = []

    # フォールバック: 不足分を個別生成で補完
    if len(valid_questions) < count:
        print(f"\n  [INFO] 不足分 {count - len(valid_questions)}問 を個別生成で補完中...")

        # 既存問題を重複防止用にリスト化
        existing_questions = [
            {'title': q.get('title', ''), 'question_text': q.get('question_text', '')}
            for q in valid_questions
        ]

        # 不足分を個別生成
        fallback_attempts = 0
        max_fallback_attempts = (count - len(valid_questions)) * 3

        while len(valid_questions) < count and fallback_attempts < max_fallback_attempts:
            current_num = len(valid_questions) + 1
            config = questions_config[current_num - 1] if current_num <= len(questions_config) else {
                "number": current_num,
                "difficulty": get_difficulty(current_num, count),
                "char_limits": get_char_limits(current_num),
                "topic": None,
            }

            print(f"\n    フォールバック: 問題{current_num}を個別生成中...")

            system_prompt, user_prompt = PromptBuilder.build(
                subject=context['subject'],
                grade=context['grade'],
                description=context['description'] or "",
                commentary=combined_commentary,
                question_number=current_num,
                difficulty=config['difficulty'],
                focus_topic=config.get('topic'),
                existing_questions=existing_questions,
                enable_ruby=enable_ruby,
            )

            try:
                question = generator.generate(system_prompt, user_prompt)
                valid_questions.append(question)
                existing_questions.append({
                    'title': question.get('title', ''),
                    'question_text': question.get('question_text', ''),
                })
                print(f"      成功: {question.get('title', 'N/A')}")
            except Exception as e:
                print(f"      失敗: {e}")

            fallback_attempts += 1

        if len(valid_questions) < count:
            print(f"\n  [WARN] フォールバック後も不足: {len(valid_questions)}/{count}問")

    if not valid_questions:
        print("\n[ERROR] 有効な問題が生成されませんでした")
        logger.stop()
        return {"error": "No valid questions generated"}

    step_times['Step 2: 問題生成'] = time.time() - step2_start

    # 3. QTI XMLに変換
    step3_start = time.time()
    print(f"\n[Step 3/5] QTI XMLに変換中...")
    xml_contents = []
    for i, question in enumerate(valid_questions):
        question_number = i + 1
        identifier = f"text-{code}-{question_number:03d}"
        xml = QTITextConverter.convert(question, identifier=identifier, question_number=question_number, enable_ruby=enable_ruby)
        xml_contents.append(xml)
        char_limits = get_char_limits(question_number)
        print(f"  - {identifier}: {question.get('title', 'N/A')} (字数: {char_limits['min_chars']}-{char_limits['max_chars']})")

    step_times['Step 3: XML変換'] = time.time() - step3_start

    # 4. ファイル出力
    step4_start = time.time()
    print(f"\n[Step 4/5] ファイルを出力中...")
    exporter = FileExporter(output_dir)

    # 科目名を取得してプレフィックスに使用
    subject_map = {
        "社会": "social",
        "理科": "science",
    }
    prefix = f"text_{subject_map.get(context['subject'], 'item')}_{code[-10:-8]}"

    summary = exporter.export_batch(
        questions=valid_questions,
        xml_contents=xml_contents,
        prefix=prefix,
        metadata={
            "cos_code": code,
            "subject": context['subject'],
            "grade": context['grade'],
            "description": context['description'],
            "question_type": "extended_text",
            "char_limits": {
                "short": CHAR_LIMIT_CONFIG["short"],  # 1-2問目用
                "long": CHAR_LIMIT_CONFIG["long"],    # 3問目以降用
            },
            "max_score": TEXT_QUESTION_CONFIG["max_score"],
        },
        model=generator.model,
    )

    step_times['Step 4: ファイル出力'] = time.time() - step4_start

    print(f"\n{'='*60}")
    print(f"生成完了！")
    print(f"{'='*60}")
    print(f"生成問題数: {len(valid_questions)}/{count}")
    print(f"出力先: {summary['output_directory']}")
    print(f"{'='*60}\n")

    # 5. Vercel Blobにアップロード（オプション）
    if upload:
        step5_start = time.time()
        print(f"[Step 5/5] Vercel Blobにアップロード中...")
        try:
            uploader = BlobUploader()
            batch_dir = exporter.output_dir / summary['output_directory']
            upload_results = uploader.upload_directory(batch_dir, blob_prefix="ai-text")

            success_count = sum(1 for r in upload_results if "error" not in r)
            print(f"\n{'='*60}")
            print(f"アップロード完了！")
            print(f"{'='*60}")
            print(f"成功: {success_count}/{len(upload_results)}")

            if upload_results and "url" in upload_results[0]:
                print(f"公開URL: {uploader.PUBLIC_BASE_URL}/ai-text/{summary['output_directory']}/")
            print(f"{'='*60}\n")

            summary['upload_results'] = upload_results

            # summary.jsonをsummaryフォルダにコピー
            print(f"[Step 6] summary.jsonをsummaryフォルダにコピー中...")
            try:
                summary_src = batch_dir / "summary.json"
                summary_dest_dir = exporter.output_dir / "summary"
                summary_dest_dir.mkdir(parents=True, exist_ok=True)
                summary_dest = summary_dest_dir / f"{summary['output_directory']}_summary.json"
                shutil.copy2(summary_src, summary_dest)
                print(f"[INFO] コピー完了: {summary_dest}")
                summary['summary_copy_path'] = str(summary_dest)
            except Exception as e:
                print(f"[ERROR] summary.jsonのコピーに失敗しました: {e}")
                summary['summary_copy_error'] = str(e)

        except Exception as e:
            print(f"[ERROR] アップロードに失敗しました: {e}")
            summary['upload_error'] = str(e)

        step_times['Step 5: アップロード'] = time.time() - step5_start

    # 合計時間を計算
    total_time = time.time() - total_start_time

    # 実行時間を表示
    print(f"\n{'='*60}")
    print(f"実行時間サマリー")
    print(f"{'='*60}")
    for step_name, step_time in step_times.items():
        print(f"  {step_name}: {step_time:.2f}秒")
    print(f"  {'─'*40}")
    print(f"  合計: {total_time:.2f}秒 ({total_time/60:.1f}分)")
    print(f"{'='*60}\n")

    # API使用統計を表示
    api_stats.print_summary()

    # 統計情報をサマリーに追加
    summary['api_stats'] = {
        'model': api_stats.model,
        'total_api_calls': api_stats.total_api_calls,
        'total_input_tokens': api_stats.total_input_tokens,
        'total_output_tokens': api_stats.total_output_tokens,
        'total_input_cost_usd': api_stats.total_input_cost,
        'total_output_cost_usd': api_stats.total_output_cost,
        'total_cost_usd': api_stats.total_cost,
        'steps': {
            step.name: {
                'api_calls': step.api_calls,
                'input_tokens': step.input_tokens,
                'output_tokens': step.output_tokens,
                'input_cost_usd': step.get_input_cost(api_stats.model),
                'output_cost_usd': step.get_output_cost(api_stats.model),
            }
            for step in api_stats.get_all_steps()
        }
    }

    # 実行時間をサマリーに追加
    summary['execution_time'] = {
        'steps': {k: round(v, 2) for k, v in step_times.items()},
        'total_seconds': round(total_time, 2),
        'total_minutes': round(total_time / 60, 2),
    }

    # ロガーを停止し、ログファイルを出力フォルダにコピー
    logger.stop()
    batch_dir = exporter.output_dir / summary['output_directory']
    log_file = batch_dir / "generation.log"
    saved_path = logger.save_to(log_file)
    if saved_path:
        summary['log_file'] = str(log_file.name)
        print(f"[INFO] ログファイル保存: {log_file}")

    return summary


def main():
    """メイン関数"""
    parser = argparse.ArgumentParser(
        description="学習指導要領LODから記述式問題を自動生成"
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
        default=5,
        help="生成する問題数（デフォルト: 5）",
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
    parser.add_argument(
        "--upload",
        action="store_true",
        help="生成後にVercel Blobにアップロード",
    )
    parser.add_argument(
        "--no-ruby",
        action="store_true",
        help="ルビ（ふりがな）を付けない",
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
        generate_text_questions(code=code, count=args.count, output_dir=output_dir, upload=args.upload, enable_ruby=not args.no_ruby)
    except Exception as e:
        print(f"\n[ERROR] 生成に失敗しました: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
