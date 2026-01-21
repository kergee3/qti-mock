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
from src.generator.topic_extractor import TopicExtractor
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
) -> dict:
    """
    指定した学習指導要領コードから記述式問題を生成

    Args:
        code: 学習指導要領コード
        count: 生成する問題数（デフォルト: 5）
        output_dir: 出力ディレクトリ
        upload: Vercel Blobにアップロードするか

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
    print("[Step 1/6] 学習指導要領LODからデータを取得中...")
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

    # 2. トピックを抽出
    step2_start = time.time()
    print(f"\n[Step 2/6] 解説テキストから記述式問題用トピックを抽出中...")
    topic_extractor = TopicExtractor()

    if sections:
        topics = topic_extractor.extract_from_sections(sections, max_topics=count)
    else:
        topics = topic_extractor.extract(context.get('parent_commentary', ''), max_topics=count)

    if not topics:
        print("[WARN] トピックが抽出できませんでした。デフォルトモードで生成します。")
        topics = [None]

    print(f"  - 抽出トピック数: {len(topics)}")

    step_times['Step 2: トピック抽出'] = time.time() - step2_start

    # 3. 問題を生成
    step3_start = time.time()
    print(f"\n[Step 3/6] Claude APIで記述式問題を生成中...")
    generator = TextQuestionGenerator()
    api_stats.set_model(generator.model)  # モデル情報を設定
    questions = []

    # 全セクションの解説を結合
    all_commentary_parts = []
    if context.get('parent_commentary'):
        all_commentary_parts.append(context['parent_commentary'])
    for section in sections:
        if section.get('commentary'):
            all_commentary_parts.append(section['commentary'])
    combined_commentary = "\n\n---\n\n".join(all_commentary_parts)

    # 失敗したトピックを追跡
    failed_topics = []
    topic_index = 0
    questions_with_topics = []
    # 生成済み問題を追跡（重複防止用：タイトルと問題文を保持）
    existing_questions = []

    while len(questions_with_topics) < count:
        # トピックを選択
        if topic_index < len(topics):
            topic = topics[topic_index] if topics[0] is not None else None
            original_topic_index = topic_index
        else:
            remaining_topics = [t for t in topics if t not in failed_topics]
            if remaining_topics:
                reuse_index = (topic_index - len(topics)) % len(remaining_topics)
                topic = remaining_topics[reuse_index]
                original_topic_index = topics.index(topic)
            else:
                print(f"    [WARN] 利用可能なトピックがなくなりました")
                break

        # 難易度を計算（問題番号に応じて設定）
        current_question_num = len(questions_with_topics) + 1
        difficulty = get_difficulty(current_question_num, count)
        char_limits = get_char_limits(current_question_num)

        print(f"\n  問題 {current_question_num}/{count} を生成中... (トピック: {topic or '指定なし'}, 難易度: {difficulty}, 字数: {char_limits['min_chars']}-{char_limits['max_chars']}文字)")

        # プロンプトを構築
        system_prompt, user_prompt = PromptBuilder.build(
            subject=context['subject'],
            grade=context['grade'],
            description=context['description'] or "",
            commentary=combined_commentary,
            question_number=current_question_num,
            difficulty=difficulty,
            focus_topic=topic,
            existing_questions=existing_questions,
        )

        try:
            question = generator.generate(system_prompt, user_prompt)
            title = question.get('title', '')
            question_text = question.get('question_text', '')
            questions_with_topics.append({
                'question': question,
                'topic': topic,
                'topic_index': original_topic_index,
                'generation_order': len(questions_with_topics),
            })
            # 生成済み問題を追跡（重複防止用：タイトルと問題文）
            existing_questions.append({
                'title': title,
                'question_text': question_text,
            })
            print(f"    タイトル: {title or 'N/A'}")
            print(f"    難易度: {question.get('difficulty', 'N/A')}")
        except Exception as e:
            print(f"    [ERROR] 生成失敗: {e}")
            if topic is not None and topic not in failed_topics:
                failed_topics.append(topic)
                print(f"    [INFO] 別のトピックで再試行します...")

        topic_index += 1

        # 無限ループ防止
        if topic_index > count * 3:
            print(f"    [WARN] 最大試行回数に達しました")
            break

    # トピック順にソート
    questions_with_topics.sort(key=lambda x: (x['topic_index'], x['generation_order']))
    valid_questions = [q['question'] for q in questions_with_topics]

    if questions_with_topics:
        print(f"\n  [INFO] 問題をトピック順に並び替えました")

    if not valid_questions:
        print("\n[ERROR] 有効な問題が生成されませんでした")
        logger.stop()
        return {"error": "No valid questions generated"}

    step_times['Step 3: 問題生成'] = time.time() - step3_start

    # 4. QTI XMLに変換
    step4_start = time.time()
    print(f"\n[Step 4/6] QTI XMLに変換中...")
    xml_contents = []
    for i, question in enumerate(valid_questions):
        question_number = i + 1
        identifier = f"text-{code}-{question_number:03d}"
        xml = QTITextConverter.convert(question, identifier=identifier, question_number=question_number)
        xml_contents.append(xml)
        char_limits = get_char_limits(question_number)
        print(f"  - {identifier}: {question.get('title', 'N/A')} (字数: {char_limits['min_chars']}-{char_limits['max_chars']})")

    step_times['Step 4: XML変換'] = time.time() - step4_start

    # 5. ファイル出力
    step5_start = time.time()
    print(f"\n[Step 5/6] ファイルを出力中...")
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

    step_times['Step 5: ファイル出力'] = time.time() - step5_start

    print(f"\n{'='*60}")
    print(f"生成完了！")
    print(f"{'='*60}")
    print(f"生成問題数: {len(valid_questions)}/{count}")
    print(f"出力先: {summary['output_directory']}")
    print(f"{'='*60}\n")

    # 6. Vercel Blobにアップロード（オプション）
    if upload:
        step6_start = time.time()
        print(f"[Step 6/6] Vercel Blobにアップロード中...")
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
            print(f"[Step 7] summary.jsonをsummaryフォルダにコピー中...")
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

        step_times['Step 6: アップロード'] = time.time() - step6_start

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
        generate_text_questions(code=code, count=args.count, output_dir=output_dir, upload=args.upload)
    except Exception as e:
        print(f"\n[ERROR] 生成に失敗しました: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
