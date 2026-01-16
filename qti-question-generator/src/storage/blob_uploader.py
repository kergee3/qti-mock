"""Vercel Blobにファイルをアップロードするモジュール"""

import os
import sys
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

    def upload_file(self, file_path: Path, blob_path: str) -> dict:
        """
        単一ファイルをアップロード

        Args:
            file_path: アップロードするファイルのパス
            blob_path: Blob上のパス（例: ai-choice/social_31_xxx/file.xml）

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

        response = requests.put(url, headers=headers, data=content, timeout=60)

        if response.status_code not in [200, 201]:
            raise Exception(
                f"アップロード失敗: {response.status_code} - {response.text}"
            )

        result = response.json()
        print(f"[INFO] Uploaded: {result.get('url', blob_path)}")
        return result

    def upload_directory(self, dir_path: Path, blob_prefix: str = "ai-choice") -> list[dict]:
        """
        ディレクトリ内の全ファイルをアップロード

        Args:
            dir_path: アップロードするディレクトリのパス
            blob_prefix: Blob上のプレフィックス（デフォルト: ai-choice）

        Returns:
            list[dict]: アップロード結果のリスト
        """
        if not dir_path.exists():
            raise FileNotFoundError(f"ディレクトリが見つかりません: {dir_path}")

        if not dir_path.is_dir():
            raise ValueError(f"ディレクトリではありません: {dir_path}")

        results = []
        folder_name = dir_path.name

        # ディレクトリ内の全ファイルをアップロード
        for file_path in sorted(dir_path.iterdir()):
            if file_path.is_file():
                blob_path = f"{blob_prefix}/{folder_name}/{file_path.name}"
                try:
                    result = self.upload_file(file_path, blob_path)
                    results.append(result)
                except Exception as e:
                    print(f"[ERROR] {file_path.name} のアップロードに失敗: {e}")
                    results.append({"error": str(e), "file": str(file_path)})

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
