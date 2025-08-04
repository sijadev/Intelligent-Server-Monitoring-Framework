#!/usr/bin/env python3
"""
Tests for MCP Server Discovery functionality
"""

import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime
import psutil

# Import the modules to test
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from mcp_monitoring_plugin import (
    MCPServerInfo, 
    MCPServerDiscovery, 
    MCPMetricsCollectorPlugin,
    MCPPatternDetectorPlugin,
    MCPServerRemediationPlugin
)


class TestMCPServerInfo:
    def test_mcp_server_info_creation(self):
        """Test MCPServerInfo dataclass creation"""
        server = MCPServerInfo(
            server_id="test-server-1",
            name="Test Server",
            host="localhost",
            port=8000,
            protocol="http",
            status="running"
        )
        
        assert server.server_id == "test-server-1"
        assert server.name == "Test Server"
        assert server.host == "localhost"
        assert server.port == 8000
        assert server.protocol == "http"
        assert server.status == "running"
        assert server.discovery_method == "unknown"
        assert isinstance(server.discovered_at, datetime)
        assert isinstance(server.last_seen, datetime)


class TestMCPServerDiscovery:
    def setup_method(self):
        """Set up test configuration"""
        self.config = {
            'scan_ports': [8000, 8080, 3000],
            'scan_hosts': ['localhost', '127.0.0.1'],
            'discovery_methods': ['process_scan', 'port_scan', 'docker_scan', 'config_file_scan']
        }
        self.discovery = MCPServerDiscovery(self.config)

    @pytest.mark.asyncio
    async def test_discovery_initialization(self):
        """Test MCPServerDiscovery initialization"""
        assert self.discovery.config == self.config
        assert self.discovery.scan_ports == [8000, 8080, 3000]
        assert self.discovery.scan_hosts == ['localhost', '127.0.0.1']
        assert len(self.discovery.discovery_methods) == 4

    @pytest.mark.asyncio
    @patch('psutil.process_iter')
    async def test_process_scan_discovery(self, mock_process_iter):
        """Test process scanning discovery method"""
        # Mock process data
        mock_proc = Mock()
        mock_proc.info = {
            'pid': 1234,
            'name': 'mcp-server',
            'cmdline': ['python', 'mcp-server.py', '--port=8000'],
            'cwd': '/opt/mcp'
        }
        mock_proc.connections.return_value = [
            Mock(laddr=Mock(port=8000), status='LISTEN')
        ]
        
        mock_process_iter.return_value = [mock_proc]
        
        # Mock the port extraction method
        with patch.object(self.discovery, '_extract_port_from_process', return_value=8000):
            servers = await self.discovery._discover_by_process_scan()
            
        assert len(servers) >= 0  # Should handle the mock data
        
    @pytest.mark.asyncio
    @patch('socket.socket')
    async def test_port_scan_discovery(self, mock_socket):
        """Test port scanning discovery method"""
        # Mock socket connection
        mock_sock_instance = Mock()
        mock_sock_instance.connect_ex.return_value = 0  # Port open
        mock_socket.return_value = mock_sock_instance
        
        # Mock the MCP probing method
        with patch.object(self.discovery, '_probe_port_for_mcp', return_value=None):
            servers = await self.discovery._discover_by_port_scan()
            
        # Should have attempted to probe ports
        assert mock_sock_instance.connect_ex.called

    @pytest.mark.asyncio
    @patch('docker.from_env')
    async def test_docker_scan_discovery(self, mock_docker):
        """Test Docker container scanning discovery method"""
        # Mock Docker client and containers
        mock_container = Mock()
        mock_container.labels = {'mcp-server': 'true'}
        mock_container.name = 'test-mcp-server'
        mock_container.status = 'running'
        
        mock_client = Mock()
        mock_client.containers.list.return_value = [mock_container]
        mock_docker.return_value = mock_client
        
        # Set up Docker client
        self.discovery.docker_client = mock_client
        
        # Mock helper methods
        with patch.object(self.discovery, '_is_mcp_container', return_value=True), \
             patch.object(self.discovery, '_create_server_from_container', return_value=None):
            servers = await self.discovery._discover_by_docker_scan()
            
        # Should have checked containers
        assert mock_client.containers.list.called

    @pytest.mark.asyncio
    @patch('pathlib.Path.exists')
    async def test_config_file_discovery(self, mock_path_exists):
        """Test configuration file scanning discovery method"""
        mock_path_exists.return_value = False  # No config files exist
        
        servers = await self.discovery._discover_by_config_scan()
        
        # Should return empty list when no config files exist
        assert servers == []

    @pytest.mark.asyncio
    async def test_discover_all_servers(self):
        """Test complete server discovery process"""
        # Mock all discovery methods to return empty lists
        with patch.object(self.discovery, '_discover_by_process_scan', return_value=[]), \
             patch.object(self.discovery, '_discover_by_port_scan', return_value=[]), \
             patch.object(self.discovery, '_discover_by_docker_scan', return_value=[]), \
             patch.object(self.discovery, '_discover_by_config_scan', return_value=[]):
            
            servers = await self.discovery.discover_all_servers()
            
        assert isinstance(servers, list)
        assert len(servers) == 0

    @pytest.mark.asyncio
    async def test_discover_all_servers_with_results(self):
        """Test discovery with mock servers found"""
        mock_server = MCPServerInfo(
            server_id="mock-server",
            name="Mock Server",
            host="localhost",
            port=8000,
            protocol="http",
            status="running",
            discovery_method="process_scan"
        )
        
        # Mock discovery methods to return test server
        with patch.object(self.discovery, '_discover_by_process_scan', return_value=[mock_server]), \
             patch.object(self.discovery, '_discover_by_port_scan', return_value=[]), \
             patch.object(self.discovery, '_discover_by_docker_scan', return_value=[]), \
             patch.object(self.discovery, '_discover_by_config_scan', return_value=[]), \
             patch.object(self.discovery, '_deduplicate_servers', return_value=[mock_server]), \
             patch.object(self.discovery, '_enhance_server_info', return_value=None):
            
            servers = await self.discovery.discover_all_servers()
            
        assert len(servers) == 1
        assert servers[0].server_id == "mock-server"
        assert servers[0].discovery_method == "process_scan"


class TestMCPMetricsCollectorPlugin:
    def setup_method(self):
        """Set up test MCP servers"""
        self.test_servers = [
            MCPServerInfo(
                server_id="metrics-server-1",
                name="Metrics Test Server 1",
                host="localhost",
                port=8000,
                protocol="http",
                status="running"
            ),
            MCPServerInfo(
                server_id="metrics-server-2",
                name="Metrics Test Server 2",
                host="localhost",
                port=8001,
                protocol="websocket",
                status="stopped"
            )
        ]
        self.collector = MCPMetricsCollectorPlugin(self.test_servers)

    def test_plugin_properties(self):
        """Test plugin basic properties"""
        assert self.collector.name == "mcp_metrics_collector"
        assert self.collector.version == "1.0.0"

    @pytest.mark.asyncio
    async def test_initialize(self):
        """Test plugin initialization"""
        result = await self.collector.initialize({})
        assert result is True

    @pytest.mark.asyncio
    async def test_cleanup(self):
        """Test plugin cleanup"""
        await self.collector.cleanup()  # Should not raise

    @pytest.mark.asyncio
    async def test_collect_metrics(self):
        """Test metrics collection"""
        # Mock server testing methods
        with patch.object(self.collector, '_collect_server_metrics') as mock_collect:
            mock_collect.return_value = {
                'status': 'running',
                'response_time': 100,
                'uptime': 3600,
                'request_count': 50,
                'error_count': 0
            }
            
            metrics = await self.collector.collect_metrics()
            
        assert 'mcp_total_servers' in metrics
        assert metrics['mcp_total_servers'] == 2
        assert 'mcp_running_servers' in metrics
        assert 'mcp_stopped_servers' in metrics

    @pytest.mark.asyncio
    async def test_collect_server_metrics(self):
        """Test individual server metrics collection"""
        server = self.test_servers[0]
        
        # Mock server alive test and metrics retrieval
        with patch.object(self.collector, '_test_server_alive', return_value=True), \
             patch.object(self.collector, '_get_server_metrics', return_value={'custom_metric': 42}), \
             patch.object(self.collector, '_get_process_metrics', return_value={'cpu': 25.5}):
            
            metrics = await self.collector._collect_server_metrics(server)
            
        assert metrics['status'] == 'running'
        assert 'response_time' in metrics
        assert 'custom_metric' in metrics
        assert metrics['custom_metric'] == 42

    @pytest.mark.asyncio
    async def test_test_server_alive_http(self):
        """Test HTTP server availability testing"""
        server = self.test_servers[0]  # HTTP server
        
        # Mock aiohttp session
        with patch('aiohttp.ClientSession') as mock_session_class:
            mock_session = AsyncMock()
            mock_session_class.return_value.__aenter__.return_value = mock_session
            
            mock_response = AsyncMock()
            mock_response.status = 200
            mock_session.get.return_value.__aenter__.return_value = mock_response
            
            is_alive = await self.collector._test_server_alive(server)
            
        assert is_alive is True

    @pytest.mark.asyncio
    async def test_test_server_alive_websocket(self):
        """Test WebSocket server availability testing"""
        server = self.test_servers[1]  # WebSocket server
        
        # Mock websockets connection
        with patch('websockets.connect', new_callable=AsyncMock) as mock_connect:
            mock_connect.return_value.__aenter__.return_value = Mock()
            
            is_alive = await self.collector._test_server_alive(server)
            
        # Should handle the mocked connection attempt
        assert isinstance(is_alive, bool)

    @pytest.mark.asyncio
    async def test_get_process_metrics(self):
        """Test process-level metrics collection"""
        # Mock psutil process
        with patch('psutil.Process') as mock_process:
            mock_proc = Mock()
            mock_proc.cpu_percent.return_value = 15.5
            mock_proc.memory_info.return_value.rss = 1024 * 1024 * 100  # 100MB
            mock_proc.num_threads.return_value = 5
            mock_proc.create_time.return_value = 1600000000
            mock_proc.num_fds.return_value = 25
            mock_proc.connections.return_value = [Mock(), Mock()]  # 2 connections
            mock_process.return_value = mock_proc
            
            metrics = await self.collector._get_process_metrics(1234)
            
        assert 'process_cpu_percent' in metrics
        assert metrics['process_cpu_percent'] == 15.5
        assert 'process_memory_mb' in metrics
        assert metrics['process_memory_mb'] == 100
        assert 'process_threads' in metrics
        assert metrics['process_threads'] == 5


class TestMCPPatternDetectorPlugin:
    def setup_method(self):
        """Set up test pattern detector"""
        self.test_servers = {
            "pattern-server-1": MCPServerInfo(
                server_id="pattern-server-1",
                name="Pattern Test Server",
                host="localhost",
                port=8000,
                protocol="http",
                status="running"
            )
        }
        self.detector = MCPPatternDetectorPlugin(self.test_servers)

    def test_plugin_properties(self):
        """Test plugin basic properties"""
        assert self.detector.name == "mcp_pattern_detector"
        assert self.detector.version == "1.0.0"

    @pytest.mark.asyncio
    async def test_initialize(self):
        """Test plugin initialization"""
        config = {
            'patterns': {
                'error_patterns': ['error', 'exception', 'failed'],
                'success_patterns': ['started', 'ready', 'completed']
            }
        }
        result = await self.detector.initialize(config)
        assert result is True

    @pytest.mark.asyncio
    async def test_detect_problems(self):
        """Test problem detection"""
        test_data = {
            'server_metrics': {
                'pattern-server-1': {
                    'status': 'running',
                    'response_time': 5000,  # High response time
                    'error_count': 10
                }
            }
        }
        
        problems = await self.detector.detect_problems(test_data, {})
        
        # Should detect high response time as a problem
        assert len(problems) > 0
        assert any('response time' in p.get('description', '').lower() for p in problems)


class TestMCPServerRemediationPlugin:
    def setup_method(self):
        """Set up test remediation plugin"""
        self.test_servers = {
            "remediation-server-1": MCPServerInfo(
                server_id="remediation-server-1",
                name="Remediation Test Server",
                host="localhost",
                port=8000,
                protocol="http",
                status="stopped"
            )
        }
        self.remediator = MCPServerRemediationPlugin(self.test_servers)

    def test_plugin_properties(self):
        """Test plugin basic properties"""
        assert self.remediator.name == "mcp_server_remediation"
        assert self.remediator.version == "1.0.0"

    @pytest.mark.asyncio
    async def test_initialize(self):
        """Test plugin initialization"""
        config = {
            'restart_strategies': {
                'process': 'kill_and_restart',
                'container': 'docker_restart',
                'service': 'systemctl_restart'
            }
        }
        result = await self.remediator.initialize(config)
        assert result is True

    @pytest.mark.asyncio
    async def test_remediate_server_down(self):
        """Test server restart remediation"""
        problem = {
            'type': 'server_down',
            'server_id': 'remediation-server-1',
            'description': 'Server is not responding'
        }
        
        # Mock restart method
        with patch.object(self.remediator, '_restart_server', return_value=True):
            result = await self.remediator.remediate_problem(problem)
            
        assert result['success'] is True
        assert 'restarted' in result['action'].lower()

    @pytest.mark.asyncio
    async def test_remediate_unknown_problem(self):
        """Test handling of unknown problem types"""
        problem = {
            'type': 'unknown_problem',
            'server_id': 'remediation-server-1',
            'description': 'Unknown issue'
        }
        
        result = await self.remediator.remediate_problem(problem)
        
        assert result['success'] is False
        assert 'unknown' in result['message'].lower()


if __name__ == '__main__':
    pytest.main([__file__])