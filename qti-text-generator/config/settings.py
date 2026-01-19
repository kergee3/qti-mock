"""設定ファイル - 記述式問題生成用"""

import os
from pathlib import Path
from dotenv import load_dotenv

# .envファイルを読み込み（ローカル優先、なければルート）
BASE_DIR = Path(__file__).resolve().parent.parent
ROOT_DIR = BASE_DIR.parent
local_env = BASE_DIR / ".env"
root_env = ROOT_DIR / ".env"

if local_env.exists():
    load_dotenv(local_env)
elif root_env.exists():
    load_dotenv(root_env)

# パス設定
OUTPUT_DIR = BASE_DIR / "output"
PROMPTS_DIR = BASE_DIR / "prompts"

# Claude API設定
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
DEFAULT_MODEL = os.getenv("DEFAULT_MODEL", "claude-sonnet-4-5-20250929")

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
    "default_count": 5,  # デフォルト生成問題数
    "max_score": 10,   # 満点（10点満点）
}

# 問題番号別の字数制限設定
# 1-2問目: 短め（50-100文字）、3問目以降: 長め（70-140文字）
CHAR_LIMIT_CONFIG = {
    "short": {  # 1-2問目用
        "min_chars": 50,
        "max_chars": 100,
        "model_answer_target": 90,  # 模範解答の目標文字数
    },
    "long": {  # 3問目以降用
        "min_chars": 70,
        "max_chars": 140,
        "model_answer_target": 130,  # 模範解答の目標文字数
    },
}

def get_char_limits(question_number: int) -> dict:
    """
    問題番号に応じた字数制限を取得

    Args:
        question_number: 問題番号（1から始まる）

    Returns:
        dict: min_chars, max_chars, model_answer_target を含む辞書
    """
    if question_number <= 2:
        return CHAR_LIMIT_CONFIG["short"]
    else:
        return CHAR_LIMIT_CONFIG["long"]

def get_difficulty(question_number: int, total_count: int = 5) -> int:
    """
    問題番号に応じた難易度を取得

    Args:
        question_number: 問題番号（1から始まる）
        total_count: 総問題数

    Returns:
        int: 難易度（1-5）
    """
    # 1問目: 難易度1, 2問目: 難易度2, 3問目以降: 3から順に最大5まで
    if question_number <= 2:
        return question_number
    else:
        # 3問目から始まり、最大5まで
        return min(question_number, 5)

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
