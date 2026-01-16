"""生成した問題をファイルに出力するモジュール"""

import json
import os
from pathlib import Path
from datetime import datetime
from typing import Optional
import sys

# 親ディレクトリをパスに追加
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from config.settings import OUTPUT_DIR


class FileExporter:
    """生成した問題をファイルに出力"""

    def __init__(self, output_dir: Optional[Path] = None):
        """
        Args:
            output_dir: 出力ディレクトリ（省略時はデフォルト設定を使用）
        """
        self.output_dir = output_dir or OUTPUT_DIR
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def export_xml(self, xml_content: str, filename: str) -> Path:
        """
        QTI XMLをファイルに出力

        Args:
            xml_content: XML文字列
            filename: ファイル名（.xmlは自動付与）

        Returns:
            Path: 出力ファイルのパス
        """
        if not filename.endswith(".xml"):
            filename = f"{filename}.xml"

        output_path = self.output_dir / filename
        output_path.write_text(xml_content, encoding="utf-8")

        print(f"[INFO] Exported XML: {output_path}")
        return output_path

    def export_json(self, data: dict | list, filename: str) -> Path:
        """
        JSONデータをファイルに出力

        Args:
            data: 出力するデータ
            filename: ファイル名（.jsonは自動付与）

        Returns:
            Path: 出力ファイルのパス
        """
        if not filename.endswith(".json"):
            filename = f"{filename}.json"

        output_path = self.output_dir / filename
        output_path.write_text(
            json.dumps(data, ensure_ascii=False, indent=2),
            encoding="utf-8"
        )

        print(f"[INFO] Exported JSON: {output_path}")
        return output_path

    def export_batch(
        self,
        questions: list[dict],
        xml_contents: list[str],
        prefix: str = "generated",
        metadata: Optional[dict] = None,
        model: Optional[str] = None,
    ) -> dict:
        """
        複数の問題をバッチ出力

        Args:
            questions: 問題データのリスト
            xml_contents: QTI XMLのリスト
            prefix: ファイル名のプレフィックス
            metadata: 追加メタデータ
            model: 問題生成に使用したAIモデル名

        Returns:
            dict: 出力結果のサマリー
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        batch_dir = self.output_dir / f"{prefix}_{timestamp}"
        batch_dir.mkdir(parents=True, exist_ok=True)

        exported_files = []

        # 各問題をXMLとして出力
        for i, (question, xml) in enumerate(zip(questions, xml_contents)):
            filename = f"{prefix}_{i+1:03d}.xml"
            file_path = batch_dir / filename
            file_path.write_text(xml, encoding="utf-8")
            exported_files.append(str(file_path))

        # メタデータを出力
        summary = {
            "timestamp": timestamp,
            "model": model or "unknown",
            "total_questions": len(questions),
            "output_directory": str(batch_dir),
            "files": exported_files,
            "questions": questions,
            "metadata": metadata or {},
        }

        summary_path = batch_dir / "summary.json"
        summary_path.write_text(
            json.dumps(summary, ensure_ascii=False, indent=2),
            encoding="utf-8"
        )

        print(f"[INFO] Exported batch: {batch_dir}")
        print(f"[INFO] Total files: {len(exported_files)}")

        return summary


# テスト用
if __name__ == "__main__":
    exporter = FileExporter()

    # テストデータ
    test_xml = '''<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item identifier="test">
  <qti-item-body><p>テスト問題</p></qti-item-body>
</qti-assessment-item>'''

    test_question = {
        "title": "テスト",
        "question": "テスト問題",
        "options": ["A", "B", "C", "D"],
        "correct_index": 0,
        "explanation": "テスト解説"
    }

    # 単一ファイル出力
    exporter.export_xml(test_xml, "test_item")
    exporter.export_json(test_question, "test_question")

    print("\n=== Export completed ===")
