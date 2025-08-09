import asyncio
import types
from typing import Any, Dict

import psutil  # type: ignore
import pytest

from main import SystemMetricsCollectorPlugin


@pytest.mark.asyncio
async def test_system_metrics_collector_basic_structure():
    plugin = SystemMetricsCollectorPlugin()
    await plugin.initialize({})
    metrics = await plugin.collect_metrics()

    # Required timestamp
    assert 'timestamp' in metrics
    # At least one primary metric key present
    keys = {'cpu_usage', 'memory_usage', 'disk_usage', 'load_average', 'network_connections', 'processes'}
    assert keys.intersection(metrics.keys())

    # If errors dict present, ensure it has reasonable shape
    if 'errors' in metrics:
        assert isinstance(metrics['errors'], dict)
        for k, v in metrics['errors'].items():
            assert k in keys
            assert isinstance(v, str) and v


@pytest.mark.asyncio
async def test_system_metrics_collector_partial_failures(monkeypatch):
    plugin = SystemMetricsCollectorPlugin()
    await plugin.initialize({})

    # Force two metrics to raise
    def boom(*_a: Any, **_kw: Any):  # noqa: ANN401
        raise RuntimeError("forced failure")

    monkeypatch.setattr(psutil, 'cpu_percent', boom)
    monkeypatch.setattr(psutil, 'virtual_memory', boom)

    metrics = await plugin.collect_metrics()
    assert 'errors' in metrics, 'Expected errors when forcing failures'
    # Exactly the metrics we forced should be in errors (others may optionally fail but must include these two)
    for forced in ['cpu_usage', 'memory_usage']:
        assert forced in metrics['errors']
    # Original keys should still be present with None values
    assert metrics.get('cpu_usage') is None
    assert metrics.get('memory_usage') is None


@pytest.mark.asyncio
async def test_system_metrics_collector_all_failures(monkeypatch):
    plugin = SystemMetricsCollectorPlugin()
    await plugin.initialize({})

    def boom(*_a: Any, **_kw: Any):  # noqa: ANN401
        raise RuntimeError('total failure')

    monkeypatch.setattr(psutil, 'cpu_percent', boom)
    monkeypatch.setattr(psutil, 'virtual_memory', boom)
    monkeypatch.setattr(psutil, 'disk_usage', boom)
    monkeypatch.setattr(psutil, 'net_connections', boom)
    monkeypatch.setattr(psutil, 'pids', boom)

    metrics = await plugin.collect_metrics()
    # In total failure we return legacy shape with system_metrics_error
    assert 'system_metrics_error' in metrics or 'errors' in metrics
    if 'errors' in metrics:
        # If we still produced the new shape, ensure all capture keys are None
        for k in ['cpu_usage', 'memory_usage', 'disk_usage', 'network_connections', 'processes']:
            assert k in metrics and metrics[k] is None
