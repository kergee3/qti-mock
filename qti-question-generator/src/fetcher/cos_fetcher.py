"""学習指導要領LODからデータを取得するモジュール"""

import requests
from bs4 import BeautifulSoup
from rdflib import Graph, Namespace, URIRef
from typing import Optional
import sys
import os

# 親ディレクトリをパスに追加
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from config.settings import COS_BASE_URL, COS_HTML_BASE_URL, COS_COMMENTARY_URL


class COSFetcher:
    """学習指導要領LOD（jp-cos.github.io）からデータを取得"""

    def __init__(self):
        self.graph = Graph()
        self.jp_cos = Namespace("https://w3id.org/jp-cos/")
        self.schema = Namespace("http://schema.org/")
        self.dcterms = Namespace("http://purl.org/dc/terms/")

    def fetch(self, code: str) -> dict:
        """
        学習指導要領コードからデータを取得

        Args:
            code: 学習指導要領コード（例: "8220263100000000"）

        Returns:
            dict: 取得したデータ
        """
        # RDF Turtle取得
        ttl_url = f"{COS_BASE_URL}/{code}.ttl"
        print(f"[INFO] Fetching RDF: {ttl_url}")

        try:
            response = requests.get(ttl_url, timeout=30)
            response.raise_for_status()
        except requests.RequestException as e:
            print(f"[ERROR] Failed to fetch RDF: {e}")
            raise

        # RDFをパース
        self.graph = Graph()
        self.graph.parse(data=response.text, format="turtle")

        # データ抽出
        subject_uri = URIRef(f"{COS_BASE_URL}/{code}")

        result = {
            "code": code,
            "description": self._get_property(subject_uri, "description"),
            "grade": self._extract_grade(code),
            "subject": self._extract_subject(code),
            "has_part": self._get_list_property(subject_uri, "hasPart"),
        }

        # 被参照情報（commentary）リンクを取得
        result["commentary_ids"] = self._extract_commentary_ids(code)

        return result

    def _get_property(self, subject: URIRef, prop_name: str) -> Optional[str]:
        """RDFからプロパティ値を取得"""
        # schema:description を探す
        for pred, obj in self.graph.predicate_objects(subject):
            pred_str = str(pred)
            if prop_name in pred_str:
                return str(obj)
        return None

    def _get_list_property(self, subject: URIRef, prop_name: str) -> list:
        """RDFからリスト形式のプロパティ値を取得"""
        results = []
        for pred, obj in self.graph.predicate_objects(subject):
            pred_str = str(pred)
            if prop_name in pred_str:
                results.append(str(obj))
        return results

    def _extract_grade(self, code: str) -> int:
        """コードから学年を抽出"""
        # コードの4-5桁目が学年を示す（02=6年, 01=5年など）
        # 8220263... の "0263" 部分
        if len(code) >= 7:
            grade_part = code[4:6]
            if grade_part == "63":
                return 6
            elif grade_part == "62":
                return 5
        return 6  # デフォルト

    def _extract_subject(self, code: str) -> str:
        """コードから教科を抽出"""
        # 822=社会, 826=理科
        prefix = code[:3]
        subject_map = {
            "822": "社会",
            "826": "理科",
        }
        return subject_map.get(prefix, "不明")

    def _extract_commentary_ids(self, code: str) -> list:
        """HTMLページの被参照情報からcommentaryリンクを抽出"""
        # URLプレフィックスを決定
        prefix = code[:3]
        remaining = code[3:]

        html_url = f"{COS_HTML_BASE_URL}/{prefix}/{remaining}"
        print(f"[INFO] Fetching HTML for commentary links: {html_url}")

        try:
            response = requests.get(html_url, timeout=30)
            response.raise_for_status()
        except requests.RequestException as e:
            print(f"[WARN] Failed to fetch HTML: {e}")
            return []

        soup = BeautifulSoup(response.text, "html.parser")

        commentary_ids = []
        # 「被参照情報」セクションからリンクを抽出
        for link in soup.find_all("a", href=True):
            href = link["href"]
            if "/commentary/" in href:
                # commentary/1000572 → 1000572
                commentary_id = href.split("/commentary/")[-1].split("/")[0]
                if commentary_id and commentary_id not in commentary_ids:
                    commentary_ids.append(commentary_id)

        print(f"[INFO] Found {len(commentary_ids)} commentary links")
        return commentary_ids

    def fetch_commentary(self, commentary_id: str) -> dict:
        """被参照情報のcommentaryページから解説テキストを取得"""
        url = f"{COS_COMMENTARY_URL}/{commentary_id}"
        print(f"[INFO] Fetching commentary: {url}")

        try:
            response = requests.get(url, timeout=30)
            response.raise_for_status()
        except requests.RequestException as e:
            print(f"[WARN] Failed to fetch commentary: {e}")
            return {"id": commentary_id, "url": url, "text": ""}

        soup = BeautifulSoup(response.text, "html.parser")

        # メインコンテンツから解説テキストを抽出
        content = soup.find("main") or soup.find("article") or soup.body

        # テキストを抽出（不要な部分を除去）
        if content:
            # scriptやstyleタグを除去
            for tag in content.find_all(["script", "style", "nav", "header", "footer"]):
                tag.decompose()
            text = content.get_text(strip=True, separator="\n")
        else:
            text = ""

        return {"id": commentary_id, "url": url, "text": text}

    def fetch_all_commentary(self, code: str) -> list:
        """指定コードの全ての被参照情報を取得"""
        data = self.fetch(code)
        commentaries = []

        for commentary_id in data.get("commentary_ids", []):
            commentary = self.fetch_commentary(commentary_id)
            if commentary["text"]:
                commentaries.append(commentary)

        return commentaries

    def get_full_context(self, code: str) -> dict:
        """
        学習指導要領コードから問題生成に必要な全ての情報を取得

        Args:
            code: 学習指導要領コード

        Returns:
            dict: 学習目標、解説テキストを含む完全なコンテキスト
        """
        # 基本情報を取得
        data = self.fetch(code)

        # 解説テキストを取得
        commentaries = []
        for commentary_id in data.get("commentary_ids", []):
            commentary = self.fetch_commentary(commentary_id)
            if commentary["text"]:
                commentaries.append(commentary)

        # 解説テキストを結合
        commentary_texts = [c["text"] for c in commentaries]
        combined_commentary = "\n\n---\n\n".join(commentary_texts)

        return {
            "code": data["code"],
            "grade": data["grade"],
            "subject": data["subject"],
            "description": data["description"] or "",
            "commentary": combined_commentary,
            "commentary_count": len(commentaries),
        }

    def get_full_context_with_children(self, code: str) -> dict:
        """
        学習指導要領コード + 下位コード（hasPart）から問題生成に必要な情報を取得

        Args:
            code: 学習指導要領コード

        Returns:
            dict: 学習目標、解説テキスト（下位コード含む）を含む完全なコンテキスト
        """
        # 基本情報を取得
        data = self.fetch(code)

        # 親コードの解説テキストを取得
        commentaries = []
        for commentary_id in data.get("commentary_ids", []):
            commentary = self.fetch_commentary(commentary_id)
            if commentary["text"]:
                commentaries.append(commentary)

        print(f"[INFO] 親コードから {len(commentaries)} 件の解説を取得")

        # 下位コード（hasPart）の解説テキストも取得
        child_codes = data.get("has_part", [])
        print(f"[INFO] 下位コード数: {len(child_codes)}")

        for child_url in child_codes:
            # URLから下位コードを抽出（例: "https://w3id.org/jp-cos/82202631ア0000000" → "82202631ア0000000"）
            child_code = child_url.split("/")[-1]
            print(f"[INFO] 下位コード {child_code} の解説を取得中...")

            try:
                child_data = self.fetch(child_code)
                for commentary_id in child_data.get("commentary_ids", []):
                    commentary = self.fetch_commentary(commentary_id)
                    if commentary["text"]:
                        commentaries.append(commentary)
            except Exception as e:
                print(f"[WARN] 下位コード {child_code} の取得に失敗: {e}")
                continue

        print(f"[INFO] 合計 {len(commentaries)} 件の解説を取得")

        # 解説テキストを結合
        commentary_texts = [c["text"] for c in commentaries]
        combined_commentary = "\n\n---\n\n".join(commentary_texts)

        return {
            "code": data["code"],
            "grade": data["grade"],
            "subject": data["subject"],
            "description": data["description"] or "",
            "commentary": combined_commentary,
            "commentary_count": len(commentaries),
            "child_codes_count": len(child_codes),
        }


# テスト用
if __name__ == "__main__":
    fetcher = COSFetcher()

    # 社会科・政治分野のデータを取得
    test_code = "8220263100000000"
    print(f"\n=== Testing with code: {test_code} ===\n")

    context = fetcher.get_full_context(test_code)

    print(f"教科: {context['subject']}")
    print(f"学年: {context['grade']}年")
    print(f"学習目標: {context['description'][:200] if context['description'] else 'N/A'}...")
    print(f"解説テキスト数: {context['commentary_count']}")
    print(f"解説テキスト (先頭500文字):\n{context['commentary'][:500]}...")
