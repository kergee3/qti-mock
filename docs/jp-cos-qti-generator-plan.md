# 学習指導要領LODから4択問題を自動生成するバッチプログラム

## 概要

学習指導要領LOD（jp-cos.github.io）のURLをパラメータとして、Claude APIを使用して4択問題を自動生成し、DBに蓄積するPythonバッチプログラムの設計。

## 対象範囲（当面の限定）

学習指導要領LODは試行的なプロジェクトであり、**2025-09-27 バージョン3.0** で「小学校理科と社会科5・6年生分の学習指導要領解説の内容をLOD化」されています。

本計画では、この試行データを活用し、当面は以下の **5分野** に限定します：

| 科目 | 分野 | 学習指導要領コード | URL |
|------|------|-------------------|-----|
| **社会** | 政治 | 8220263100000000 | [822/0263100000000](https://jp-cos.github.io/822/0263100000000) |
| **社会** | 歴史 | 8220263200000000 | [822/0263200000000](https://jp-cos.github.io/822/0263200000000) |
| **社会** | 国際 | 8220263300000000 | [822/0263300000000](https://jp-cos.github.io/822/0263300000000) |
| **理科** | 物質・エネルギー | 8260263100000000 | [826/0263100000000](https://jp-cos.github.io/826/0263100000000) |
| **理科** | 生命・地球 | 8260263200000000 | [826/0263200000000](https://jp-cos.github.io/826/0263200000000) |

### 事前調査結果

#### 社会科「政治」分野（8220263100000000）✅ 適用可能

- 被参照情報（commentary）リンクあり: 1000572, 1000589
- 解説テキスト: 選挙、三権分立、裁判員制度、租税、天皇制、地域政治など

#### 理科「物質・エネルギー」分野（8260263100000000）✅ 適用可能

- 被参照情報（commentary）リンクあり: 1000157, 1000217, 1000218
- 4つの子要素（単元）:
  1. **(1) 燃焼の仕組み** - 酸素の消費、二酸化炭素の生成、石灰水・気体検知管の使用
  2. **(2) 水溶液の性質** - 炭酸水、塩酸、水酸化ナトリウム、金属との反応
  3. **(3) てこの規則性** - てこの原理、てんびんばかりの製作
  4. **(4) 電気の利用** - 自然エネルギー、蓄電、LED制御、センサー

- 解説テキスト: 具体的な実験例、安全指導（保護眼鏡、薬品取扱い）、ものづくり活動

**結論**: 理科分野も社会科と同様に、被参照情報から十分な解説テキストが取得可能であり、4択問題生成に適用可能です。

## 結論: **実現可能**

技術的に実現可能であり、以下の条件で推奨される実装方法です。

---

## 1. システム構成

```
┌─────────────────────────────────────────────────────────────┐
│                    バッチ処理パイプライン                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [1] 学習指導要領LOD    [2] Claude API      [3] DB保存      │
│      (jp-cos.github.io)     (Batch API)         (Neon等)    │
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │ RDF/Turtle   │───▶│ プロンプト   │───▶│ QTI XML     │  │
│  │ データ取得   │    │ + 問題生成   │    │ + メタデータ │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                   │                   │          │
│         ▼                   ▼                   ▼          │
│  ・学習目標            ・4択問題JSON      ・PostgreSQL     │
│  ・解説テキスト        ・品質検証         ・QTI XMLファイル │
│  ・関連リンク          ・説明文生成                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. データ取得方法（学習指導要領LOD）

### 利用可能なアクセス方法

| 方法 | URL形式 | 用途 |
|------|---------|------|
| RDF Turtle | `https://w3id.org/jp-cos/{code}.ttl` | プログラム解析（推奨） |
| SPARQL | `https://dydra.com/masao/jp-cos/@query` | 複雑なクエリ |
| HTML | `https://jp-cos.github.io/822/{code}` | 人間向け表示 |

### 取得できるデータ

```python
# RDF Turtleから取得可能な情報
{
    "identifier": "8220263100000000",
    "grade": 6,
    "subject": "社会科",
    "description": "我が国の政治の働きについて...",
    "hasPart": ["8220263110000000", "8220263120000000"],  # 子要素
    "commentary": ["1000572", "1000589"],  # 解説リンク（被参照情報）
}
```

### 解説テキスト取得（被参照情報を活用）

学習指導要領LODの各ページには「被参照情報」セクションがあり、以下のリンクが含まれています：

```
被参照情報の例（小学校社会科6年・政治）:

1. '対象となる学習指導要領細目'としての参照元:
   → https://jp-cos.github.io/commentary/1000572
   → 学習内容の詳細説明（概念、目標、具体的な学習事項）

2. '参照した学習指導要領細目'としての参照元:
   → https://jp-cos.github.io/commentary/1000589
   → 内容の取扱い（指導上の留意点）
     - 選挙、三権分立、裁判員制度、租税、天皇制、地域政治
```

**重要**: 文部科学省のPDF解説（mext.go.jp）へのリンクも存在しますが、PDFの処理は重いため**参考程度**とし、実際の問題生成には上記の **commentary リンク** から取得した解説テキストを使用します。

### 解説情報の取得フロー

```
1. 学習指導要領コードのページにアクセス
   例: https://jp-cos.github.io/822/0263100000000

2. 「被参照情報」セクションから commentary リンクを抽出
   - commentary/1000572（学習内容詳細）
   - commentary/1000589（内容の取扱い）

3. 各 commentary ページから解説テキストを取得
   例: https://jp-cos.github.io/commentary/1000572

4. 取得した解説テキストをプロンプトに含めて問題生成
```

---

## 3. Claude API バッチ処理

### 推奨モデルとコスト

| モデル | バッチ価格（入力/出力） | 1問あたりコスト | 用途 |
|--------|------------------------|----------------|------|
| Haiku | $0.125/$0.625 per M tokens | ~$0.00003 | 簡単な問題 |
| Sonnet | $1.50/$7.50 per M tokens | ~$0.0016 | **推奨**（バランス） |
| Opus | $2.50/$12.50 per M tokens | ~$0.003 | 高品質要求時 |

### コスト見積もり（Sonnet バッチ処理）

```
1,000問生成: 約 $16
10,000問生成: 約 $160
```

### バッチAPIの特徴

- **50%コスト削減**（通常APIの半額）
- 1バッチ最大10,000リクエスト
- 処理時間: 通常1時間以内（最大24時間）
- 結果保持: 29日間

---

## 4. 制限事項と対策

### 4.1 ハルシネーション（誤情報生成）

**リスク**: 存在しない事実、誤った正解を生成

**対策**:
1. プロンプトで「提供された情報のみ使用」を明示
2. 自動検証プロンプトで品質チェック
3. **人間レビュー必須**（特に初期段階）

### 4.2 学習指導要領の抽象性

**問題**: 学習指導要領は「何を学ぶか」の目標のみ、具体的事実なし

**対策**:
1. 解説テキスト（commentary）を必ず取得
2. 文部科学省PDF解説を参照情報として活用
3. 「概念理解」を問う問題を中心に生成
4. 具体的数値（議員定数等）が必要な場合は教科書データを別途用意

### 4.3 著作権・利用規約

| 項目 | 状況 |
|------|------|
| 学習指導要領LOD | CC BY 4.0（自由利用可） |
| Claude API | 教育コンテンツ生成は許可 |
| 生成コンテンツ | AI生成であることの表示推奨 |

### 4.4 品質管理

```
品質保証フロー:
1. プロンプト設計（明確な要件定義）
2. 自動検証（Claude による自己チェック）
3. スコアリング（80点以上のみ採用）
4. 人間レビュー（特に初期は全件確認）
```

---

## 5. 実装アーキテクチャ

### ディレクトリ構成案

```
qti-generator/ai-choice/
├── src/
│   ├── fetcher/
│   │   ├── cos_fetcher.py      # 学習指導要領LOD取得
│   │   └── rdf_parser.py       # RDF Turtle解析
│   ├── generator/
│   │   ├── prompt_builder.py   # プロンプト構築
│   │   ├── batch_processor.py  # Claude Batch API
│   │   └── validator.py        # 品質検証
│   ├── converter/
│   │   └── qti_converter.py    # JSON→QTI XML変換
│   ├── storage/
│   │   ├── db_client.py        # PostgreSQL/Neon
│   │   └── file_exporter.py    # XMLファイル出力
│   └── main.py                 # エントリーポイント
├── prompts/
│   ├── system_prompt.txt       # システムプロンプト
│   └── templates/              # 科目別テンプレート
├── config/
│   └── settings.py             # 設定
├── requirements.txt
└── README.md
```

### 主要コンポーネント

```python
# 1. 学習指導要領データ取得
cos_data = COSFetcher.fetch("8220263100000000")
# → 学習目標、解説テキスト、関連情報を取得

# 2. プロンプト構築
prompt = PromptBuilder.build(
    subject="社会",
    grade=6,
    topic=cos_data.description,
    context=cos_data.commentary,
    count=5
)

# 3. Claude Batch API で問題生成
batch_id = BatchProcessor.submit(prompts)
results = BatchProcessor.get_results(batch_id)

# 4. 品質検証
validated = Validator.validate(results)
approved = [q for q in validated if q.score >= 80]

# 5. QTI XML変換・保存
for question in approved:
    qti_xml = QTIConverter.convert(question)
    DBClient.save(qti_xml, metadata)
```

---

## 6. DB設計案

### テーブル構成

```sql
-- 生成問題テーブル
CREATE TABLE generated_questions (
    id UUID PRIMARY KEY,
    cos_code VARCHAR(20) NOT NULL,        -- 学習指導要領コード
    subject VARCHAR(50),                   -- 教科
    grade INTEGER,                         -- 学年
    title VARCHAR(200),                    -- 問題タイトル
    question_text TEXT NOT NULL,           -- 問題文
    options JSONB NOT NULL,                -- 選択肢
    correct_answer VARCHAR(1) NOT NULL,    -- 正解
    explanation TEXT,                      -- 解説（フィードバック用）
    qti_xml TEXT,                          -- QTI XML（フィードバック含む）
    quality_score INTEGER,                 -- 品質スコア
    review_status VARCHAR(20),             -- pending/approved/rejected
    created_at TIMESTAMP DEFAULT NOW(),
    reviewed_at TIMESTAMP,
    reviewer_id VARCHAR(100)
);

-- 学習指導要領キャッシュ
CREATE TABLE cos_cache (
    code VARCHAR(20) PRIMARY KEY,
    data JSONB NOT NULL,
    fetched_at TIMESTAMP DEFAULT NOW()
);
```

---

## 7. 実行フロー

```
[入力]
  学習指導要領URL: https://jp-cos.github.io/822/0263100000000
  生成問題数: 10

[処理]
  1. URLからコード抽出: 8220263100000000
  2. RDF Turtle取得: w3id.org/jp-cos/8220263100000000.ttl
  3. 解説テキスト取得: commentary/1000572, 1000589
  4. プロンプト構築（学習目標 + 解説 + 生成指示）
  5. Claude Batch API 投入
  6. 結果取得（1時間後）
  7. 品質検証・フィルタリング
  8. QTI XML変換
  9. DB保存

[出力]
  - PostgreSQL: 問題データ + メタデータ
  - XMLファイル: public/items-h/generated/*.xml（オプション）
```

---

## 8. 想定される課題と解決策

| 課題 | 解決策 |
|------|--------|
| 学習指導要領が抽象的で具体的問題が作りにくい | 被参照情報（commentary）の解説テキストを必ず含める + 「概念理解」型の問題を中心に |
| 事実問題（数値等）でハルシネーション | 教科書データを別途用意、または事実問題は避ける |
| 対象範囲が限定的（5分野のみ） | LODの試行範囲に合わせた限定運用。将来の拡張に備えた設計 |
| 品質のばらつき | 自動検証 + スコアフィルタ + 人間レビュー |
| SPARQLエンドポイントの安定性 | RDF Turtle直接取得をメインに、SPARQLはオプション |
| 理科の実験問題での安全配慮 | 安全指導（保護眼鏡、薬品取扱い）を問題文に含めない。概念理解に集中 |

---

## 9. 次のステップ（実装フェーズ）

### Phase 1: MVP - 社会科（1-2週間）
- [ ] 学習指導要領LODからデータ取得スクリプト
  - [ ] RDF Turtle取得・解析
  - [ ] 被参照情報（commentary）リンク抽出
  - [ ] commentary ページから解説テキスト取得
- [ ] 基本プロンプト設計（社会科向け）
- [ ] Claude API連携（リアルタイム版で動作確認）
- [ ] JSON→QTI XML変換（フィードバック付き）
- [ ] 対象分野:
  - [ ] **社会・政治**（8220263100000000）
  - [ ] **社会・歴史**（8220263200000000）
  - [ ] **社会・国際**（8220263300000000）

### Phase 2: 理科対応 + バッチ処理（1-2週間）
- [ ] 理科向けプロンプト調整（実験・観察の問題形式）
- [ ] 対象分野:
  - [ ] **理科・物質エネルギー**（8260263100000000）
    - 燃焼の仕組み、水溶液の性質、てこの規則性、電気の利用
  - [ ] **理科・生命地球**（8260263200000000）
- [ ] Batch API実装
- [ ] 品質検証ロジック
- [ ] PostgreSQL/Neon保存

### Phase 3: 運用準備（1週間）
- [ ] エラーハンドリング
- [ ] ログ・モニタリング
- [ ] ドキュメント
- [ ] 5分野の問題生成テスト

---

## 10. 必要なリソース

- **Anthropic API キー**: Claude API利用
- **PostgreSQL/Neon**: 問題データ保存
- **Python 3.10+**: 実行環境
- **依存ライブラリ**: anthropic, rdflib, psycopg2, lxml

---

## 11. Python実装例

### 11.1 学習指導要領LODデータ取得

```python
import requests
from rdflib import Graph, Namespace

class COSFetcher:
    """学習指導要領LODからデータを取得（小学校社会科・理科6年対応）"""

    BASE_URL = "https://w3id.org/jp-cos"
    COMMENTARY_URL = "https://jp-cos.github.io/commentary"
    HTML_URL = "https://jp-cos.github.io/822"

    def __init__(self):
        self.graph = Graph()
        self.jp_cos = Namespace("https://w3id.org/jp-cos/")

    def fetch(self, code: str) -> dict:
        """学習指導要領コードからデータを取得"""

        # RDF Turtle取得
        url = f"{self.BASE_URL}/{code}.ttl"
        response = requests.get(url)
        response.raise_for_status()

        self.graph.parse(data=response.text, format="turtle")

        # データ抽出
        subject_uri = f"{self.BASE_URL}/{code}"

        result = {
            "code": code,
            "description": self._get_property(subject_uri, "schema:description"),
            "grade": self._get_property(subject_uri, "jp-cos:grade"),
            "subject": self._get_property(subject_uri, "jp-cos:subjectArea"),
            "has_part": self._get_list_property(subject_uri, "dcterms:hasPart"),
        }

        # 被参照情報（commentary）リンクを取得
        result["commentary_ids"] = self._extract_commentary_ids(code)

        return result

    def _extract_commentary_ids(self, code: str) -> list:
        """HTMLページの被参照情報からcommentaryリンクを抽出"""
        from bs4 import BeautifulSoup

        url = f"{self.HTML_URL}/{code}"
        response = requests.get(url)
        soup = BeautifulSoup(response.text, 'html.parser')

        commentary_ids = []
        # 「被参照情報」セクションからリンクを抽出
        for link in soup.find_all('a', href=True):
            href = link['href']
            if '/commentary/' in href:
                # commentary/1000572 → 1000572
                commentary_id = href.split('/commentary/')[-1]
                if commentary_id not in commentary_ids:
                    commentary_ids.append(commentary_id)

        return commentary_ids

    def fetch_commentary(self, commentary_id: str) -> dict:
        """被参照情報のcommentaryページから解説テキストを取得"""
        from bs4 import BeautifulSoup

        url = f"{self.COMMENTARY_URL}/{commentary_id}"
        response = requests.get(url)
        soup = BeautifulSoup(response.text, 'html.parser')

        # メインコンテンツから解説テキストを抽出
        content = soup.find('main') or soup.find('article') or soup.body
        text = content.get_text(strip=True, separator='\n') if content else ""

        return {
            "id": commentary_id,
            "url": url,
            "text": text
        }

    def fetch_all_commentary(self, code: str) -> list:
        """指定コードの全ての被参照情報を取得"""
        data = self.fetch(code)
        commentaries = []

        for commentary_id in data.get("commentary_ids", []):
            commentary = self.fetch_commentary(commentary_id)
            commentaries.append(commentary)

        return commentaries
```

### 11.2 Claude Batch API 問題生成

```python
from anthropic import Anthropic
import json

class QuestionGenerator:
    """Claude APIで4択問題を生成"""

    def __init__(self, api_key: str):
        self.client = Anthropic(api_key=api_key)

    def create_batch_requests(self, cos_data: dict, count: int) -> list:
        """バッチリクエストを構築"""

        system_prompt = """あなたは教育評価の専門家です。
学習指導要領に基づいた高品質な4択問題を作成してください。

ルール:
- 正解は1つのみ
- 全選択肢は同程度の長さ
- 提供された情報のみを使用（事実を創作しない）
- 小学生が理解できる表現を使用
- フィードバック用の解説は、正解の理由と学習ポイントを簡潔に説明"""

        requests = []
        for i in range(count):
            user_prompt = f"""以下の学習指導要領に基づいて4択問題を1問作成してください。

【学年】{cos_data['grade']}年
【教科】{cos_data['subject']}
【学習目標】{cos_data['description']}
【解説】{cos_data.get('commentary', '')}

JSON形式で出力:
{{
  "title": "問題のタイトル（簡潔に）",
  "question": "問題文",
  "options": ["A: 選択肢1", "B: 選択肢2", "C: 選択肢3", "D: 選択肢4"],
  "correct_answer": "A",
  "explanation": "正解の理由と学習ポイントの解説（回答後のフィードバックとして表示される）"
}}"""

            requests.append({
                "custom_id": f"q_{cos_data['code']}_{i+1}",
                "params": {
                    "model": "claude-sonnet-4-20250514",
                    "max_tokens": 1024,
                    "system": system_prompt,
                    "messages": [{"role": "user", "content": user_prompt}]
                }
            })

        return requests

    def submit_batch(self, requests: list) -> str:
        """バッチ処理を投入"""
        response = self.client.beta.messages.batches.create(requests=requests)
        return response.id

    def get_results(self, batch_id: str) -> list:
        """バッチ結果を取得"""
        batch = self.client.beta.messages.batches.retrieve(batch_id)

        if batch.processing_status == "ended":
            results = list(self.client.beta.messages.batches.results(batch_id))
            return [
                {
                    "id": r.custom_id,
                    "content": json.loads(r.result.message.content[0].text)
                }
                for r in results
                if r.result.type == "succeeded"
            ]

        return []
```

### 11.3 QTI XML変換

```python
class QTIConverter:
    """JSON問題をQTI 3.0 XMLに変換（フィードバック付き）"""

    @staticmethod
    def convert(question: dict, identifier: str) -> str:
        """問題JSONをQTI XMLに変換（qti-modal-feedback含む）"""

        # 選択肢のXML生成
        options_xml = ""
        choice_labels = ["ア", "イ", "ウ", "エ"]
        for i, option in enumerate(question["options"]):
            choice_id = f"choice_{chr(65 + i)}"  # choice_A, choice_B, ...
            option_text = option[3:] if option[1:3] == ": " else option  # "A: xxx" → "xxx"
            options_xml += f"""            <qti-simple-choice identifier="{choice_id}">{choice_labels[i]}　{option_text}</qti-simple-choice>\n"""

        # 正解のchoice_id
        correct_choice_id = f"choice_{question['correct_answer']}"

        # 正解の選択肢テキストを取得
        correct_idx = ord(question["correct_answer"]) - ord("A")
        correct_option_text = question["options"][correct_idx]
        if correct_option_text[1:3] == ": ":
            correct_option_text = correct_option_text[3:]

        return f"""<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
    xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0_v1p0.xsd"
    identifier="{identifier}"
    title="{question.get('title', 'Generated Question')}"
    adaptive="false"
    time-dependent="false">

    <!-- 解答の宣言 -->
    <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">
        <qti-correct-response>
            <qti-value>{correct_choice_id}</qti-value>
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
            <p>{question["question"]}</p>
        </div>

        <qti-choice-interaction response-identifier="RESPONSE" shuffle="false" max-choices="1">
{options_xml}        </qti-choice-interaction>
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
            <p>{question["explanation"]}</p>
        </qti-content-body>
    </qti-modal-feedback>

    <!-- フィードバック（不正解時） -->
    <qti-modal-feedback identifier="feedback_incorrect" outcome-identifier="FEEDBACK" show-hide="show">
        <qti-content-body>
            <p>残念、不正解です。</p>
            <p>正解は「{choice_labels[correct_idx]}　{correct_option_text}」です。{question["explanation"]}</p>
        </qti-content-body>
    </qti-modal-feedback>

</qti-assessment-item>"""
```

---

## 結論

学習指導要領LODのURLから4択問題を自動生成するプログラムは**技術的に実現可能**です。

**成功のポイント**:
1. 解説テキスト（commentary）を必ず取得して文脈を豊かにする
2. バッチ処理でコスト削減（50%オフ）
3. 品質検証の多段階化（自動 + 人間）
4. 「概念理解」型の問題を中心に生成（事実問題はハルシネーションリスク）

**主な制限**:
- 具体的な数値・条文等の事実問題は教科書データが別途必要
- 初期段階は人間レビュー必須
- ハルシネーション対策が継続的に必要

---

## 参考リンク

- [学習指導要領LOD](https://jp-cos.github.io/)
- [SPARQL エンドポイント](https://dydra.com/masao/jp-cos/@query)
- [Claude API ドキュメント](https://docs.anthropic.com/)
- [Claude Batch Processing](https://docs.anthropic.com/en/docs/build-with-claude/batch-processing)
- [QTI 3.0 仕様](https://www.imsglobal.org/question/index.html)
