"""問題データをQTI 3.0 XML形式に変換するモジュール"""

import html
import random
import re
from typing import Optional
import uuid


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

    # まずルビ部分を一時的にプレースホルダーに置換
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


class QTIConverter:
    """問題JSONをQTI 3.0 XMLに変換"""

    # 選択肢のID
    CHOICE_IDS = ["A", "B", "C", "D"]

    @classmethod
    def convert(
        cls,
        question: dict,
        identifier: Optional[str] = None,
        include_feedback: bool = True,
        enable_ruby: bool = True,
    ) -> str:
        """
        問題JSONをQTI 3.0 XMLに変換

        Args:
            question: 問題データ
                - title: 問題タイトル
                - question: 問題文
                - options: 選択肢リスト
                - correct_index: 正解の選択肢番号（0-based）
                - explanation: 解説
            identifier: 問題ID（省略時は自動生成）
            include_feedback: フィードバック要素を含めるか
            enable_ruby: ルビを有効にするかどうか

        Returns:
            str: QTI 3.0 XML文字列
        """
        # IDを生成
        if not identifier:
            identifier = f"generated-{uuid.uuid4().hex[:8]}"

        # 選択肢を取得
        options = question.get("options", [])
        original_correct_index = question.get("correct_index", 0)
        if original_correct_index < 0 or original_correct_index >= len(options):
            original_correct_index = 0

        # 選択肢をシャッフルして正解位置をランダム化
        if options and len(options) > 1:
            correct_option = options[original_correct_index]
            indices = list(range(len(options)))
            random.shuffle(indices)
            shuffled_options = [options[i] for i in indices]
            correct_index = shuffled_options.index(correct_option)
        else:
            shuffled_options = options
            correct_index = original_correct_index

        correct_id = cls.CHOICE_IDS[correct_index]

        # ルビ変換処理
        if enable_ruby:
            processed_options = [convert_inline_ruby_to_html(opt) for opt in shuffled_options]
            question_text_html = convert_inline_ruby_to_html(question.get("question", ""))
            explanation_html = convert_inline_ruby_to_html(question.get("explanation", ""))
            correct_text_html = processed_options[correct_index] if processed_options else ""
        else:
            processed_options = [html.escape(strip_inline_ruby(opt)) for opt in shuffled_options]
            question_text_html = html.escape(strip_inline_ruby(question.get("question", "")))
            explanation_html = html.escape(strip_inline_ruby(question.get("explanation", "")))
            correct_text_html = processed_options[correct_index] if processed_options else ""

        # 選択肢XMLを生成（ルビ処理済みの選択肢を使用）
        options_xml = cls._build_options_xml_processed(processed_options)

        # フィードバックを含める場合
        if include_feedback and question.get("explanation"):
            return cls._build_xml_with_feedback(
                identifier=identifier,
                title=question.get("title", "Generated Question"),
                question_text=question_text_html,
                options_xml=options_xml,
                correct_id=correct_id,
                correct_index=correct_index,
                correct_text=correct_text_html,
                explanation=explanation_html,
                skip_escape=True,
            )
        else:
            return cls._build_xml_simple(
                identifier=identifier,
                title=question.get("title", "Generated Question"),
                question_text=question_text_html,
                options_xml=options_xml,
                correct_id=correct_id,
                skip_escape=True,
            )

    @classmethod
    def _build_options_xml(cls, options: list) -> str:
        """選択肢のXMLを生成"""
        options_xml = ""
        for i, option in enumerate(options[:4]):  # 最大4つ
            choice_id = cls.CHOICE_IDS[i]
            option_text = html.escape(option)
            options_xml += f'      <qti-simple-choice identifier="{choice_id}">{option_text}</qti-simple-choice>\n'
        return options_xml.rstrip("\n")

    @classmethod
    def _build_options_xml_processed(cls, processed_options: list) -> str:
        """ルビ処理済み選択肢のXMLを生成"""
        options_xml = ""
        for i, option_text in enumerate(processed_options[:4]):  # 最大4つ
            choice_id = cls.CHOICE_IDS[i]
            # 既に処理済みなのでそのまま使用
            options_xml += f'      <qti-simple-choice identifier="{choice_id}">{option_text}</qti-simple-choice>\n'
        return options_xml.rstrip("\n")

    @classmethod
    def _build_xml_simple(
        cls,
        identifier: str,
        title: str,
        question_text: str,
        options_xml: str,
        correct_id: str,
        skip_escape: bool = False,
    ) -> str:
        """シンプルなQTI XML（フィードバックなし）を生成"""
        # skip_escape=Trueの場合、question_textは既にエスケープ/ルビ処理済み
        question_text_final = question_text if skip_escape else html.escape(question_text)
        return f'''<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
  xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
  identifier="{html.escape(identifier)}"
  title="{html.escape(title)}"
  adaptive="false"
  time-dependent="false">

  <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">
    <qti-correct-response>
      <qti-value>{correct_id}</qti-value>
    </qti-correct-response>
  </qti-response-declaration>

  <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
    <qti-default-value>
      <qti-value>0</qti-value>
    </qti-default-value>
  </qti-outcome-declaration>

  <qti-item-body>
    <p>{question_text_final}</p>
    <qti-choice-interaction response-identifier="RESPONSE" shuffle="false" max-choices="1">
{options_xml}
    </qti-choice-interaction>
  </qti-item-body>

  <qti-response-processing
    template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct"/>
</qti-assessment-item>
'''

    @classmethod
    def _build_xml_with_feedback(
        cls,
        identifier: str,
        title: str,
        question_text: str,
        options_xml: str,
        correct_id: str,
        correct_index: int,
        correct_text: str,
        explanation: str,
        skip_escape: bool = False,
    ) -> str:
        """フィードバック付きQTI XMLを生成"""
        # skip_escape=Trueの場合、テキストは既にエスケープ/ルビ処理済み
        question_text_final = question_text if skip_escape else html.escape(question_text)
        correct_text_final = correct_text if skip_escape else html.escape(correct_text)
        explanation_final = explanation if skip_escape else html.escape(explanation)
        return f'''<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
  xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0_v1p0.xsd"
  identifier="{html.escape(identifier)}"
  title="{html.escape(title)}"
  adaptive="false"
  time-dependent="false">

  <!-- 解答の宣言 -->
  <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">
    <qti-correct-response>
      <qti-value>{correct_id}</qti-value>
    </qti-correct-response>
  </qti-response-declaration>

  <!-- スコアの宣言 -->
  <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
    <qti-default-value>
      <qti-value>0</qti-value>
    </qti-default-value>
  </qti-outcome-declaration>

  <!-- フィードバック用の宣言 -->
  <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier"/>

  <!-- 問題本文 -->
  <qti-item-body>
    <div class="question-stem">
      <p>{question_text_final}</p>
    </div>

    <qti-choice-interaction response-identifier="RESPONSE" shuffle="false" max-choices="1">
{options_xml}
    </qti-choice-interaction>
  </qti-item-body>

  <!-- 解答処理 -->
  <qti-response-processing>
    <qti-response-condition>
      <qti-response-if>
        <qti-match>
          <qti-variable identifier="RESPONSE"/>
          <qti-correct identifier="RESPONSE"/>
        </qti-match>
        <qti-set-outcome-value identifier="SCORE">
          <qti-base-value base-type="float">1</qti-base-value>
        </qti-set-outcome-value>
        <qti-set-outcome-value identifier="FEEDBACK">
          <qti-base-value base-type="identifier">feedback_correct</qti-base-value>
        </qti-set-outcome-value>
      </qti-response-if>
      <qti-response-else>
        <qti-set-outcome-value identifier="SCORE">
          <qti-base-value base-type="float">0</qti-base-value>
        </qti-set-outcome-value>
        <qti-set-outcome-value identifier="FEEDBACK">
          <qti-base-value base-type="identifier">feedback_incorrect</qti-base-value>
        </qti-set-outcome-value>
      </qti-response-else>
    </qti-response-condition>
  </qti-response-processing>

  <!-- フィードバック（正解時） -->
  <qti-modal-feedback identifier="feedback_correct" outcome-identifier="FEEDBACK" show-hide="show">
    <qti-content-body>
      <p>正解です！</p>
      <p>{explanation_final}</p>
    </qti-content-body>
  </qti-modal-feedback>

  <!-- フィードバック（不正解時） -->
  <qti-modal-feedback identifier="feedback_incorrect" outcome-identifier="FEEDBACK" show-hide="show">
    <qti-content-body>
      <p>残念、不正解です。</p>
      <p>正解は「{correct_text_final}」です。</p>
      <p>{explanation_final}</p>
    </qti-content-body>
  </qti-modal-feedback>

</qti-assessment-item>
'''


# テスト用
if __name__ == "__main__":
    # サンプル問題データ
    sample_question = {
        "title": "選挙の意味",
        "question": "選挙について正しい説明はどれですか？",
        "options": [
            "国民の代表者を選ぶ大切な仕組みである",
            "毎日行われる国民の義務である",
            "18歳未満の人だけが参加できる",
            "外国人だけが投票できる"
        ],
        "correct_index": 0,
        "explanation": "選挙は、国民が自分たちの代表者を選ぶための大切な仕組みです。選挙で選ばれた国会議員は、国民の生活をより良くするために働きます。"
    }

    # QTI XMLに変換
    xml = QTIConverter.convert(sample_question, identifier="test-item-001")

    print("=== Generated QTI XML ===")
    print(xml)
