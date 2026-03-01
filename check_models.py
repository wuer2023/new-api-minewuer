#!/usr/bin/env python3
"""
模型健康检测脚本
使用 asyncio + aiohttp 并发请求 /v1/chat/completions，
记录每个模型最近 15 次的探测结果，生成 model_health.json。

Crontab 示例（每 15 分钟执行一次）:
  */15 * * * * cd /path/to/project && python3 check_models.py >> /var/log/check_models.log 2>&1
"""

import asyncio
import json
import os
import time
from pathlib import Path

try:
    import aiohttp
except ImportError:
    print("请先安装 aiohttp: pip install aiohttp")
    raise SystemExit(1)

# ======================== 配置区 ========================
API_BASE_URL = os.getenv("HEALTH_API_BASE", "http://localhost:3000")
API_TOKEN = os.getenv("HEALTH_API_TOKEN", "sk-your-token-here")

MODELS = [
    "gpt-4o-mini",
    "gpt-4o",
    "claude-3-5-sonnet-20241022",
    "deepseek-chat",
    "deepseek-reasoner",
]

OUTPUT_PATH = os.getenv(
    "HEALTH_OUTPUT_PATH",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "web", "dist", "model_health.json"),
)

HISTORY_PATH = os.getenv(
    "HEALTH_HISTORY_PATH",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), ".model_health_history.json"),
)

REQUEST_TIMEOUT = 10
MAX_HISTORY = 15
CONCURRENCY = 10
# ========================================================


async def check_model(session: aiohttp.ClientSession, model: str) -> int:
    """
    对单个模型发起极简测试请求。
    返回: 1=成功, 0=失败, 2=超时/高延迟
    """
    url = f"{API_BASE_URL.rstrip('/')}/v1/chat/completions"
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": "1"}],
        "max_tokens": 1,
    }
    headers = {
        "Authorization": f"Bearer {API_TOKEN}",
        "Content-Type": "application/json",
    }

    try:
        start = time.monotonic()
        async with session.post(
            url,
            json=payload,
            headers=headers,
            timeout=aiohttp.ClientTimeout(total=REQUEST_TIMEOUT),
        ) as resp:
            elapsed = time.monotonic() - start
            if resp.status == 200:
                return 2 if elapsed > 8 else 1
            return 0
    except asyncio.TimeoutError:
        return 2
    except Exception:
        return 0


async def run_checks() -> dict[str, int]:
    """并发检测所有模型，返回 {model_name: status}。"""
    semaphore = asyncio.Semaphore(CONCURRENCY)
    results: dict[str, int] = {}

    async def _check(model: str):
        async with semaphore:
            results[model] = await check_model(session, model)

    connector = aiohttp.TCPConnector(limit=CONCURRENCY, limit_per_host=CONCURRENCY)
    async with aiohttp.ClientSession(connector=connector) as session:
        await asyncio.gather(*[_check(m) for m in MODELS])

    return results


def load_history() -> dict:
    """从磁盘加载历史记录。"""
    path = Path(HISTORY_PATH)
    if path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            pass
    return {}


def save_history(history: dict):
    """将历史记录持久化到磁盘。"""
    path = Path(HISTORY_PATH)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(history, ensure_ascii=False), encoding="utf-8")


def build_output(history: dict) -> dict:
    """根据历史记录构建前端所需的 JSON 结构。"""
    models = []
    for name in MODELS:
        h = history.get(name, [])
        valid = [v for v in h if v in (0, 1)]
        ok_count = sum(1 for v in valid if v == 1)
        availability = round(ok_count / len(valid) * 100) if valid else None
        models.append({
            "name": name,
            "history": h,
            "availability": availability,
        })
    return {
        "updated_at": int(time.time()),
        "models": models,
    }


async def main():
    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] 开始模型健康检测 ({len(MODELS)} 个模型)...")

    results = await run_checks()

    history = load_history()
    for model, status in results.items():
        h = history.get(model, [])
        h.append(status)
        history[model] = h[-MAX_HISTORY:]

    save_history(history)

    output = build_output(history)

    out_path = Path(OUTPUT_PATH)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(
        json.dumps(output, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    for m in output["models"]:
        status_map = {1: "✓ 成功", 0: "✗ 失败", 2: "⚠ 超时"}
        latest = m["history"][-1] if m["history"] else None
        avail = f"{m['availability']}%" if m["availability"] is not None else "-"
        print(f"  {m['name']:.<40s} {status_map.get(latest, '?'):8s}  可用率: {avail}")

    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] 检测完成，结果已写入 {OUTPUT_PATH}")


if __name__ == "__main__":
    asyncio.run(main())
