"""API呼び出しの統計情報を管理するモジュール"""

from dataclasses import dataclass, field
from typing import Dict, List

# Claude API 価格設定（USD per million tokens）
# https://www.anthropic.com/pricing
MODEL_PRICING = {
    # Claude Sonnet 4
    "claude-sonnet-4-20250514": {
        "input": 3.0,   # $3 / MTok
        "output": 15.0,  # $15 / MTok
    },
    # Claude Sonnet 4.5 (複数のバージョン)
    "claude-sonnet-4-5-20250514": {
        "input": 3.0,
        "output": 15.0,
    },
    "claude-sonnet-4-5-20250929": {
        "input": 3.0,
        "output": 15.0,
    },
    # Claude Haiku 4.5 (複数のバージョン)
    "claude-haiku-4-5-20250514": {
        "input": 1.0,
        "output": 5.0,
    },
    "claude-haiku-4-5-20251001": {
        "input": 1.0,
        "output": 5.0,
    },
    # Claude Opus 4.5
    "claude-opus-4-5-20251101": {
        "input": 15.0,
        "output": 75.0,
    },
    # Claude Haiku 3
    "claude-3-haiku-20240307": {
        "input": 0.25,
        "output": 1.25,
    },
    # デフォルト（不明なモデルの場合）
    "default": {
        "input": 3.0,
        "output": 15.0,
    },
}


def get_pricing(model: str) -> dict:
    """モデル名から価格設定を取得"""
    return MODEL_PRICING.get(model, MODEL_PRICING["default"])


def calculate_cost(tokens: int, price_per_mtok: float) -> float:
    """トークン数から費用を計算（USD）"""
    return (tokens / 1_000_000) * price_per_mtok


@dataclass
class StepStats:
    """ステップごとの統計情報"""
    name: str
    api_calls: int = 0
    input_tokens: int = 0
    output_tokens: int = 0

    def add(self, input_tokens: int, output_tokens: int) -> None:
        """API呼び出しの統計を追加"""
        self.api_calls += 1
        self.input_tokens += input_tokens
        self.output_tokens += output_tokens

    @property
    def total_tokens(self) -> int:
        """合計トークン数"""
        return self.input_tokens + self.output_tokens

    def get_input_cost(self, model: str) -> float:
        """入力トークンの費用を計算（USD）"""
        pricing = get_pricing(model)
        return calculate_cost(self.input_tokens, pricing["input"])

    def get_output_cost(self, model: str) -> float:
        """出力トークンの費用を計算（USD）"""
        pricing = get_pricing(model)
        return calculate_cost(self.output_tokens, pricing["output"])


class APIStats:
    """API統計情報を管理するシングルトンクラス"""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self._steps: Dict[str, StepStats] = {}
        self._step_order: List[str] = []
        self._model: str = "default"

    def reset(self) -> None:
        """統計情報をリセット"""
        self._steps = {}
        self._step_order = []
        self._model = "default"

    def set_model(self, model: str) -> None:
        """使用モデルを設定"""
        self._model = model

    @property
    def model(self) -> str:
        """使用モデルを取得"""
        return self._model

    def add_call(self, step_name: str, input_tokens: int, output_tokens: int) -> None:
        """
        API呼び出しの統計を追加

        Args:
            step_name: ステップ名（例: "トピック抽出", "問題生成"）
            input_tokens: 入力トークン数
            output_tokens: 出力トークン数
        """
        if step_name not in self._steps:
            self._steps[step_name] = StepStats(name=step_name)
            self._step_order.append(step_name)

        self._steps[step_name].add(input_tokens, output_tokens)

    def get_step_stats(self, step_name: str) -> StepStats:
        """ステップの統計情報を取得"""
        return self._steps.get(step_name, StepStats(name=step_name))

    def get_all_steps(self) -> List[StepStats]:
        """全ステップの統計情報を順序付きで取得"""
        return [self._steps[name] for name in self._step_order]

    @property
    def total_api_calls(self) -> int:
        """全体の合計API呼び出し回数"""
        return sum(s.api_calls for s in self._steps.values())

    @property
    def total_input_tokens(self) -> int:
        """全体の合計入力トークン数"""
        return sum(s.input_tokens for s in self._steps.values())

    @property
    def total_output_tokens(self) -> int:
        """全体の合計出力トークン数"""
        return sum(s.output_tokens for s in self._steps.values())

    @property
    def total_tokens(self) -> int:
        """全体の合計トークン数"""
        return self.total_input_tokens + self.total_output_tokens

    @property
    def total_input_cost(self) -> float:
        """全体の合計入力コスト（USD）"""
        return sum(s.get_input_cost(self._model) for s in self._steps.values())

    @property
    def total_output_cost(self) -> float:
        """全体の合計出力コスト（USD）"""
        return sum(s.get_output_cost(self._model) for s in self._steps.values())

    @property
    def total_cost(self) -> float:
        """全体の合計コスト（USD）"""
        return self.total_input_cost + self.total_output_cost

    def print_summary(self) -> None:
        """統計情報のサマリーを表示"""
        print(f"\n{'='*80}")
        print(f"API使用統計 (モデル: {self._model})")
        print(f"{'='*80}")

        # 価格情報を取得
        pricing = get_pricing(self._model)

        # ステップごとの統計
        print("\n【ステップ別統計】")
        print(f"{'ステップ':<16} {'呼出':>6} {'入力Token':>12} {'出力Token':>12} {'入力$':>10} {'出力$':>10}")
        print("-" * 80)

        for step in self.get_all_steps():
            input_cost = step.get_input_cost(self._model)
            output_cost = step.get_output_cost(self._model)
            print(f"{step.name:<16} {step.api_calls:>6} {step.input_tokens:>12,} {step.output_tokens:>12,} ${input_cost:>8.4f} ${output_cost:>8.4f}")

        # 全体の統計
        print("-" * 80)
        print(f"{'【合計】':<16} {self.total_api_calls:>6} {self.total_input_tokens:>12,} {self.total_output_tokens:>12,} ${self.total_input_cost:>8.4f} ${self.total_output_cost:>8.4f}")
        print(f"\n総コスト: ${self.total_cost:.4f}")
        print(f"{'='*80}\n")


# グローバルインスタンス
api_stats = APIStats()
