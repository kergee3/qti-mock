"""設定ファイル"""

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
