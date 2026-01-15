"""問題データをQTI 3.0 XML形式に変換するモジュール"""

import html
from typing import Optional
import uuid


class QTIConverter:
    """問題JSONをQTI 3.0 XMLに変換"""

    # 選択肢のラベル（日本語）
    CHOICE_LABELS = ["ア", "イ", "ウ", "エ"]

    # 選択肢のID
    CHOICE_IDS = ["A", "B", "C", "D"]

    @classmethod
    def convert(
        cls,
        question: dict,
        identifier: Optional[str] = None,
        include_feedback: bool = True,
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

        Returns:
            str: QTI 3.0 XML文字列
        """
        # IDを生成
        if not identifier:
            identifier = f"generated-{uuid.uuid4().hex[:8]}"

        # 正解のインデックスを取得
        correct_index = question.get("correct_index", 0)
        if correct_index < 0 or correct_index >= len(question.get("options", [])):
            correct_index = 0

        correct_id = cls.CHOICE_IDS[correct_index]

        # 選択肢XMLを生成
        options_xml = cls._build_options_xml(question.get("options", []))

        # フィードバックを含める場合
        if include_feedback and question.get("explanation"):
            return cls._build_xml_with_feedback(
                identifier=identifier,
                title=question.get("title", "Generated Question"),
                question_text=question.get("question", ""),
                options_xml=options_xml,
                correct_id=correct_id,
                correct_index=correct_index,
                correct_label=cls.CHOICE_LABELS[correct_index],
                correct_text=question.get("options", [])[correct_index] if question.get("options") else "",
                explanation=question.get("explanation", ""),
            )
        else:
            return cls._build_xml_simple(
                identifier=identifier,
                title=question.get("title", "Generated Question"),
                question_text=question.get("question", ""),
                options_xml=options_xml,
                correct_id=correct_id,
            )

    @classmethod
    def _build_options_xml(cls, options: list) -> str:
        """選択肢のXMLを生成"""
        options_xml = ""
        for i, option in enumerate(options[:4]):  # 最大4つ
            choice_id = cls.CHOICE_IDS[i]
            label = cls.CHOICE_LABELS[i]
            option_text = html.escape(option)
            options_xml += f'      <qti-simple-choice identifier="{choice_id}">{label}　{option_text}</qti-simple-choice>\n'
        return options_xml.rstrip("\n")

    @classmethod
    def _build_xml_simple(
        cls,
        identifier: str,
        title: str,
        question_text: str,
        options_xml: str,
        correct_id: str,
    ) -> str:
        """シンプルなQTI XML（フィードバックなし）を生成"""
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
    <p>{html.escape(question_text)}</p>
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
        correct_label: str,
        correct_text: str,
        explanation: str,
    ) -> str:
        """フィードバック付きQTI XMLを生成"""
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
      <p>{html.escape(question_text)}</p>
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
      <p>{html.escape(explanation)}</p>
    </qti-content-body>
  </qti-modal-feedback>

  <!-- フィードバック（不正解時） -->
  <qti-modal-feedback identifier="feedback_incorrect" outcome-identifier="FEEDBACK" show-hide="show">
    <qti-content-body>
      <p>残念、不正解です。</p>
      <p>正解は「{correct_label}　{html.escape(correct_text)}」です。</p>
      <p>{html.escape(explanation)}</p>
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
