# QTI Question Generator

学習指導要領LOD（jp-cos.github.io）から4択問題を自動生成するPythonバッチプログラム。

## 概要

Claude APIを使用して、学習指導要領の内容に基づいた小学生向け4択問題をQTI 3.0形式で自動生成します。

## 対応分野

現在、以下の5分野に対応しています（学習指導要領LODの試行データに準拠）:

| 科目 | 分野 | コード |
|------|------|--------|
| 社会 | 政治 | 8220263100000000 |
| 社会 | 歴史 | 8220263200000000 |
| 社会 | 国際 | 8220263300000000 |
| 理科 | 物質・エネルギー | 8260263100000000 |
| 理科 | 生命・地球 | 8260263200000000 |

## セットアップ

### 1. Python仮想環境の有効化

```bash
cd qti-question-generator

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
```

### 2. 環境変数の設定

`.env.example` を `.env` にコピーして、APIキーを設定:

```bash
cp .env.example .env
```

`.env` ファイルを編集:

```
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx（取得したキー）
```

## 使い方

### 基本的な使い方

```bash
# 社会・政治分野から3問生成（デフォルト）
python src/main.py

# 分野を指定して生成
python src/main.py --subject 社会_政治 --count 5

# コードで直接指定
python src/main.py --code 8220263100000000 --count 3

# 利用可能な分野一覧を表示
python src/main.py --list-subjects
```

### コマンドオプション

| オプション | 説明 | デフォルト |
|-----------|------|-----------|
| `--code` | 学習指導要領コード | - |
| `--subject` | 分野名（社会_政治 など） | 社会_政治 |
| `--count` | 生成する問題数 | 3 |
| `--output` | 出力ディレクトリ | output/ |
| `--list-subjects` | 分野一覧を表示 | - |

## 出力形式

生成された問題は `output/` ディレクトリに以下の形式で出力されます:

```
output/
└── social_31_20260115_212522/
    ├── social_31_001.xml    # QTI 3.0 XML
    ├── social_31_002.xml
    ├── social_31_003.xml
    └── summary.json         # メタデータ
```

### QTI XML形式

生成されるXMLは QTI 3.0 仕様に準拠し、以下の機能を含みます:
- 4択問題（qti-choice-interaction）
- 自動採点（qti-response-processing）
- 正解/不正解時のフィードバック（qti-modal-feedback）

## プロジェクト構成

```
qti-question-generator/
├── src/
│   ├── fetcher/
│   │   └── cos_fetcher.py      # 学習指導要領LOD取得
│   ├── generator/
│   │   ├── prompt_builder.py   # プロンプト構築
│   │   └── question_generator.py # Claude API連携
│   ├── converter/
│   │   └── qti_converter.py    # QTI XML変換
│   ├── storage/
│   │   └── file_exporter.py    # ファイル出力
│   └── main.py                 # エントリーポイント
├── config/
│   └── settings.py             # 設定
├── output/                     # 生成ファイル出力先
├── requirements.txt
├── .env.example
└── README.md
```

## 注意事項

- 生成された問題は必ず人間がレビューしてください
- Claude APIの利用にはコストがかかります（Sonnetモデル使用時、1問あたり約$0.002）
- 学習指導要領LODは試行的なプロジェクトであり、データ範囲が限定されています

## 今後の予定（Phase 2以降）

- [ ] Batch API対応（50%コスト削減）
- [ ] PostgreSQL/Neon保存
- [ ] 品質検証機能
- [ ] 理科向けプロンプト調整

## 参考リンク

- [学習指導要領LOD](https://jp-cos.github.io/)
- [QTI 3.0仕様](https://www.imsglobal.org/question/index.html)
- [Claude API](https://docs.anthropic.com/)
