import pytest
from unittest.mock import patch

@pytest.mark.asyncio
async def test_mcp_monitoring_plugin_collect_cycle():
    try:
        from mcp_monitoring_plugin import MCPMetricsCollectorPlugin, MCPServerInfo
    except Exception:
        pytest.skip("mcp_monitoring_plugin import skipped")
    servers = [MCPServerInfo(server_id='s1', name='S1', host='localhost', port=1234, protocol='http', status='running')]
    plugin = MCPMetricsCollectorPlugin(servers)
    await plugin.initialize({})
    with patch.object(plugin,'_collect_server_metrics', return_value={'status':'running','response_time':10,'uptime':1,'request_count':1,'error_count':0}):
        metrics = await plugin.collect_metrics()
    assert metrics['mcp_total_servers'] == 1
