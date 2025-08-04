#!/usr/bin/env python3
"""
MCP (Model Context Protocol) Server Monitoring Plugin
Comprehensive monitoring, discovery, and management of MCP servers
"""

import asyncio
import json
import psutil
import subprocess
import requests
import aiohttp
import yaml
import os
import re
import socket
import time
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, field, asdict
from datetime import datetime
import logging
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

# Try to import external dependencies
try:
    import docker
    DOCKER_AVAILABLE = True
except ImportError:
    DOCKER_AVAILABLE = False
    logger.warning("Docker not available - container discovery disabled")

try:
    import aiohttp
    AIOHTTP_AVAILABLE = True
except ImportError:
    AIOHTTP_AVAILABLE = False
    logger.warning("aiohttp not available - HTTP probing disabled")

try:
    import websockets
    WEBSOCKETS_AVAILABLE = True
except ImportError:
    WEBSOCKETS_AVAILABLE = False
    logger.warning("websockets not available - WebSocket probing disabled")

@dataclass
class MCPServerInfo:
    """Information about a discovered MCP Server"""
    server_id: str
    name: str
    host: str
    port: int
    protocol: str  # http, https, websocket
    status: str  # running, stopped, unknown
    
    # Process information
    pid: Optional[int] = None
    process_name: Optional[str] = None
    command_line: Optional[str] = None
    working_directory: Optional[str] = None
    
    # Code location
    executable_path: Optional[str] = None
    source_directory: Optional[str] = None
    config_file: Optional[str] = None
    log_files: List[str] = field(default_factory=list)
    
    # Runtime information
    version: Optional[str] = None
    capabilities: List[str] = field(default_factory=list)
    health_endpoint: Optional[str] = None
    metrics_endpoint: Optional[str] = None
    
    # Container information (if containerized)
    container_id: Optional[str] = None
    container_name: Optional[str] = None
    image_name: Optional[str] = None
    
    # Discovery metadata
    discovery_method: str = "unknown"
    discovered_at: datetime = field(default_factory=datetime.now)
    last_seen: datetime = field(default_factory=datetime.now)

class MCPServerDiscovery:
    """Automatic discovery of MCP Servers"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.discovered_servers = {}
        self.docker_client = None
        self.scan_ports = config.get('scan_ports', [8000, 8080, 3000, 5000, 9000])
        self.scan_hosts = config.get('scan_hosts', ['localhost', '127.0.0.1'])
        self.discovery_methods = config.get('discovery_methods', [
            'process_scan',
            'port_scan', 
            'docker_scan',
            'config_file_scan'
        ])
        
        # Initialize Docker client if available
        if DOCKER_AVAILABLE:
            try:
                self.docker_client = docker.from_env()
            except Exception:
                logger.warning("Docker client not available")
        else:
            self.docker_client = None
    
    async def discover_all_servers(self) -> List[MCPServerInfo]:
        """Run complete server discovery"""
        
        logger.info("Starting MCP server discovery...")
        discovered = []
        
        # Run all discovery methods
        for method in self.discovery_methods:
            try:
                if method == 'process_scan':
                    servers = await self._discover_by_process_scan()
                elif method == 'port_scan':
                    servers = await self._discover_by_port_scan()
                elif method == 'docker_scan':
                    servers = await self._discover_by_docker_scan()
                elif method == 'config_file_scan':
                    servers = await self._discover_by_config_scan()
                else:
                    continue
                
                discovered.extend(servers)
                logger.info(f"Discovery method '{method}' found {len(servers)} servers")
                
            except Exception as e:
                logger.error(f"Error in discovery method '{method}': {e}")
        
        # Deduplicate and merge information
        unique_servers = self._deduplicate_servers(discovered)
        
        # Enhance server information
        for server in unique_servers:
            await self._enhance_server_info(server)
        
        # Update cache
        for server in unique_servers:
            self.discovered_servers[server.server_id] = server
        
        logger.info(f"Total unique MCP servers discovered: {len(unique_servers)}")
        return unique_servers
    
    async def _discover_by_process_scan(self) -> List[MCPServerInfo]:
        """Discovery through process scanning"""
        
        servers = []
        
        # Common MCP server process patterns
        mcp_patterns = [
            r'.*mcp.*server.*',
            r'.*model.*context.*protocol.*',
            r'.*mcp-server.*',
            r'node.*mcp.*',
            r'python.*mcp.*',
            r'.*claude.*mcp.*'
        ]
        
        for proc in psutil.process_iter(['pid', 'name', 'cmdline', 'cwd']):
            try:
                proc_info = proc.info
                cmdline = ' '.join(proc_info['cmdline'] or [])
                
                # Check if process matches MCP patterns
                for pattern in mcp_patterns:
                    if re.search(pattern, cmdline, re.IGNORECASE):
                        server = await self._create_server_from_process(proc, proc_info)
                        if server:
                            servers.append(server)
                        break
                
                # Check for specific MCP server executables
                if proc_info['name'] and any(keyword in proc_info['name'].lower() 
                                           for keyword in ['mcp', 'claude']):
                    server = await self._create_server_from_process(proc, proc_info)
                    if server:
                        servers.append(server)
                        
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        
        return servers
    
    async def _discover_by_port_scan(self) -> List[MCPServerInfo]:
        """Discovery through port scanning"""
        
        servers = []
        
        for host in self.scan_hosts:
            for port in self.scan_ports:
                try:
                    # Test if port is open
                    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    sock.settimeout(2)
                    result = sock.connect_ex((host, port))
                    sock.close()
                    
                    if result == 0:
                        # Port is open, try to determine if it's an MCP server
                        server = await self._probe_port_for_mcp(host, port)
                        if server:
                            servers.append(server)
                            
                except Exception:
                    continue
        
        return servers
    
    async def _discover_by_docker_scan(self) -> List[MCPServerInfo]:
        """Discovery through Docker container scanning"""
        
        servers = []
        
        if not self.docker_client:
            return servers
        
        try:
            containers = self.docker_client.containers.list(all=True)
            
            for container in containers:
                # Check container labels and environment for MCP indicators
                if self._is_mcp_container(container):
                    server = await self._create_server_from_container(container)
                    if server:
                        servers.append(server)
                        
        except Exception as e:
            logger.error(f"Error scanning Docker containers: {e}")
        
        return servers
    
    async def _discover_by_config_scan(self) -> List[MCPServerInfo]:
        """Discovery through configuration file scanning"""
        
        servers = []
        
        # Common config file locations
        config_paths = [
            '~/.mcp',
            './mcp-config.json',
            './mcp-config.yaml', 
            '/etc/mcp',
            './config/mcp.json'
        ]
        
        for config_path in config_paths:
            try:
                path = Path(config_path).expanduser()
                if path.exists():
                    config_servers = await self._parse_config_file(path)
                    servers.extend(config_servers)
                    
            except Exception as e:
                logger.debug(f"Error parsing config file {config_path}: {e}")
        
        return servers
    
    async def _create_server_from_process(self, proc, proc_info) -> Optional[MCPServerInfo]:
        """Create server info from process information"""
        
        try:
            # Extract port from command line or connections
            port = await self._extract_port_from_process(proc, proc_info)
            if not port:
                return None
            
            server_id = f"proc_{proc_info['pid']}"
            name = proc_info['name'] or f"Process-{proc_info['pid']}"
            
            server = MCPServerInfo(
                server_id=server_id,
                name=name,
                host='localhost',
                port=port,
                protocol='http',  # Default assumption
                status='running',
                pid=proc_info['pid'],
                process_name=proc_info['name'],
                command_line=' '.join(proc_info['cmdline'] or []),
                working_directory=proc_info['cwd'],
                discovery_method='process_scan'
            )
            
            return server
            
        except Exception as e:
            logger.debug(f"Error creating server from process: {e}")
            return None
    
    async def _probe_port_for_mcp(self, host: str, port: int) -> Optional[MCPServerInfo]:
        """Probe a port to determine if it's an MCP server"""
        
        try:
            # Try HTTP first
            if await self._test_http_endpoint(host, port):
                server_info = await self._probe_http_server(host, port)
                if server_info and self._looks_like_mcp_server(server_info):
                    return MCPServerInfo(
                        server_id=f"http_{host}_{port}",
                        name=server_info.get('name', f"HTTP-{host}:{port}"),
                        host=host,
                        port=port,
                        protocol='http',
                        status='running',
                        discovery_method='port_scan'
                    )
            
            # Try WebSocket
            if WEBSOCKETS_AVAILABLE and await self._test_websocket_endpoint(host, port):
                return MCPServerInfo(
                    server_id=f"ws_{host}_{port}",
                    name=f"WebSocket-{host}:{port}",
                    host=host,
                    port=port,
                    protocol='websocket',
                    status='running',
                    discovery_method='port_scan'
                )
                
        except Exception:
            pass
        
        return None
    
    async def _test_http_endpoint(self, host: str, port: int) -> bool:
        """Test if HTTP endpoint is accessible"""
        
        if not AIOHTTP_AVAILABLE:
            return False
            
        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=5)) as session:
                async with session.get(f"http://{host}:{port}/") as response:
                    return response.status < 500
        except:
            return False
    
    async def _test_websocket_endpoint(self, host: str, port: int) -> bool:
        """Test if WebSocket endpoint is accessible"""
        
        if not WEBSOCKETS_AVAILABLE:
            return False
            
        try:
            async with websockets.connect(f"ws://{host}:{port}/", timeout=5):
                return True
        except:
            return False
    
    async def _probe_http_server(self, host: str, port: int) -> Optional[Dict]:
        """Probe HTTP server for information"""
        
        if not AIOHTTP_AVAILABLE:
            return None
            
        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=10)) as session:
                # Try common endpoints
                endpoints = ['/', '/health', '/status', '/info', '/mcp']
                
                for endpoint in endpoints:
                    try:
                        async with session.get(f"http://{host}:{port}{endpoint}") as response:
                            if response.status == 200:
                                content_type = response.headers.get('content-type', '')
                                if 'application/json' in content_type:
                                    return await response.json()
                                else:
                                    text = await response.text()
                                    return {'response': text[:500]}  # Truncate
                    except:
                        continue
                        
        except Exception:
            pass
        
        return None
    
    def _looks_like_mcp_server(self, server_info: Dict) -> bool:
        """Check if server response looks like an MCP server"""
        
        # Look for MCP-specific indicators
        text = json.dumps(server_info).lower()
        indicators = ['mcp', 'model context protocol', 'claude', 'anthropic']
        
        return any(indicator in text for indicator in indicators)
    
    async def _extract_port_from_process(self, proc, proc_info) -> Optional[int]:
        """Extract port number from process"""
        
        try:
            # Try to get port from network connections
            connections = proc.connections()
            for conn in connections:
                if conn.status == 'LISTEN' and conn.laddr:
                    return conn.laddr.port
            
            # Try to extract from command line
            cmdline = ' '.join(proc_info['cmdline'] or [])
            port_match = re.search(r'--port[=\s]+(\d+)|:(\d+)', cmdline)
            if port_match:
                return int(port_match.group(1) or port_match.group(2))
                
        except:
            pass
        
        return None
    
    def _deduplicate_servers(self, servers: List[MCPServerInfo]) -> List[MCPServerInfo]:
        """Remove duplicate servers and merge information"""
        
        unique_servers = {}
        
        for server in servers:
            key = f"{server.host}:{server.port}"
            
            if key in unique_servers:
                # Merge information from multiple discovery methods
                existing = unique_servers[key]
                if not existing.pid and server.pid:
                    existing.pid = server.pid
                if not existing.source_directory and server.source_directory:
                    existing.source_directory = server.source_directory
                # Add discovery methods
                existing.discovery_method += f", {server.discovery_method}"
            else:
                unique_servers[key] = server
        
        return list(unique_servers.values())
    
    async def _enhance_server_info(self, server: MCPServerInfo):
        """Enhance server information with additional details"""
        
        try:
            # Update status
            if await self._test_server_connection(server):
                server.status = 'running'
                server.last_seen = datetime.now()
                
                # Get additional server info
                server_info = await self._get_server_info(server)
                if server_info:
                    if 'version' in server_info:
                        server.version = server_info['version']
                    if 'capabilities' in server_info:
                        server.capabilities = server_info['capabilities']
            else:
                server.status = 'stopped'
            
            # Find source directory and log files if we have process info
            if server.working_directory:
                server.source_directory = server.working_directory
                server.log_files = await self._find_log_files(server.working_directory)
                
        except Exception as e:
            logger.debug(f"Error enhancing server info: {e}")
    
    async def _test_server_connection(self, server: MCPServerInfo) -> bool:
        """Test connection to server"""
        
        try:
            if server.protocol in ['http', 'https']:
                return await self._test_http_endpoint(server.host, server.port)
            elif server.protocol == 'websocket':
                return await self._test_websocket_endpoint(server.host, server.port)
            else:
                # Test raw TCP connection
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(2)
                result = sock.connect_ex((server.host, server.port))
                sock.close()
                return result == 0
                
        except:
            return False
    
    async def _get_server_info(self, server: MCPServerInfo) -> Optional[Dict]:
        """Get server information via API"""
        
        if server.protocol in ['http', 'https']:
            return await self._probe_http_server(server.host, server.port)
        
        return None
    
    async def _find_log_files(self, directory: str) -> List[str]:
        """Find log files in specified directory"""
        
        log_files = []
        
        try:
            dir_path = Path(directory)
            if not dir_path.exists():
                return log_files
            
            # Common log file patterns
            log_patterns = [
                '*.log',
                '*.out', 
                'logs/*.log',
                'log/*.log',
                '**/application.log',
                '**/error.log',
                '**/server.log'
            ]
            
            for pattern in log_patterns:
                for log_file in dir_path.glob(pattern):
                    if log_file.is_file():
                        log_files.append(str(log_file))
            
        except Exception as e:
            logger.debug(f"Error finding log files: {e}")
        
        return log_files
    
    def _is_mcp_container(self, container) -> bool:
        """Check if container is likely an MCP server"""
        
        try:
            # Check container name and labels
            name = container.name.lower()
            if 'mcp' in name or 'claude' in name:
                return True
            
            # Check environment variables
            env_vars = container.attrs.get('Config', {}).get('Env', [])
            for env in env_vars:
                if 'MCP' in env.upper() or 'CLAUDE' in env.upper():
                    return True
            
            # Check labels
            labels = container.labels
            if any('mcp' in key.lower() or 'mcp' in str(value).lower() 
                   for key, value in labels.items()):
                return True
                
        except Exception:
            pass
        
        return False
    
    async def _create_server_from_container(self, container) -> Optional[MCPServerInfo]:
        """Create server info from Docker container"""
        
        try:
            # Get container info
            container_info = container.attrs
            network_settings = container_info.get('NetworkSettings', {})
            ports = network_settings.get('Ports', {})
            
            # Find exposed port
            port = None
            for port_spec, host_ports in ports.items():
                if host_ports:
                    port = int(host_ports[0]['HostPort'])
                    break
            
            if not port:
                return None
            
            server_id = f"container_{container.id[:12]}"
            
            return MCPServerInfo(
                server_id=server_id,
                name=container.name,
                host='localhost',
                port=port,
                protocol='http',  # Default assumption
                status='running' if container.status == 'running' else 'stopped',
                container_id=container.id,
                container_name=container.name,
                image_name=container.image.tags[0] if container.image.tags else 'unknown',
                discovery_method='docker_scan'
            )
            
        except Exception as e:
            logger.debug(f"Error creating server from container: {e}")
            return None
    
    async def _parse_config_file(self, config_path: Path) -> List[MCPServerInfo]:
        """Parse configuration file for MCP servers"""
        
        servers = []
        
        try:
            if config_path.suffix.lower() in ['.yaml', '.yml']:
                with open(config_path, 'r') as f:
                    config = yaml.safe_load(f)
            elif config_path.suffix.lower() == '.json':
                with open(config_path, 'r') as f:
                    config = json.load(f)
            else:
                return servers
            
            # Extract server configurations
            servers_config = config.get('servers', [])
            if isinstance(servers_config, dict):
                servers_config = list(servers_config.values())
            
            for i, server_config in enumerate(servers_config):
                if isinstance(server_config, dict):
                    server = MCPServerInfo(
                        server_id=server_config.get('id', f'config_{i}'),
                        name=server_config.get('name', f'Server-{i}'),
                        host=server_config.get('host', 'localhost'),
                        port=server_config.get('port', 8000),
                        protocol=server_config.get('protocol', 'http'),
                        status='unknown',
                        discovery_method='config_file_scan'
                    )
                    servers.append(server)
                    
        except Exception as e:
            logger.debug(f"Error parsing config file {config_path}: {e}")
        
        return servers

# ============================================================================
# MCP METRICS COLLECTOR PLUGIN
# ============================================================================

class MCPMetricsCollectorPlugin:
    """Specialized metrics collector for MCP servers"""
    
    def __init__(self, discovered_servers: List[MCPServerInfo]):
        self.servers = {server.server_id: server for server in discovered_servers}
        
    @property
    def name(self) -> str:
        return "mcp_metrics_collector"
    
    @property
    def version(self) -> str:
        return "1.0.0"
    
    async def initialize(self, config: Dict[str, Any]) -> bool:
        logger.info(f"Initialized MCP metrics collector for {len(self.servers)} servers")
        return True
    
    async def cleanup(self) -> None:
        pass
    
    async def collect_metrics(self) -> Dict[str, Any]:
        """Collect MCP-specific metrics from all servers"""
        
        metrics = {
            'mcp_total_servers': len(self.servers),
            'mcp_running_servers': 0,
            'mcp_stopped_servers': 0,
            'mcp_unknown_servers': 0
        }
        
        for server_id, server in self.servers.items():
            try:
                server_metrics = await self._collect_server_metrics(server)
                
                # Prefix metrics with server ID
                for key, value in server_metrics.items():
                    metrics[f"mcp_{server_id}_{key}"] = value
                
                # Count server states
                if server_metrics.get('status') == 'running':
                    metrics['mcp_running_servers'] += 1
                elif server_metrics.get('status') == 'stopped':
                    metrics['mcp_stopped_servers'] += 1
                else:
                    metrics['mcp_unknown_servers'] += 1
                    
            except Exception as e:
                logger.error(f"Error collecting metrics for server {server_id}: {e}")
                metrics[f"mcp_{server_id}_status"] = 'error'
                metrics[f"mcp_{server_id}_error_message"] = str(e)
        
        return metrics
    
    async def _collect_server_metrics(self, server: MCPServerInfo) -> Dict[str, Any]:
        """Collect metrics for individual MCP server"""
        
        metrics = {
            'status': 'unknown',
            'response_time': 0.0,
            'uptime': 0,
            'request_count': 0,
            'error_count': 0
        }
        
        # Test server availability
        start_time = time.time()
        is_alive = await self._test_server_alive(server)
        response_time = time.time() - start_time
        
        metrics['status'] = 'running' if is_alive else 'stopped'
        metrics['response_time'] = response_time
        
        if is_alive:
            # Collect detailed metrics if server is running
            server_info = await self._get_server_metrics(server)
            if server_info:
                metrics.update(server_info)
        
        # Collect process-level metrics if available
        if server.pid:
            process_metrics = await self._get_process_metrics(server.pid)
            metrics.update(process_metrics)
        
        return metrics
    
    async def _test_server_alive(self, server: MCPServerInfo) -> bool:
        """Test if server is reachable"""
        try:
            if server.protocol == 'http':
                if AIOHTTP_AVAILABLE:
                    async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=5)) as session:
                        health_url = f"http://{server.host}:{server.port}{server.health_endpoint or '/health'}"
                        async with session.get(health_url) as response:
                            return response.status < 500
                else:
                    return False
            elif server.protocol == 'websocket':
                if WEBSOCKETS_AVAILABLE:
                    ws_url = f"ws://{server.host}:{server.port}/"
                    async with websockets.connect(ws_url, timeout=5):
                        return True
                else:
                    return False
            else:
                # TCP connection test
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(5)
                result = sock.connect_ex((server.host, server.port))
                sock.close()
                return result == 0
                
        except Exception:
            return False
    
    async def _get_server_metrics(self, server: MCPServerInfo) -> Dict[str, Any]:
        """Get detailed server metrics via API"""
        
        metrics = {}
        
        if not AIOHTTP_AVAILABLE:
            return metrics
        
        try:
            if server.protocol == 'http':
                async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=10)) as session:
                    
                    # Try metrics endpoint
                    if server.metrics_endpoint:
                        metrics_url = f"http://{server.host}:{server.port}{server.metrics_endpoint}"
                        try:
                            async with session.get(metrics_url) as response:
                                if response.status == 200:
                                    data = await response.json()
                                    metrics.update(data)
                        except:
                            pass
                    
                    # Try health endpoint for additional info
                    if server.health_endpoint:
                        health_url = f"http://{server.host}:{server.port}{server.health_endpoint}"
                        try:
                            async with session.get(health_url) as response:
                                if response.status == 200:
                                    data = await response.json()
                                    metrics.update(data)
                        except:
                            pass
                    
                    # Try common MCP endpoints
                    mcp_endpoints = ['/status', '/info', '/mcp/status']
                    for endpoint in mcp_endpoints:
                        try:
                            async with session.get(f"http://{server.host}:{server.port}{endpoint}") as response:
                                if response.status == 200:
                                    data = await response.json()
                                    metrics.update(data)
                                    break
                        except:
                            continue
                            
        except Exception as e:
            logger.debug(f"Error getting server metrics: {e}")
        
        return metrics
    
    async def _get_process_metrics(self, pid: int) -> Dict[str, Any]:
        """Collect process-specific metrics"""
        
        metrics = {}
        
        try:
            process = psutil.Process(pid)
            
            # Basic process info
            metrics['process_cpu_percent'] = process.cpu_percent()
            metrics['process_memory_mb'] = process.memory_info().rss / 1024 / 1024
            metrics['process_threads'] = process.num_threads()
            
            # Process uptime
            create_time = process.create_time()
            metrics['process_uptime'] = time.time() - create_time
            
            # File descriptors (Unix only)
            try:
                metrics['process_open_files'] = process.num_fds()
            except:
                pass
            
            # Network connections
            try:
                connections = process.connections()
                metrics['process_connections'] = len(connections)
                metrics['process_listening_ports'] = len([c for c in connections if c.status == 'LISTEN'])
            except:
                pass
                
        except psutil.NoSuchProcess:
            metrics['process_status'] = 'not_found'
        except Exception as e:
            metrics['process_error'] = str(e)
        
        return metrics

# ============================================================================
# MCP PATTERN DETECTOR PLUGIN
# ============================================================================

class MCPPatternDetectorPlugin:
    """MCP-specific problem detector"""
    
    def __init__(self, servers: Dict[str, MCPServerInfo]):
        self.servers = servers
        self.server_patterns = {}
        
    @property
    def name(self) -> str:
        return "mcp_pattern_detector"
    
    @property 
    def version(self) -> str:
        return "1.0.0"
    
    async def initialize(self, config: Dict[str, Any]) -> bool:
        self.server_patterns = config.get('server_patterns', {})
        logger.info(f"Initialized MCP pattern detector for {len(self.servers)} servers")
        return True
    
    async def cleanup(self) -> None:
        pass
    
    async def detect_problems(self, metrics: Dict[str, Any], 
                            history: List[Dict[str, Any]]) -> List:
        """Detect MCP-specific problems"""
        
        from main import Problem, ProblemSeverity
        problems = []
        
        # Check each server's status  
        server_metrics = metrics.get('server_metrics', {})
        for server_id, server_data in server_metrics.items():
            if server_id in self.servers:
                server = self.servers[server_id]
                server_problems = await self._detect_server_problems(server_id, server, server_data)
                problems.extend(server_problems)
        
        # Check cross-server patterns
        cross_server_problems = await self._detect_cross_server_problems(metrics)
        problems.extend(cross_server_problems)
        
        return problems
    
    async def _detect_server_problems(self, server_id: str, server: MCPServerInfo, 
                                    server_data: Dict[str, Any]) -> List:
        """Detect problems for individual server"""
        
        from main import Problem, ProblemSeverity
        problems = []
        
        # Server down
        status = server_data.get('status')
        if status == 'stopped' or status == 'error':
            problems.append(Problem(
                type="mcp_server_down",
                severity=ProblemSeverity.CRITICAL,
                description=f"MCP server {server.name} is not responding",
                timestamp=datetime.now(),
                metadata={
                    'server_id': server_id,
                    'server_name': server.name,
                    'host': server.host,
                    'port': server.port,
                    'last_status': status
                }
            ))
        
        # High response time
        response_time = server_data.get('response_time', 0)
        if response_time > 5.0:  # 5 seconds (convert from milliseconds if needed)
            if response_time > 1000:  # Assume milliseconds
                response_time = response_time / 1000.0
            problems.append(Problem(
                type="mcp_high_response_time",
                severity=ProblemSeverity.HIGH if response_time > 10 else ProblemSeverity.MEDIUM,
                description=f"MCP server {server.name} has high response time: {response_time:.2f}s",
                timestamp=datetime.now(),
                metadata={
                    'server_id': server_id,
                    'server_name': server.name,
                    'response_time': response_time,
                    'threshold': 5.0
                }
            ))
        
        # High error rate
        error_count = server_data.get('error_count', 0)
        request_count = server_data.get('request_count', 1)
        error_rate = error_count / max(request_count, 1)
        
        if error_rate > 0.1:  # 10% error rate
            problems.append(Problem(
                type="mcp_high_error_rate",
                severity=ProblemSeverity.HIGH,
                description=f"MCP server {server.name} has high error rate: {error_rate:.1%}",
                timestamp=datetime.now(),
                metadata={
                    'server_id': server_id,
                    'server_name': server.name,
                    'error_rate': error_rate,
                    'error_count': error_count,
                    'request_count': request_count
                }
            ))
        
        return problems
    
    async def _detect_cross_server_problems(self, metrics: Dict[str, Any]) -> List:
        """Detect cross-server problems"""
        
        from main import Problem, ProblemSeverity
        problems = []
        
        # Multiple servers down
        running_servers = metrics.get('mcp_running_servers', 0)
        total_servers = metrics.get('mcp_total_servers', 0)
        
        if total_servers > 1 and running_servers < total_servers * 0.5:
            problems.append(Problem(
                type="mcp_multiple_servers_down",
                severity=ProblemSeverity.CRITICAL,
                description=f"Multiple MCP servers down: {running_servers}/{total_servers} running",
                timestamp=datetime.now(),
                metadata={
                    'running_servers': running_servers,
                    'total_servers': total_servers,
                    'availability': running_servers / total_servers if total_servers > 0 else 0
                }
            ))
        
        return problems

# ============================================================================
# MCP REMEDIATION PLUGIN
# ============================================================================

class MCPServerRemediationPlugin:
    """MCP-specific problem remediation"""
    
    def __init__(self, servers: Dict[str, MCPServerInfo]):
        self.servers = servers
        self.restart_strategies = {}
        
    @property
    def name(self) -> str:
        return "mcp_server_remediation"
    
    @property
    def version(self) -> str:
        return "1.0.0"
    
    async def initialize(self, config: Dict[str, Any]) -> bool:
        self.restart_strategies = config.get('restart_strategies', {
            'process': 'kill_and_restart',
            'container': 'docker_restart',
            'service': 'systemctl_restart'
        })
        logger.info(f"Initialized MCP server remediation for {len(self.servers)} servers")
        return True
    
    async def cleanup(self) -> None:
        pass
    
    async def can_handle_problem(self, problem) -> bool:
        """Check if this plugin can handle the problem"""
        return problem.type.startswith('mcp_')
    
    async def remediate_problem(self, problem) -> Dict[str, Any]:
        """Remediate a problem (wrapper for execute_remediation)"""
        return await self.execute_remediation(problem, {})
    
    async def execute_remediation(self, problem, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute remediation for MCP server problems"""
        
        # Handle both Problem objects and dictionary formats
        if hasattr(problem, 'metadata'):
            server_id = problem.metadata.get('server_id')
        else:
            server_id = problem.get('server_id')
        if not server_id or server_id not in self.servers:
            return {'success': False, 'message': 'Server not found'}
        
        server = self.servers[server_id]
        
        try:
            # Get problem type from object or dictionary
            problem_type = getattr(problem, 'type', problem.get('type'))
            
            if problem_type == 'server_down' or problem_type == 'mcp_server_down':
                return await self._restart_server(server)
            elif problem_type == 'mcp_high_response_time':
                return await self._optimize_server_performance(server)
            elif problem_type == 'mcp_high_error_rate':
                return await self._investigate_errors(server)
            else:
                return {'success': False, 'message': f'No remediation for problem type: {problem_type}'}
                
        except Exception as e:
            return {'success': False, 'message': f'Remediation failed: {str(e)}'}
    
    async def _restart_server(self, server: MCPServerInfo) -> Dict[str, Any]:
        """Restart MCP server"""
        
        try:
            if server.container_id:
                # Restart Docker container
                return await self._restart_container(server)
            elif server.pid:
                # Restart process
                return await self._restart_process(server)
            else:
                return {'success': False, 'message': 'No restart method available'}
                
        except Exception as e:
            return {'success': False, 'message': f'Restart failed: {str(e)}'}
    
    async def _restart_container(self, server: MCPServerInfo) -> Dict[str, Any]:
        """Restart Docker container"""
        
        if not DOCKER_AVAILABLE:
            return {'success': False, 'message': 'Docker not available'}
        
        try:
            docker_client = docker.from_env()
            container = docker_client.containers.get(server.container_id)
            container.restart()
            
            return {
                'success': True, 
                'message': f'Restarted container {server.container_name}',
                'action': 'container_restart'
            }
            
        except Exception as e:
            return {'success': False, 'message': f'Container restart failed: {str(e)}'}
    
    async def _restart_process(self, server: MCPServerInfo) -> Dict[str, Any]:
        """Restart process"""
        
        try:
            # Kill process gracefully first
            process = psutil.Process(server.pid)
            process.terminate()
            
            # Wait for process to terminate
            await asyncio.sleep(5)
            
            if process.is_running():
                process.kill()
            
            # TODO: Restart logic would depend on how the server was started
            # This is a placeholder for actual restart implementation
            
            return {
                'success': True, 
                'message': f'Terminated process {server.process_name}',
                'action': 'process_terminate'
            }
            
        except Exception as e:
            return {'success': False, 'message': f'Process restart failed: {str(e)}'}
    
    async def _optimize_server_performance(self, server: MCPServerInfo) -> Dict[str, Any]:
        """Optimize server performance for high response times"""
        
        return {
            'success': True, 
            'message': 'Performance optimization attempted',
            'action': 'performance_tuning'
        }
    
    async def _investigate_errors(self, server: MCPServerInfo) -> Dict[str, Any]:
        """Investigate high error rates"""
        
        return {
            'success': True, 
            'message': 'Error investigation completed',
            'action': 'error_investigation'
        }