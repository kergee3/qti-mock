"""記述式問題をQTI 3.0 XML形式に変換するモジュール"""

import html
import json
import re
from xml.etree import ElementTree as ET
from xml.dom import minidom
import sys
import os


def convert_inline_ruby_to_html(text: str) -> str:
    """
    インライン形式のルビ {漢字|よみ} を HTML5 ruby タグに変換

    Args:
        text: インライン形式のルビを含むテキスト

    Returns:
        HTML5 ruby タグを含むテキスト
    """
    # Pattern: {kanji|reading}
    pattern = r'\{([^|{}]+)\|([^|{}]+)\}'

    def replace_ruby(match):
        kanji = html.escape(match.group(1))
        reading = html.escape(match.group(2))
        if not reading.strip():
            return kanji  # 空の読みはスキップ
        return f'<ruby>{kanji}<rt>{reading}</rt></ruby>'

    # まずルビ以外の部分をエスケープしてからルビを変換
    # ルビ部分を一時的にプレースホルダーに置換
    placeholders = []

    def save_ruby(match):
        placeholders.append(match.group(0))
        return f"__RUBY_PLACEHOLDER_{len(placeholders) - 1}__"

    text_with_placeholders = re.sub(pattern, save_ruby, text)

    # ルビ以外の部分をHTMLエスケープ
    text_escaped = html.escape(text_with_placeholders)

    # プレースホルダーをルビタグに戻す
    for i, ruby_match in enumerate(placeholders):
        match = re.match(pattern, ruby_match)
        if match:
            kanji = html.escape(match.group(1))
            reading = html.escape(match.group(2))
            if reading.strip():
                ruby_html = f'<ruby>{kanji}<rt>{reading}</rt></ruby>'
            else:
                ruby_html = kanji
            text_escaped = text_escaped.replace(f"__RUBY_PLACEHOLDER_{i}__", ruby_html)

    return text_escaped


def strip_inline_ruby(text: str) -> str:
    """
    インライン形式のルビを除去して漢字のみ残す

    Args:
        text: インライン形式のルビを含むテキスト

    Returns:
        ルビを除去したテキスト
    """
    pattern = r'\{([^|{}]+)\|[^|{}]+\}'
    return re.sub(pattern, r'\1', text)

# 親ディレクトリをパスに追加
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from config.settings import get_char_limits, CHAR_LIMIT_CONFIG


class QTITextConverter:
    """記述式問題をQTI 3.0 XML形式に変換"""

    QTI_NAMESPACE = "http://www.imsglobal.org/xsd/imsqti_v3p0"
    XSI_NAMESPACE = "http://www.w3.org/2001/XMLSchema-instance"

    @classmethod
    def convert(cls, question: dict, identifier: str = None, question_number: int = None, enable_ruby: bool = True) -> str:
        """
        問題データをQTI 3.0 XML形式に変換

        Args:
            question: 問題データ
            identifier: アイテム識別子（省略時は question_id を使用）
            question_number: 問題番号（1から始まる、字数制限の決定に使用）
            enable_ruby: ルビを有効にするかどうか

        Returns:
            str: QTI 3.0 XML文字列
        """
        identifier = identifier or question.get("question_id", "text-001")
        title = question.get("title", "記述式問題")
        question_text_raw = question.get("question_text", "")
        model_answer_raw = question.get("model_answer", "")
        required_concepts = question.get("required_concepts", [])
        scoring_matrix = question.get("scoring_matrix", {})
        common_errors = question.get("common_errors", [])

        # ルビ変換処理
        if enable_ruby:
            question_text_html = convert_inline_ruby_to_html(question_text_raw)
            model_answer_html = convert_inline_ruby_to_html(model_answer_raw)
        else:
            # ルビ無効時はインライン形式を除去してHTMLエスケープ
            question_text_html = html.escape(strip_inline_ruby(question_text_raw))
            model_answer_html = html.escape(strip_inline_ruby(model_answer_raw))

        # 問題番号に応じた字数制限を取得
        if question_number is not None:
            char_limits = get_char_limits(question_number)
        else:
            # デフォルトは長い方（従来互換）
            char_limits = CHAR_LIMIT_CONFIG["long"]
        max_chars = char_limits["max_chars"]
        min_chars = char_limits["min_chars"]

        # ルート要素
        root = ET.Element("qti-assessment-item")
        root.set("xmlns", cls.QTI_NAMESPACE)
        root.set("xmlns:xsi", cls.XSI_NAMESPACE)
        root.set("identifier", identifier)
        root.set("title", title)
        root.set("adaptive", "false")
        root.set("time-dependent", "false")

        # レスポンス宣言
        response_decl = ET.SubElement(root, "qti-response-declaration")
        response_decl.set("identifier", "RESPONSE")
        response_decl.set("base-type", "string")
        response_decl.set("cardinality", "single")

        # アウトカム宣言（外部採点）
        outcome_decl = ET.SubElement(root, "qti-outcome-declaration")
        outcome_decl.set("identifier", "SCORE")
        outcome_decl.set("cardinality", "single")
        outcome_decl.set("base-type", "float")
        outcome_decl.set("external-scored", "human")

        default_value = ET.SubElement(outcome_decl, "qti-default-value")
        value = ET.SubElement(default_value, "qti-value")
        value.text = "0"

        # AI採点用メタデータ（qti-rubric-block）
        rubric_block = ET.SubElement(root, "qti-rubric-block")
        rubric_block.set("view", "scorer")
        rubric_block.set("use", "ai-scoring")

        # 採点基準（カスタム要素）
        scoring_criteria = ET.SubElement(rubric_block, "scoring-criteria")

        # 模範解答（プレースホルダーを使用、後でHTMLに置換）
        model_answer_elem = ET.SubElement(scoring_criteria, "model-answer")
        model_answer_elem.text = "__MODEL_ANSWER_PLACEHOLDER__"

        # 必須概念
        required_concepts_elem = ET.SubElement(scoring_criteria, "required-concepts")
        for concept in required_concepts:
            concept_elem = ET.SubElement(required_concepts_elem, "concept")
            concept_elem.text = concept

        # 採点マトリクス
        scoring_matrix_elem = ET.SubElement(scoring_criteria, "scoring-matrix")
        for aspect_key, aspect_data in scoring_matrix.items():
            criterion = ET.SubElement(scoring_matrix_elem, "criterion")
            criterion.set("aspect", aspect_key)
            criterion.set("aspect-name", aspect_data.get("aspect_name", aspect_key))
            criterion.set("max-score", str(aspect_data.get("max_score", 0)))

            for level in aspect_data.get("levels", []):
                level_elem = ET.SubElement(criterion, "level")
                level_elem.set("score", str(level.get("score", 0)))
                level_elem.text = level.get("description", "")

        # 典型的誤答パターン
        common_errors_elem = ET.SubElement(scoring_criteria, "common-errors")
        for error in common_errors:
            error_elem = ET.SubElement(common_errors_elem, "error")
            error_elem.set("pattern", error.get("pattern", ""))
            error_elem.set("feedback", error.get("feedback", ""))

        # 文字数制限
        char_limits = ET.SubElement(scoring_criteria, "char-limits")
        char_limits.set("min", str(min_chars))
        char_limits.set("max", str(max_chars))

        # アイテムボディ
        item_body = ET.SubElement(root, "qti-item-body")

        # 問題文（プレースホルダーを使用、後でHTMLに置換）
        question_div = ET.SubElement(item_body, "div")
        question_div.set("class", "question-text")
        question_p = ET.SubElement(question_div, "p")
        question_p.text = "__QUESTION_TEXT_PLACEHOLDER__"

        # 回答入力欄（extendedTextInteraction）
        interaction = ET.SubElement(item_body, "qti-extended-text-interaction")
        interaction.set("response-identifier", "RESPONSE")
        interaction.set("expected-length", str(max_chars))
        interaction.set("min-strings", "1")
        interaction.set("max-strings", "1")
        interaction.set("expected-lines", "5")
        interaction.set("format", "plain")
        interaction.set("class", "qti-counter-up")

        # XML文字列に変換（整形）
        xml_str = ET.tostring(root, encoding="unicode")
        dom = minidom.parseString(xml_str)
        pretty_xml = dom.toprettyxml(indent="  ", encoding=None)

        # XML宣言を修正
        lines = pretty_xml.split("\n")
        lines[0] = '<?xml version="1.0" encoding="UTF-8"?>'

        result = "\n".join(lines)

        # プレースホルダーをHTMLコンテンツに置換
        result = result.replace("__QUESTION_TEXT_PLACEHOLDER__", question_text_html)
        result = result.replace("__MODEL_ANSWER_PLACEHOLDER__", model_answer_html)

        return result

    @classmethod
    def extract_scoring_criteria(cls, xml_content: str) -> dict:
        """
        QTI XMLから採点基準を抽出

        Args:
            xml_content: QTI XML文字列

        Returns:
            dict: 採点基準データ
        """
        root = ET.fromstring(xml_content)

        # 名前空間を考慮してqti-rubric-blockを検索
        ns = {"qti": cls.QTI_NAMESPACE}

        # 名前空間なしでも検索
        rubric_block = root.find(".//qti-rubric-block")
        if rubric_block is None:
            rubric_block = root.find(".//{%s}qti-rubric-block" % cls.QTI_NAMESPACE)

        if rubric_block is None:
            return {}

        scoring_criteria = rubric_block.find(".//scoring-criteria")
        if scoring_criteria is None:
            return {}

        result = {}

        # 模範解答
        model_answer = scoring_criteria.find(".//model-answer")
        if model_answer is not None:
            result["model_answer"] = model_answer.text or ""

        # 必須概念
        required_concepts = []
        for concept in scoring_criteria.findall(".//required-concepts/concept"):
            if concept.text:
                required_concepts.append(concept.text)
        result["required_concepts"] = required_concepts

        # 採点マトリクス
        scoring_matrix = {}
        for criterion in scoring_criteria.findall(".//scoring-matrix/criterion"):
            aspect = criterion.get("aspect", "")
            aspect_name = criterion.get("aspect-name", aspect)
            max_score = int(criterion.get("max-score", "0"))

            levels = []
            for level in criterion.findall("level"):
                levels.append({
                    "score": int(level.get("score", "0")),
                    "description": level.text or "",
                })

            scoring_matrix[aspect] = {
                "aspect_name": aspect_name,
                "max_score": max_score,
                "levels": levels,
            }
        result["scoring_matrix"] = scoring_matrix

        # 典型的誤答パターン
        common_errors = []
        for error in scoring_criteria.findall(".//common-errors/error"):
            common_errors.append({
                "pattern": error.get("pattern", ""),
                "feedback": error.get("feedback", ""),
            })
        result["common_errors"] = common_errors

        # 文字数制限
        char_limits = scoring_criteria.find(".//char-limits")
        if char_limits is not None:
            result["min_chars"] = int(char_limits.get("min", "0"))
            result["max_chars"] = int(char_limits.get("max", "100"))

        return result


# テスト用
if __name__ == "__main__":
    # テストデータ
    test_question = {
        "question_id": "text-001",
        "difficulty": 1,
        "title": "三権分立の意義",
        "question_text": "日本の政治には「三権分立」という仕組みがあります。この三権分立が必要な理由を、「権力」「国民」という言葉を使って説明しなさい。",
        "model_answer": "三権分立は、立法権、行政権、司法権の三つの権力を別々の機関が担当することで、一つの機関に権力が集中することを防ぐ仕組みです。権力が一か所に集まると、その権力が乱用される恐れがあり、国民の自由や権利が守られなくなる可能性があります。そのため、三つの権力を分けて互いにチェックし合うことで、国民の権利を守っています。",
        "required_concepts": ["立法権", "行政権", "司法権", "権力の分散", "国民の権利"],
        "scoring_matrix": {
            "understanding": {
                "aspect_name": "理解力",
                "max_score": 4,
                "levels": [
                    {"score": 4, "description": "三権分立の仕組みと目的を完全に理解している"},
                    {"score": 3, "description": "概ね理解しているが、一部不正確な点がある"},
                    {"score": 2, "description": "部分的な理解にとどまっている"},
                    {"score": 1, "description": "理解が不十分"},
                    {"score": 0, "description": "理解していない"},
                ],
            },
            "expression": {
                "aspect_name": "表現力",
                "max_score": 3,
                "levels": [
                    {"score": 3, "description": "論理的で明確な表現ができている"},
                    {"score": 2, "description": "概ね論理的な表現ができている"},
                    {"score": 1, "description": "やや不明確な表現がある"},
                    {"score": 0, "description": "表現が不適切"},
                ],
            },
            "accuracy": {
                "aspect_name": "正確性",
                "max_score": 3,
                "levels": [
                    {"score": 3, "description": "用語や概念が正確に使われている"},
                    {"score": 2, "description": "概ね正確だが一部誤りがある"},
                    {"score": 1, "description": "不正確な点が目立つ"},
                    {"score": 0, "description": "不正確"},
                ],
            },
        },
        "common_errors": [
            {"pattern": "三権の名前を間違える", "feedback": "立法権は国会、行政権は内閣、司法権は裁判所が担当します"},
            {"pattern": "権力分散の目的を説明できていない", "feedback": "三権分立は権力の乱用を防ぎ、国民の権利を守るためのものです"},
            {"pattern": "「権力」「国民」を使っていない", "feedback": "問題文の指示に従って、指定された言葉を使って説明しましょう"},
        ],
    }

    print("=== Testing QTITextConverter ===\n")

    # XML変換
    xml = QTITextConverter.convert(test_question)
    print(xml)

    # 採点基準抽出のテスト
    print("\n=== Extracting Scoring Criteria ===\n")
    criteria = QTITextConverter.extract_scoring_criteria(xml)
    print(json.dumps(criteria, ensure_ascii=False, indent=2))
