# qti-text-generator

記述式問題を自動生成するPythonバッチツールです。学習指導要領LODから解説テキストを取得し、Claude APIを使用して思考力・判断力・表現力を問う記述式問題を生成します。

## 機能

- 学習指導要領LOD（jp-cos.github.io）からデータを取得
- 解説テキストから記述式問題用のトピックを自動抽出
- Claude APIを使用して記述式問題を生成
- QTI 3.0形式（extendedTextInteraction）でXMLを出力
- Vercel Blobへのアップロード対応

## セットアップ

```bash
# 依存関係のインストール
pip install -r requirements.txt

# .envファイルの設定
cp .env.example .env
# ANTHROPIC_API_KEY と BLOB_READ_WRITE_TOKEN を設定
```

## 使い方

```bash
# 社会・政治分野で5問生成（デフォルト）
python src/main.py

# 分野を指定して生成
python src/main.py --subject 社会_政治 --count 5

# 学習指導要領コードを直接指定
python src/main.py --code 8220263100000000 --count 3

# 利用可能な分野一覧を表示
python src/main.py --list-subjects

# Vercel Blobにアップロード
python src/main.py --subject 社会_政治 --count 5 --upload
```

## 対応分野

| 科目 | 分野 | コード |
|------|------|--------|
| 社会 | 政治 | 8220263100000000 |
| 社会 | 歴史 | 8220263200000000 |
| 社会 | 国際 | 8220263300000000 |
| 理科 | 物質・エネルギー | 8260263100000000 |
| 理科 | 生命・地球 | 8260263200000000 |

## 生成される問題の特徴

### 採点観点（10点満点）
- **理解力（4点）**: 概念や内容を正しく理解しているか
- **表現力（3点）**: 論理的かつ明確に表現できているか
- **正確性（3点）**: 用語や事実関係が正確か

### 難易度
- 1問目: 易しい（基礎的な概念の理解確認）
- 2問目: やや易しい（基礎概念の応用）
- 3問目: 普通（複数概念の関連付け）
- 4問目: やや難しい（批判的思考・多角的視点）
- 5問目: 難しい（複雑な状況判断・高度な論理的思考）

### 回答条件
- 最大文字数: 100文字
- 最小文字数: 60文字（これ未満は採点対象外）

## 出力形式

### QTI 3.0 XML構造

```xml
<qti-assessment-item identifier="text-001">
  <!-- レスポンス宣言 -->
  <qti-response-declaration identifier="RESPONSE" base-type="string"/>

  <!-- 外部採点（AI採点用） -->
  <qti-outcome-declaration identifier="SCORE" external-scored="human"/>

  <!-- AI採点用メタデータ -->
  <qti-rubric-block view="scorer" use="ai-scoring">
    <scoring-criteria>
      <model-answer>模範解答</model-answer>
      <required-concepts>
        <concept>必須概念1</concept>
      </required-concepts>
      <scoring-matrix>
        <criterion aspect="understanding" max-score="4">
          <level score="4">完全に理解している</level>
          ...
        </criterion>
      </scoring-matrix>
      <common-errors>
        <error pattern="誤答パターン" feedback="フィードバック"/>
      </common-errors>
    </scoring-criteria>
  </qti-rubric-block>

  <!-- 問題文 -->
  <qti-item-body>
    <qti-extended-text-interaction response-identifier="RESPONSE" expected-length="100"/>
  </qti-item-body>
</qti-assessment-item>
```

## ディレクトリ構造

```
qti-text-generator/
├── src/
│   ├── main.py                    # エントリーポイント
│   ├── fetcher/
│   │   └── cos_fetcher.py         # 学習指導要領LODデータ取得
│   ├── generator/
│   │   ├── prompt_builder.py      # プロンプト構築
│   │   ├── text_question_generator.py  # 問題生成
│   │   └── topic_extractor.py     # トピック抽出
│   ├── converter/
│   │   └── qti_text_converter.py  # QTI XML変換
│   └── storage/
│       ├── file_exporter.py       # ファイル出力
│       └── blob_uploader.py       # Vercel Blobアップロード
├── config/
│   └── settings.py                # 設定
├── output/                        # 生成結果
├── requirements.txt
└── README.md
```
