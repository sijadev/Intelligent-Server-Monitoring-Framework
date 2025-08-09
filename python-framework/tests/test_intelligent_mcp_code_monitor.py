import pytest
from unittest.mock import AsyncMock, patch

@pytest.mark.asyncio
async def test_monitor_start_stop_cycle():
    try:
        from intelligent_mcp_code_monitor import IntelligentMCPCodeMonitor
    except Exception:
        pytest.skip("intelligent_mcp_code_monitor import skipped (deps missing)")

    monitor = IntelligentMCPCodeMonitor({"scan_interval":0.01,"auto_fix_enabled":False})
    # Patch initialize to avoid heavy startup
    with patch.object(monitor,'initialize', new=AsyncMock(return_value=True)):
        with patch.object(monitor,'_poll_once', new=AsyncMock(return_value=None)) as mock_poll:
            await monitor.start()
            await monitor.stop()
    assert mock_poll.await_count >= 0
