"""設定ファイル - 記述式問題生成用"""

import os
from pathlib import Path
from dotenv import load_dotenv

# .envファイルを読み込み
load_dotenv()

# パス設定
BASE_DIR = Path(__file__).resolve().parent.parent
OUTPUT_DIR = BASE_DIR / "output"
PROMPTS_DIR = BASE_DIR / "prompts"

# Claude API設定
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
DEFAULT_MODEL = os.getenv("DEFAULT_MODEL", "claude-sonnet-4-20250514")

# 品質設定
QUALITY_THRESHOLD = int(os.getenv("QUALITY_THRESHOLD", "80"))
BATCH_SIZE = int(os.getenv("BATCH_SIZE", "5"))

# 学習指導要領LOD URL
COS_BASE_URL = "https://w3id.org/jp-cos"
COS_HTML_BASE_URL = "https://jp-cos.github.io"
COS_COMMENTARY_URL = "https://jp-cos.github.io/commentary"

# 対象分野コード（5分野）
TARGET_CODES = {
    "社会_政治": "8220263100000000",
    "社会_歴史": "8220263200000000",
    "社会_国際": "8220263300000000",
    "理科_物質エネルギー": "8260263100000000",
    "理科_生命地球": "8260263200000000",
}

# 科目コードプレフィックス（HTML URL用）
CODE_PREFIX_MAP = {
    "822": "社会",  # 小学校社会
    "826": "理科",  # 小学校理科
}

# 記述式問題の設定
TEXT_QUESTION_CONFIG = {
    "max_chars": 100,  # 最大文字数
    "min_chars": 60,   # 最小文字数（これ以下は採点しない）
    "default_count": 5,  # デフォルト生成問題数
    "max_score": 10,   # 満点（10点満点）
}

# 採点観点の設定
SCORING_ASPECTS = {
    "understanding": {
        "name": "理解力",
        "weight": 40,  # 4点分
        "max_score": 4,
    },
    "expression": {
        "name": "表現力",
        "weight": 30,  # 3点分
        "max_score": 3,
    },
    "accuracy": {
        "name": "正確性",
        "weight": 30,  # 3点分
        "max_score": 3,
    },
}
