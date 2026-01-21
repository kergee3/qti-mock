"""Vercel Blobにファイルをアップロードするモジュール"""

import os
import sys
import json
import time
import requests
from pathlib import Path
from typing import Optional

# 親ディレクトリをパスに追加
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from config.settings import OUTPUT_DIR


class BlobUploader:
    """Vercel Blobへのアップローダー"""

    BASE_URL = "https://blob.vercel-storage.com"
    PUBLIC_BASE_URL = "https://tckuafka85ded2kl.public.blob.vercel-storage.com"

    def __init__(self, token: Optional[str] = None):
        """
        Args:
            token: BLOB_READ_WRITE_TOKEN（省略時は環境変数から取得）
        """
        self.token = token or os.getenv("BLOB_READ_WRITE_TOKEN")
        if not self.token:
            raise ValueError(
                "BLOB_READ_WRITE_TOKEN が設定されていません。"
                ".env ファイルに BLOB_READ_WRITE_TOKEN を設定してください。"
            )

    def upload_file(self, file_path: Path, blob_path: str, max_retries: int = 3, retry_delay: float = 2.0) -> dict:
        """
        単一ファイルをアップロード（リトライ機能付き）

        Args:
            file_path: アップロードするファイルのパス
            blob_path: Blob上のパス（例: ai-choice/social_31_xxx/file.xml）
            max_retries: 最大リトライ回数（デフォルト: 3）
            retry_delay: リトライ間隔（秒）（デフォルト: 2.0）

        Returns:
            dict: アップロード結果（url, pathname等）
        """
        if not file_path.exists():
            raise FileNotFoundError(f"ファイルが見つかりません: {file_path}")

        # Content-Typeを決定
        content_type = "application/xml" if file_path.suffix == ".xml" else "application/json"

        # ファイルを読み込み
        with open(file_path, "rb") as f:
            content = f.read()

        # Vercel Blob REST API でアップロード
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": content_type,
            "x-content-type": content_type,
        }

        url = f"{self.BASE_URL}/{blob_path}"

        print(f"[INFO] Uploading: {file_path.name} -> {blob_path}")

        last_error = None
        for attempt in range(max_retries):
            try:
                response = requests.put(url, headers=headers, data=content, timeout=60)

                if response.status_code in [200, 201]:
                    result = response.json()
                    print(f"[INFO] Uploaded: {result.get('url', blob_path)}")
                    return result

                # 503エラー等のリトライ可能なエラー
                if response.status_code in [500, 502, 503, 504]:
                    last_error = f"アップロード失敗: {response.status_code} - {response.text}"
                    if attempt < max_retries - 1:
                        wait_time = retry_delay * (attempt + 1)  # 徐々に待機時間を増やす
                        print(f"[WARN] アップロードエラー ({response.status_code})。{wait_time:.1f}秒後にリトライします... ({attempt + 1}/{max_retries})")
                        time.sleep(wait_time)
                        continue
                else:
                    # リトライ不要なエラー（400系など）
                    raise Exception(
                        f"アップロード失敗: {response.status_code} - {response.text}"
                    )

            except requests.exceptions.RequestException as e:
                last_error = str(e)
                if attempt < max_retries - 1:
                    wait_time = retry_delay * (attempt + 1)
                    print(f"[WARN] ネットワークエラー。{wait_time:.1f}秒後にリトライします... ({attempt + 1}/{max_retries})")
                    time.sleep(wait_time)
                    continue

        # 全てのリトライが失敗
        raise Exception(last_error or "アップロード失敗")

    def upload_directory(self, dir_path: Path, blob_prefix: str = "ai-choice", update_summary: bool = True) -> list[dict]:
        """
        ディレクトリ内の全ファイルをアップロード

        Args:
            dir_path: アップロードするディレクトリのパス
            blob_prefix: Blob上のプレフィックス（デフォルト: ai-choice）
            update_summary: summary.jsonのfilesを完全URLに更新するか（デフォルト: True）

        Returns:
            list[dict]: アップロード結果のリスト
        """
        if not dir_path.exists():
            raise FileNotFoundError(f"ディレクトリが見つかりません: {dir_path}")

        if not dir_path.is_dir():
            raise ValueError(f"ディレクトリではありません: {dir_path}")

        results = []
        folder_name = dir_path.name
        xml_url_map = {}  # ファイル名 -> URL のマッピング

        # XMLファイルを先にアップロード（summary.json以外）
        for file_path in sorted(dir_path.iterdir()):
            if file_path.is_file() and file_path.name != "summary.json":
                blob_path = f"{blob_prefix}/{folder_name}/{file_path.name}"
                try:
                    result = self.upload_file(file_path, blob_path)
                    results.append(result)
                    # XMLファイルのURLを記録
                    if file_path.suffix == ".xml" and "url" in result:
                        xml_url_map[file_path.name] = result["url"]
                except Exception as e:
                    print(f"[ERROR] {file_path.name} のアップロードに失敗: {e}")
                    results.append({"error": str(e), "file": str(file_path)})

        # summary.jsonを更新してアップロード
        summary_path = dir_path / "summary.json"
        if summary_path.exists() and update_summary and xml_url_map:
            try:
                # summary.jsonを読み込み
                with open(summary_path, "r", encoding="utf-8") as f:
                    summary = json.load(f)

                # filesを完全URLに置き換え
                original_files = summary.get("files", [])
                updated_files = []
                for filename in original_files:
                    if filename in xml_url_map:
                        updated_files.append(xml_url_map[filename])
                    else:
                        # URLが見つからない場合は元のファイル名を保持
                        updated_files.append(filename)
                        print(f"[WARN] {filename} のURLが見つかりませんでした")

                summary["files"] = updated_files

                # ローカルのsummary.jsonも更新
                with open(summary_path, "w", encoding="utf-8") as f:
                    json.dump(summary, f, ensure_ascii=False, indent=2)
                print(f"[INFO] summary.json を更新しました（{len(xml_url_map)}個のURL）")

                # 更新したsummary.jsonをアップロード
                blob_path = f"{blob_prefix}/{folder_name}/summary.json"
                result = self.upload_file(summary_path, blob_path)
                results.append(result)

            except Exception as e:
                print(f"[ERROR] summary.json の更新に失敗: {e}")
                # 更新に失敗した場合は元のsummary.jsonをアップロード
                blob_path = f"{blob_prefix}/{folder_name}/summary.json"
                result = self.upload_file(summary_path, blob_path)
                results.append(result)
        elif summary_path.exists():
            # update_summaryがFalseの場合はそのままアップロード
            blob_path = f"{blob_prefix}/{folder_name}/summary.json"
            result = self.upload_file(summary_path, blob_path)
            results.append(result)

        return results

    def get_public_url(self, blob_path: str) -> str:
        """
        Blob上のパスから公開URLを生成

        Args:
            blob_path: Blob上のパス

        Returns:
            str: 公開URL
        """
        return f"{self.PUBLIC_BASE_URL}/{blob_path}"


# テスト用
if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()

    # 最新の出力ディレクトリを取得
    output_dirs = sorted(OUTPUT_DIR.iterdir(), reverse=True)
    if not output_dirs:
        print("[ERROR] 出力ディレクトリが見つかりません")
        exit(1)

    latest_dir = output_dirs[0]
    print(f"[INFO] 最新の出力ディレクトリ: {latest_dir}")

    try:
        uploader = BlobUploader()
        results = uploader.upload_directory(latest_dir)

        print("\n=== アップロード結果 ===")
        for result in results:
            if "error" in result:
                print(f"  [ERROR] {result}")
            else:
                print(f"  [OK] {result.get('url', 'N/A')}")
    except ValueError as e:
        print(f"[ERROR] {e}")
