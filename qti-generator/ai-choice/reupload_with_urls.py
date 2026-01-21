"""既存の出力ディレクトリをVercel Blobに再アップロードするスクリプト

summary.jsonのfilesを完全URLに更新してアップロードします。
既存のデータをai-choiceページで使用できるようにします。

使用方法:
    python reupload_with_urls.py                    # 全ディレクトリを再アップロード
    python reupload_with_urls.py --dir social_31_xxx  # 指定ディレクトリのみ
"""

import argparse
import sys
import os
from pathlib import Path

# 親ディレクトリをパスに追加
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
from config.settings import OUTPUT_DIR
from src.storage.blob_uploader import BlobUploader


def reupload_directory(dir_path: Path) -> dict:
    """
    指定ディレクトリを再アップロード

    Args:
        dir_path: アップロードするディレクトリ

    Returns:
        dict: アップロード結果
    """
    print(f"\n{'='*60}")
    print(f"再アップロード: {dir_path.name}")
    print(f"{'='*60}")

    uploader = BlobUploader()
    results = uploader.upload_directory(dir_path, update_summary=True)

    success_count = sum(1 for r in results if "error" not in r)
    error_count = sum(1 for r in results if "error" in r)

    print(f"\n完了: 成功 {success_count}, 失敗 {error_count}")

    # summary.jsonのURLを表示
    summary_result = next((r for r in results if "summary" in r.get("url", "")), None)
    if summary_result:
        print(f"Summary URL: {summary_result['url']}")

    return {
        "directory": dir_path.name,
        "success_count": success_count,
        "error_count": error_count,
        "results": results,
        "summary_url": summary_result.get("url") if summary_result else None,
    }


def main():
    """メイン関数"""
    load_dotenv()

    parser = argparse.ArgumentParser(
        description="既存の出力ディレクトリをVercel Blobに再アップロード"
    )
    parser.add_argument(
        "--dir",
        type=str,
        help="アップロードするディレクトリ名（省略時は全ディレクトリ）",
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="出力ディレクトリ一覧を表示",
    )

    args = parser.parse_args()

    # 出力ディレクトリの存在確認
    if not OUTPUT_DIR.exists():
        print(f"[ERROR] 出力ディレクトリが見つかりません: {OUTPUT_DIR}")
        return

    # ディレクトリ一覧を取得
    output_dirs = sorted(
        [d for d in OUTPUT_DIR.iterdir() if d.is_dir()],
        key=lambda x: x.name,
    )

    if not output_dirs:
        print("[ERROR] 出力ディレクトリが空です")
        return

    # 一覧表示
    if args.list:
        print("\n出力ディレクトリ一覧:")
        print("-" * 50)
        for d in output_dirs:
            summary_path = d / "summary.json"
            status = "✓" if summary_path.exists() else "✗"
            print(f"  {status} {d.name}")
        print("-" * 50)
        print(f"\n合計: {len(output_dirs)} ディレクトリ")
        return

    # 特定ディレクトリの再アップロード
    if args.dir:
        target_dir = OUTPUT_DIR / args.dir
        if not target_dir.exists():
            print(f"[ERROR] ディレクトリが見つかりません: {args.dir}")
            print("\n利用可能なディレクトリ:")
            for d in output_dirs:
                print(f"  - {d.name}")
            return

        try:
            result = reupload_directory(target_dir)
            print(f"\n{'='*60}")
            print("アップロード完了")
            print(f"{'='*60}")
        except Exception as e:
            print(f"[ERROR] アップロードに失敗しました: {e}")
        return

    # 全ディレクトリの再アップロード
    print(f"\n{'='*60}")
    print(f"全ディレクトリを再アップロード ({len(output_dirs)}個)")
    print(f"{'='*60}")

    all_results = []
    for dir_path in output_dirs:
        try:
            result = reupload_directory(dir_path)
            all_results.append(result)
        except Exception as e:
            print(f"[ERROR] {dir_path.name} のアップロードに失敗: {e}")
            all_results.append({"directory": dir_path.name, "error": str(e)})

    # サマリー表示
    print(f"\n{'='*60}")
    print("全体サマリー")
    print(f"{'='*60}")

    total_success = sum(r.get("success_count", 0) for r in all_results if "error" not in r)
    total_errors = sum(r.get("error_count", 0) for r in all_results)
    dir_errors = sum(1 for r in all_results if "error" in r and "success_count" not in r)

    print(f"ディレクトリ数: {len(output_dirs)}")
    print(f"成功ファイル数: {total_success}")
    print(f"失敗ファイル数: {total_errors}")
    if dir_errors:
        print(f"失敗ディレクトリ数: {dir_errors}")

    # ai-choice.md用のテーブル行を出力
    print(f"\n{'='*60}")
    print("ai-choice.md 更新用データ")
    print(f"{'='*60}")
    print("\n| 学年 | 科目 | 分野 | 学習指導要領コード | Summary_URL |")
    print("|------|------|------|-------------------|---------|")

    for result in all_results:
        if "summary_url" in result and result["summary_url"]:
            print(f"| 小6 | 社会 | XXX | XXXXXXXXXXXXXXXX | {result['summary_url']} |")


if __name__ == "__main__":
    main()
