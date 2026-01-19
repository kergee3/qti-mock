"""ロギングユーティリティ - コンソールとファイルへの同時出力"""

import sys
import shutil
import tempfile
from pathlib import Path
from datetime import datetime


class TeeLogger:
    """標準出力をコンソールとファイルの両方に出力するクラス"""

    def __init__(self, log_file: Path = None):
        """
        Args:
            log_file: ログファイルのパス（Noneの場合は一時ファイルを使用）
        """
        self.terminal = sys.stdout
        self.log_file = log_file
        self.temp_file = None
        self.file = None

    def start(self):
        """ロギングを開始"""
        if self.log_file:
            self.log_file.parent.mkdir(parents=True, exist_ok=True)
            self.file = open(self.log_file, "w", encoding="utf-8")
        else:
            # 一時ファイルを使用
            self.temp_file = tempfile.NamedTemporaryFile(
                mode="w",
                encoding="utf-8",
                suffix=".log",
                delete=False
            )
            self.file = self.temp_file

        # ログ開始時刻を記録
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        self.file.write(f"# QTI問題生成ログ - {timestamp}\n")
        self.file.write("=" * 60 + "\n\n")
        sys.stdout = self

    def stop(self):
        """ロギングを停止"""
        if self.file:
            # ログ終了時刻を記録
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            self.file.write(f"\n{'=' * 60}\n")
            self.file.write(f"# ログ終了 - {timestamp}\n")
            self.file.flush()
            self.file.close()
            self.file = None
        sys.stdout = self.terminal

    def save_to(self, destination: Path):
        """
        ログを指定先にコピー（一時ファイル使用時）

        Args:
            destination: コピー先のパス
        """
        if self.temp_file:
            temp_path = Path(self.temp_file.name)
            if temp_path.exists():
                destination.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(temp_path, destination)
                # 一時ファイルを削除
                temp_path.unlink()
                return destination
        return None

    def get_temp_path(self) -> Path:
        """一時ファイルのパスを取得"""
        if self.temp_file:
            return Path(self.temp_file.name)
        return None

    def write(self, message):
        """メッセージを出力"""
        self.terminal.write(message)
        if self.file:
            self.file.write(message)
            self.file.flush()  # 即座に書き込み

    def flush(self):
        """バッファをフラッシュ"""
        self.terminal.flush()
        if self.file:
            self.file.flush()

    def __enter__(self):
        self.start()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.stop()
        return False
