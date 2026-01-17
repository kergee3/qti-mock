# QTI Question Generator

学習指導要領LOD（jp-cos.github.io）から4択問題を自動生成するPythonバッチプログラム。

## 概要

Claude APIを使用して、学習指導要領の内容に基づいた小学生向け4択問題をQTI 3.0形式で自動生成します。

### 主な機能

- **トピック分散**: 解説テキストからトピックを自動抽出し、各問題に異なるトピックを割り当て
- **下位コード取得**: 親コードだけでなく下位コード（hasPart）の解説も取得してコンテンツを拡充
- **選択肢シャッフル**: QTI 3.0の`shuffle="true"`属性により、表示時に選択肢の順序をランダム化
- **Vercel Blobアップロード**: 生成したファイルをVercel Blob Storageに直接アップロード可能

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
cd qti-choice-generator

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
# 必須
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx

# Vercel Blobアップロードを使用する場合
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxx
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

# 生成後にVercel Blobにアップロード
python src/main.py --subject 社会_政治 --count 5 --upload

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
| `--upload` | 生成後にVercel Blobにアップロード | false |
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

### summary.json の構造

```json
{
  "timestamp": "20260115_212522",
  "model": "claude-sonnet-4-20250514",
  "total_questions": 3,
  "output_directory": "social_31_20260115_212522",
  "files": ["social_31_001.xml", "social_31_002.xml", "social_31_003.xml"],
  "questions": [...],
  "metadata": {
    "cos_code": "8220263100000000",
    "subject": "社会",
    "grade": 6,
    "description": "..."
  }
}
```

### QTI XML形式

生成されるXMLは QTI 3.0 仕様に準拠し、以下の機能を含みます:
- 4択問題（qti-choice-interaction）
- 選択肢のシャッフル（shuffle="true"）
- 自動採点（qti-response-processing）
- 正解/不正解時のフィードバック（qti-modal-feedback）

## Vercel Blobへのアップロード

`--upload` オプションを使用すると、生成したファイルがVercel Blob Storageにアップロードされます。

### 設定

`.env` に `BLOB_READ_WRITE_TOKEN` を設定:

```
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxx
```

トークンは [Vercel Dashboard](https://vercel.com/dashboard) → Storage → Blob → Tokens から取得できます。

### アップロード先

```
https://tckuafka85ded2kl.public.blob.vercel-storage.com/ai-choice/{folder_name}/
```

## プロジェクト構成

```
qti-choice-generator/
├── src/
│   ├── fetcher/
│   │   └── cos_fetcher.py        # 学習指導要領LOD取得（下位コード含む）
│   ├── generator/
│   │   ├── prompt_builder.py     # プロンプト構築
│   │   ├── question_generator.py # Claude API連携
│   │   └── topic_extractor.py    # トピック抽出
│   ├── converter/
│   │   └── qti_converter.py      # QTI XML変換
│   ├── storage/
│   │   ├── file_exporter.py      # ファイル出力
│   │   └── blob_uploader.py      # Vercel Blobアップロード
│   └── main.py                   # エントリーポイント
├── config/
│   └── settings.py               # 設定
├── output/                       # 生成ファイル出力先
├── requirements.txt
├── .env.example
└── README.md
```

## 処理フロー

1. **学習指導要領LOD取得**: 指定コード + 下位コード（hasPart）の解説テキストを取得
2. **トピック抽出**: 解説テキストからClaude APIを使用してトピックを抽出
3. **問題生成**: 各問題に異なるトピックを割り当ててClaude APIで生成
4. **QTI変換**: 生成された問題をQTI 3.0 XML形式に変換
5. **ファイル出力**: XMLファイルとsummary.jsonを出力
6. **アップロード**（オプション）: Vercel Blobにアップロード

## 注意事項

- 生成された問題は必ず人間がレビューしてください
- Claude APIの利用にはコストがかかります（Sonnetモデル使用時、1問あたり約$0.002）
- トピック抽出に追加で1回のAPIコールが必要です
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
- [Vercel Blob](https://vercel.com/docs/storage/vercel-blob)
