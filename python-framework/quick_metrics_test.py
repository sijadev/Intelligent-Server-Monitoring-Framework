"""Quick test for SystemMetricsCollectorPlugin robustness.

Usage:
  python quick_metrics_test.py            # normal metrics collection
  SIMULATE_ERRORS=1 python quick_metrics_test.py  # simulate per-metric failures

Outputs JSON for easy inspection.
"""
from __future__ import annotations

import asyncio
import json
import os
import random
from typing import Any

import psutil  # type: ignore

from main import SystemMetricsCollectorPlugin  # noqa: E402

# Optional error simulation by monkeypatching selected psutil functions

def _simulate_errors() -> None:
    class Boom(Exception):
        pass

    def fail_some(original_fn, probability: float = 0.7):
        def wrapper(*args: Any, **kwargs: Any):  # noqa: ANN401 - generic test wrapper
            if random.random() < probability:
                raise Boom("Simulated metric failure")
            return original_fn(*args, **kwargs)
        return wrapper

    psutil.cpu_percent = fail_some(psutil.cpu_percent)  # type: ignore
    psutil.virtual_memory = fail_some(psutil.virtual_memory)  # type: ignore
    psutil.disk_usage = fail_some(psutil.disk_usage)  # type: ignore
    psutil.net_connections = fail_some(psutil.net_connections)  # type: ignore
    psutil.pids = fail_some(psutil.pids)  # type: ignore


async def main_async() -> None:
    if os.getenv("SIMULATE_ERRORS"):
        _simulate_errors()

    plugin = SystemMetricsCollectorPlugin()
    await plugin.initialize({})

    results = []
    # Collect a few samples to show variability / partial failures
    for _ in range(3):
        metrics = await plugin.collect_metrics()
        results.append(metrics)
        await asyncio.sleep(0.2)

    print(json.dumps({"samples": results}, indent=2, sort_keys=True))


if __name__ == "__main__":
    asyncio.run(main_async())
