#!/usr/bin/env python3
"""
Intelligent Monitoring Framework - Python Prototype
Ein erweiterbares, lernfähiges Framework für Server-Monitoring mit Log-Analyse

🚀 ENHANCED FOR COMPLETE DEVELOPMENT ENVIRONMENT
Provides full monitoring capabilities with FastAPI server integration
"""

import asyncio
import logging
import json
import re
import time
import os
import sys
from abc import ABC, abstractmethod
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Pattern
from collections import defaultdict, deque, Counter
from pathlib import Path
import yaml
import psutil
import hashlib
from enum import Enum

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Conditional import for code analysis
try:
    from code_analysis_plugin import (
        CodeAnalysisPlugin, 
        CodeFixRemediationPlugin, 
        LogToCodeMapperPlugin
    )
    CODE_ANALYSIS_AVAILABLE = True
except ImportError:
    logger.warning("Code analysis plugins not available. Install dependencies to enable code analysis.")
    CODE_ANALYSIS_AVAILABLE = False

# Conditional import for MCP monitoring
try:
    from mcp_monitoring_plugin import (
        MCPServerDiscovery,
        MCPMetricsCollectorPlugin,
        MCPPatternDetectorPlugin, 
        MCPServerRemediationPlugin
    )
    MCP_MONITORING_AVAILABLE = True
except ImportError:
    logger.warning("MCP monitoring plugins not available. Install dependencies to enable MCP monitoring.")
    MCP_MONITORING_AVAILABLE = False

# ============================================================================
# JSON Serializer for datetime objects
# ============================================================================

class DateTimeEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, datetime):
            return o.isoformat()
        return super().default(o)

# ============================================================================
# CORE FRAMEWORK CLASSES
# ============================================================================

class ProblemSeverity(Enum):
    LOW = 1
    MEDIUM = 2
    HIGH = 3
    CRITICAL = 4

@dataclass
class FrameworkConfig:
    """Framework Konfiguration mit AI und Deployment"""
    server_type: str = "generic"
    monitoring_interval: int = 30
    learning_enabled: bool = True
    auto_remediation: bool = True
    log_level: str = "INFO"
    data_dir: str = "./data"
    plugin_dirs: List[str] = field(default_factory=lambda: ["plugins"])
    
    # Code Analysis Configuration
    code_analysis_enabled: bool = False
    source_directories: List[str] = field(default_factory=list)
    auto_fix_enabled: bool = False
    confidence_threshold: float = 0.7
    backup_directory: str = "./backups"
    
    # AI Learning Configuration
    ai_learning_enabled: bool = False
    ai_model_dir: str = "./ai_models"
    ai_min_confidence: float = 0.75
    ai_max_risk_score: float = 0.3
    ai_min_success_probability: float = 0.8
    ai_max_deployments_per_hour: int = 2
    ai_require_approval: bool = True
    ai_learning_rate: float = 0.1
    ai_retrain_frequency: int = 50
    
    # Deployment Configuration
    deployment_enabled: bool = False
    git_repo_path: str = "."
    use_docker: bool = True
    use_kubernetes: bool = False
    deployment_strategies: Dict[str, str] = field(default_factory=lambda: {
        "low_risk": "direct_deployment",
        "medium_risk": "canary_deployment", 
        "high_risk": "blue_green_deployment"
    })
    test_commands: List[str] = field(default_factory=lambda: [
        "python -m pytest tests/ -v",
        "python -m flake8 src/",
        "python -m mypy src/ --ignore-missing-imports"
    ])
    docker_image_name: str = "mcp-server"
    k8s_deployment_name: str = "mcp-server-deployment"
    k8s_namespace: str = "production"
    restart_command: str = "sudo systemctl restart mcp-server"
    rollback_timeout: int = 300
    
    # Safety and Monitoring Configuration
    business_hours_restriction: bool = True
    max_concurrent_deployments: int = 1
    monitoring_period: int = 600  # 10 minutes post-deployment
    auto_rollback_triggers: Dict[str, float] = field(default_factory=lambda: {
        "error_rate_increase": 0.5,
        "response_time_increase": 1.0,
        "availability_drop": 0.05
    })
    emergency_contacts: List[str] = field(default_factory=lambda: ["devops@company.com", "oncall@company.com"])
    
    # Enhanced Plugin Configuration
    plugin_config: Dict[str, Any] = field(default_factory=lambda: {
        "metrics_collectors": [
            {"name": "system_metrics_collector", "config": {}},
            {"name": "log_file_collector", "config": {"log_files": []}}
        ],
        "problem_detectors": [
            {"name": "threshold_detector", "config": {"thresholds": {}}},
            {"name": "log_pattern_detector", "config": {"custom_patterns": []}},
            {"name": "code_analysis_detector", "config": {}}
        ],
        "remediators": [
            {"name": "system_remediation", "config": {"allowed_actions": []}},
            {"name": "code_fix_remediation", "config": {}},
            {"name": "ai_code_fixing", "config": {}}
        ],
        "notifiers": [
            {"name": "slack_notifier", "config": {}},
            {"name": "email_notifier", "config": {}}
        ]
    })

@dataclass
class LogEntry:
    """Log-Eintrag Datenstruktur"""
    timestamp: datetime
    level: str
    message: str
    source: str
    raw_line: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        data = asdict(self)
        data['timestamp'] = self.timestamp.isoformat()
        return data

@dataclass
class Problem:
    """Erkanntes Problem"""
    type: str
    severity: ProblemSeverity
    description: str
    timestamp: datetime
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        data = asdict(self)
        data['severity'] = self.severity.name
        data['timestamp'] = self.timestamp.isoformat()
        return data

# ============================================================================
# PLUGIN INTERFACES
# ============================================================================

class PluginInterface(ABC):
    """Basis-Interface für alle Plugins"""
    
    @property
    @abstractmethod
    def name(self) -> str:
        pass
    
    @property
    @abstractmethod
    def version(self) -> str:
        pass
    
    @abstractmethod
    async def initialize(self, config: Dict[str, Any]) -> bool:
        pass
    
    @abstractmethod
    async def cleanup(self) -> None:
        pass

class MetricsCollectorPlugin(PluginInterface):
    """Interface für Metriken-Sammler"""
    
    @abstractmethod
    async def collect_metrics(self) -> Dict[str, Any]:
        pass

class ProblemDetectorPlugin(PluginInterface):
    """Interface für Problem-Erkennung"""
    
    @abstractmethod
    async def detect_problems(self, metrics: Dict[str, Any], 
                            history: List[Dict[str, Any]]) -> List[Problem]:
        pass

class RemediationPlugin(PluginInterface):
    """Interface für automatische Problemlösung"""
    
    @abstractmethod
    async def can_handle_problem(self, problem: Problem) -> bool:
        pass
    
    @abstractmethod
    async def execute_remediation(self, problem: Problem, 
                                context: Dict[str, Any]) -> Dict[str, Any]:
        pass

# ============================================================================
# LOG MONITORING PLUGINS
# ============================================================================

class LogFileCollectorPlugin(MetricsCollectorPlugin):
    """Sammelt und analysiert Log-Files"""
    
    def __init__(self):
        self.log_files = []
        self.log_buffer = deque(maxlen=1000)
        self.file_positions = {}
        
    @property
    def name(self) -> str:
        return "log_file_collector"
    
    @property
    def version(self) -> str:
        return "1.0.0"
    
    async def initialize(self, config: Dict[str, Any]) -> bool:
        self.log_files = config.get('log_files', [])
        logger.info(f"Initialized log collector with {len(self.log_files)} files")
        
        # Initialize file positions
        for log_file in self.log_files:
            path = Path(log_file['path'])
            if path.exists():
                self.file_positions[log_file['path']] = path.stat().st_size
            else:
                logger.warning(f"Log file not found: {log_file['path']}")
        
        return True
    
    async def cleanup(self) -> None:
        pass
    
    async def collect_metrics(self) -> Dict[str, Any]:
        """Sammelt Log-basierte Metriken"""
        metrics = {
            'log_collector_active': True,
            'log_files_monitored': len(self.log_files)
        }
        
        total_new_entries = 0
        error_count = 0
        warning_count = 0
        
        for log_file_config in self.log_files:
            try:
                new_entries = await self._process_log_file(log_file_config)
                total_new_entries += len(new_entries)
                
                # Count by level
                for entry in new_entries:
                    if entry.level == 'ERROR':
                        error_count += 1
                    elif entry.level == 'WARNING':
                        warning_count += 1
                    
                    self.log_buffer.append(entry)
                
            except Exception as e:
                logger.error(f"Error processing {log_file_config['path']}: {e}")
        
        metrics.update({
            'log_new_entries': total_new_entries,
            'log_error_count': error_count,
            'log_warning_count': warning_count,
            'log_buffer_size': len(self.log_buffer)
        })
        
        return metrics
    
    async def _process_log_file(self, log_config: Dict[str, Any]) -> List[LogEntry]:
        """Verarbeitet einzelne Log-Datei"""
        log_path = log_config['path']
        log_type = log_config.get('type', 'generic')
        
        if not Path(log_path).exists():
            return []
        
        new_lines = await self._read_new_lines(log_path)
        entries = []
        
        for line in new_lines:
            entry = await self._parse_log_line(line, log_type)
            if entry:
                entries.append(entry)
        
        return entries
    
    async def _read_new_lines(self, log_path: str) -> List[str]:
        """Liest nur neue Zeilen seit letztem Check"""
        path = Path(log_path)
        current_size = path.stat().st_size
        last_position = self.file_positions.get(log_path, 0)
        
        if current_size <= last_position:
            # File rotated oder kleiner
            last_position = 0
        
        new_lines = []
        try:
            with open(log_path, 'r', encoding='utf-8', errors='ignore') as f:
                f.seek(last_position)
                content = f.read()
                if content.strip():
                    new_lines = content.strip().split('\n')
            
            self.file_positions[log_path] = current_size
            
        except Exception as e:
            logger.error(f"Error reading {log_path}: {e}")
        
        return new_lines
    
    async def _parse_log_line(self, line: str, log_type: str) -> Optional[LogEntry]:
        """Parst Log-Zeile basierend auf Typ"""
        
        if not line.strip():
            return None
        
        # JSON Format
        if line.strip().startswith('{'):
            try:
                data = json.loads(line)
                timestamp = self._parse_timestamp(
                    data.get('timestamp', data.get('time', ''))
                )
                return LogEntry(
                    timestamp=timestamp,
                    level=data.get('level', 'INFO').upper(),
                    message=data.get('message', data.get('msg', '')),
                    source=log_type,
                    raw_line=line,
                    metadata=data
                )
            except json.JSONDecodeError:
                pass
        
        # Standard Log Format: "YYYY-MM-DD HH:MM:SS LEVEL MESSAGE"
        standard_pattern = re.compile(
            r'(?P<timestamp>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}[^\s]*)\s+'
            r'(?P<level>DEBUG|INFO|WARN|WARNING|ERROR|FATAL)\s+'
            r'(?P<message>.*)'
        )
        
        match = standard_pattern.match(line)
        if match:
            timestamp = self._parse_timestamp(match.group('timestamp'))
            return LogEntry(
                timestamp=timestamp,
                level=match.group('level'),
                message=match.group('message'),
                source=log_type,
                raw_line=line
            )
        
        # Fallback: Generic parsing
        return LogEntry(
            timestamp=datetime.now(),
            level='INFO',
            message=line,
            source=log_type,
            raw_line=line
        )
    
    def _parse_timestamp(self, timestamp_str: str) -> datetime:
        """Parst Timestamp-String"""
        if not timestamp_str:
            return datetime.now()
        
        formats = [
            '%Y-%m-%d %H:%M:%S',
            '%Y-%m-%dT%H:%M:%S.%fZ',
            '%Y-%m-%dT%H:%M:%SZ',
            '%Y-%m-%d %H:%M:%S.%f'
        ]
        
        for fmt in formats:
            try:
                return datetime.strptime(timestamp_str.replace('Z', ''), fmt.replace('Z', ''))
            except ValueError:
                continue
        
        return datetime.now()

class LogPatternDetectorPlugin(ProblemDetectorPlugin):
    """Erkennt Probleme basierend auf Log-Mustern"""
    
    def __init__(self):
        self.patterns = []
        self.log_collector = None
        
    @property
    def name(self) -> str:
        return "log_pattern_detector"
    
    @property
    def version(self) -> str:
        return "1.0.0"
    
    async def initialize(self, config: Dict[str, Any]) -> bool:
        self._load_default_patterns()
        
        # Custom patterns aus config
        custom_patterns = config.get('custom_patterns', [])
        for pattern_config in custom_patterns:
            self.patterns.append({
                'name': pattern_config['name'],
                'pattern': re.compile(pattern_config['regex'], re.IGNORECASE),
                'severity': ProblemSeverity[pattern_config['severity'].upper()],
                'description': pattern_config['description']
            })
        
        logger.info(f"Loaded {len(self.patterns)} log patterns")
        return True
    
    async def cleanup(self) -> None:
        pass
    
    def _load_default_patterns(self):
        """Lädt Standard-Problemmuster"""
        default_patterns = [
            {
                'name': 'database_connection_error',
                'pattern': re.compile(r'(connection.*refused|could not connect|timeout.*database)', re.IGNORECASE),
                'severity': ProblemSeverity.CRITICAL,
                'description': 'Database connection issues detected'
            },
            {
                'name': 'out_of_memory',
                'pattern': re.compile(r'(out of memory|outofmemoryerror|memory allocation failed)', re.IGNORECASE),
                'severity': ProblemSeverity.CRITICAL,
                'description': 'Memory exhaustion detected'
            },
            {
                'name': 'authentication_failure',
                'pattern': re.compile(r'(auth.*failed|unauthorized|access denied|login.*failed)', re.IGNORECASE),
                'severity': ProblemSeverity.MEDIUM,
                'description': 'Authentication failures detected'
            },
            {
                'name': 'api_timeout',
                'pattern': re.compile(r'(timeout|request.*timed out|connection timeout)', re.IGNORECASE),
                'severity': ProblemSeverity.MEDIUM,
                'description': 'API timeout issues detected'
            }
        ]
        self.patterns.extend(default_patterns)
    
    async def detect_problems(self, metrics: Dict[str, Any], 
                            history: List[Dict[str, Any]]) -> List[Problem]:
        """Erkennt Probleme in Log-Daten"""
        problems = []
        
        # Get log collector from framework (simplified for prototype)
        if not self.log_collector:
            return problems
        
        recent_logs = list(self.log_collector.log_buffer)
        if not recent_logs:
            return problems
        
        # Pattern-basierte Erkennung
        pattern_matches = defaultdict(list)
        
        # Check recent logs (last 10 minutes)
        recent_threshold = datetime.now() - timedelta(minutes=10)
        
        for entry in recent_logs:
            if entry.timestamp < recent_threshold:
                continue
                
            for pattern in self.patterns:
                if (pattern['pattern'].search(entry.message) or 
                    pattern['pattern'].search(entry.raw_line)):
                    pattern_matches[pattern['name']].append(entry)
        
        # Create problems for matched patterns
        for pattern_name, matches in pattern_matches.items():
            if matches:
                pattern = next(p for p in self.patterns if p['name'] == pattern_name)
                
                problem = Problem(
                    type=f"log_pattern_{pattern_name}",
                    severity=pattern['severity'],
                    description=f"{pattern['description']} ({len(matches)} occurrences)",
                    timestamp=datetime.now(),
                    metadata={
                        'pattern_name': pattern_name,
                        'match_count': len(matches),
                        'sample_messages': [m.message for m in matches[:3]]
                    }
                )
                problems.append(problem)
        
        # Frequency-based detection
        recent_errors = [
            entry for entry in recent_logs 
            if entry.timestamp > recent_threshold and entry.level in ['ERROR', 'FATAL']
        ]
        
        if len(recent_errors) > 20:  # More than 20 errors in 10 minutes
            problem = Problem(
                type="log_error_frequency_high",
                severity=ProblemSeverity.HIGH if len(recent_errors) > 50 else ProblemSeverity.MEDIUM,
                description=f"High error frequency: {len(recent_errors)} errors in 10 minutes",
                timestamp=datetime.now(),
                metadata={'error_count': len(recent_errors)}
            )
            problems.append(problem)
        
        return problems
    
    def set_log_collector(self, collector):
        """Set reference to log collector (for prototype)"""
        self.log_collector = collector

# ============================================================================
# SYSTEM MONITORING PLUGINS
# ============================================================================

class SystemMetricsCollectorPlugin(MetricsCollectorPlugin):
    """Sammelt System-Metriken"""
    
    @property
    def name(self) -> str:
        return "system_metrics_collector"
    
    @property
    def version(self) -> str:
        return "1.0.0"
    
    async def initialize(self, config: Dict[str, Any]) -> bool:
        logger.info("Initialized system metrics collector")
        return True
    
    async def cleanup(self) -> None:
        pass
    
    async def collect_metrics(self) -> Dict[str, Any]:
        """Sammelt System-Metriken"""
        errors: Dict[str, str] = {}
        metrics: Dict[str, Any] = { 'timestamp': time.time() }

        def safe(name: str, fn):
            try:
                return fn()
            except Exception as e:  # noqa: BLE001 - want to capture all metric failures individually
                # Store only lightweight error info (exception class and message)
                errors[name] = f"{e.__class__.__name__}: {e}".strip()
                return None

        # Use non-blocking cpu_percent (interval=0) to avoid 1s delay in async loop;
        # first call may return 0.0 which is acceptable.
        metrics['cpu_usage'] = safe('cpu_usage', lambda: psutil.cpu_percent(interval=0))
        metrics['memory_usage'] = safe('memory_usage', lambda: psutil.virtual_memory().percent)
        metrics['disk_usage'] = safe('disk_usage', lambda: psutil.disk_usage('/').percent)
        metrics['load_average'] = safe('load_average', lambda: os.getloadavg()[0] if hasattr(os, 'getloadavg') else 0)
        # net_connections can raise AccessDenied on some systems without privileges; fall back gracefully
        metrics['network_connections'] = safe('network_connections', lambda: len(psutil.net_connections(kind='inet')))
        metrics['processes'] = safe('processes', lambda: len(psutil.pids()))

        if errors:
            # Log once per collection cycle with aggregated errors to reduce noise
            logger.warning(f"Partial system metrics collected with {len(errors)} error(s): {errors}")
            metrics['errors'] = errors

        # If everything failed, keep backward-compatible error shape
        if all(v is None for k, v in metrics.items() if k != 'timestamp' and k != 'errors'):
            logger.error(f"Error collecting system metrics: all metrics failed -> {errors}")
            return {'system_metrics_error': errors}

        return metrics

class ThresholdDetectorPlugin(ProblemDetectorPlugin):
    """Schwellenwert-basierte Problem-Erkennung"""
    
    def __init__(self):
        self.thresholds = {}
        
    @property
    def name(self) -> str:
        return "threshold_detector"
    
    @property
    def version(self) -> str:
        return "1.0.0"
    
    async def initialize(self, config: Dict[str, Any]) -> bool:
        self.thresholds = config.get('thresholds', {
            'cpu_usage': {'warning': 80, 'critical': 95},
            'memory_usage': {'warning': 85, 'critical': 95},
            'disk_usage': {'warning': 85, 'critical': 95}
        })
        logger.info(f"Initialized threshold detector with {len(self.thresholds)} thresholds")
        return True
    
    async def cleanup(self) -> None:
        pass
    
    async def detect_problems(self, metrics: Dict[str, Any], 
                            history: List[Dict[str, Any]]) -> List[Problem]:
        """Erkennt Probleme basierend auf Schwellenwerten"""
        problems = []
        
        for metric_name, value in metrics.items():
            if metric_name in self.thresholds and isinstance(value, (int, float)):
                thresholds = self.thresholds[metric_name]
                
                if value >= thresholds['critical']:
                    problem = Problem(
                        type=f"{metric_name}_critical",
                        severity=ProblemSeverity.CRITICAL,
                        description=f"{metric_name} is critically high: {value}%",
                        timestamp=datetime.now(),
                        metadata={'metric': metric_name, 'value': value, 'threshold': thresholds['critical']}
                    )
                    problems.append(problem)
                    
                elif value >= thresholds['warning']:
                    problem = Problem(
                        type=f"{metric_name}_warning",
                        severity=ProblemSeverity.MEDIUM,
                        description=f"{metric_name} is above warning threshold: {value}%",
                        timestamp=datetime.now(),
                        metadata={'metric': metric_name, 'value': value, 'threshold': thresholds['warning']}
                    )
                    problems.append(problem)
        
        return problems

# ============================================================================
# REMEDIATION PLUGINS
# ============================================================================

class SystemRemediationPlugin(RemediationPlugin):
    """System-Level Problemlösungen"""
    
    def __init__(self):
        self.allowed_actions = []
        
    @property
    def name(self) -> str:
        return "system_remediation"
    
    @property
    def version(self) -> str:
        return "1.0.0"
    
    async def initialize(self, config: Dict[str, Any]) -> bool:
        self.allowed_actions = config.get('allowed_actions', [
            'clear_cache', 'log_rotation', 'process_restart'
        ])
        logger.info(f"Initialized system remediation with actions: {self.allowed_actions}")
        return True
    
    async def cleanup(self) -> None:
        pass
    
    async def can_handle_problem(self, problem: Problem) -> bool:
        """Prüft ob Problem behandelt werden kann"""
        return any(keyword in problem.type for keyword in ['cpu', 'memory', 'disk', 'system'])
    
    async def execute_remediation(self, problem: Problem, 
                                context: Dict[str, Any]) -> Dict[str, Any]:
        """Führt Problemlösung aus"""
        actions_taken = []
        
        try:
            if 'memory' in problem.type:
                actions_taken.extend(await self._handle_memory_problem(problem))
            elif 'cpu' in problem.type:
                actions_taken.extend(await self._handle_cpu_problem(problem))
            elif 'disk' in problem.type:
                actions_taken.extend(await self._handle_disk_problem(problem))
            
            return {
                'success': True,
                'actions_taken': actions_taken,
                'message': f"Problem handled with actions: {actions_taken}"
            }
            
        except Exception as e:
            logger.error(f"Remediation failed: {e}")
            return {
                'success': False,
                'actions_taken': actions_taken,
                'error': str(e)
            }
    
    async def _handle_memory_problem(self, problem: Problem) -> List[str]:
        """Behandelt Speicherprobleme"""
        actions = []
        
        if 'clear_cache' in self.allowed_actions:
            # Simulate cache clearing
            logger.info("Simulating memory cache clearing")
            actions.append('cleared_system_cache')
        
        return actions
    
    async def _handle_cpu_problem(self, problem: Problem) -> List[str]:
        """Behandelt CPU-Probleme"""
        actions = []
        
        if 'process_restart' in self.allowed_actions:
            # Simulate process management
            logger.info("Simulating CPU optimization")
            actions.append('optimized_cpu_usage')
        
        return actions
    
    async def _handle_disk_problem(self, problem: Problem) -> List[str]:
        """Behandelt Disk-Probleme"""
        actions = []
        
        if 'log_rotation' in self.allowed_actions:
            # Simulate log rotation
            logger.info("Simulating log rotation")
            actions.append('rotated_logs')
        
        return actions

# ============================================================================
# MAIN FRAMEWORK CLASS
# ============================================================================

class IntelligentMonitoringFramework:
    """Hauptklasse des Monitoring Frameworks"""
    
    def __init__(self, config_path: str = "config.yaml"):
        self.config_path = config_path
        self.config = None
        self.plugins = {
            'collectors': {},
            'detectors': {},
            'remediators': {}
        }
        self.metrics_history = deque(maxlen=1000)
        self.is_running = False
        
    async def initialize(self):
        """Initialisiert das Framework"""
        logger.info("Initializing Intelligent Monitoring Framework...")
        
        # Load configuration
        await self._load_config()
        
        # Register default plugins
        await self._register_default_plugins()
        
        # Initialize all plugins
        await self._initialize_plugins()
        
        logger.info("Framework initialization complete")
    
    async def _load_config(self):
        """Lädt Konfiguration aus YAML-Datei"""
        try:
            if Path(self.config_path).exists():
                with open(self.config_path, 'r') as f:
                    config_data = yaml.safe_load(f)
                    self.config = FrameworkConfig(**{k: v for k, v in config_data.items() if k in FrameworkConfig.__dataclass_fields__})
            else:
                self.config = FrameworkConfig()
                logger.warning(f"Config file {self.config_path} not found, using defaults")
        except Exception as e:
            logger.error(f"Error loading config: {e}")
            self.config = FrameworkConfig()
    
    async def _register_default_plugins(self):
        """Registriert Standard-Plugins"""
        # Collectors
        await self._register_plugin(SystemMetricsCollectorPlugin(), 'collectors')
        await self._register_plugin(LogFileCollectorPlugin(), 'collectors')
        
        # Detectors
        await self._register_plugin(LogPatternDetectorPlugin(), 'detectors')
        await self._register_plugin(ThresholdDetectorPlugin(), 'detectors')
        
        # Remediators
        await self._register_plugin(SystemRemediationPlugin(), 'remediators')
        
        # Code Analysis Plugins (conditional)
        if CODE_ANALYSIS_AVAILABLE and self.config and self.config.code_analysis_enabled:
            try:
                from code_analysis_plugin import (
                    CodeAnalysisPlugin, 
                    CodeFixRemediationPlugin, 
                    LogToCodeMapperPlugin
                )
                
                # Register code analysis plugins
                await self._register_plugin(CodeAnalysisPlugin(source_directories=[]), 'collectors')
                await self._register_plugin(CodeFixRemediationPlugin(source_directories=[]), 'remediators')
                await self._register_plugin(LogToCodeMapperPlugin(source_directories=[]), 'detectors')
                
                logger.info("Code analysis plugins registered successfully")
            except ImportError as e:
                logger.warning(f"Failed to import code analysis plugins: {e}")
            except Exception as e:
                logger.error(f"Error registering code analysis plugins: {e}")
        
        # MCP Monitoring Plugins (conditional)
        if MCP_MONITORING_AVAILABLE:
            try:
                from mcp_monitoring_plugin import (
                    MCPServerDiscovery,
                    MCPMetricsCollectorPlugin,
                    MCPPatternDetectorPlugin,
                    MCPServerRemediationPlugin
                )
                
                # Discover MCP servers first
                discovery = MCPServerDiscovery({
                    'scan_ports': [8000, 8080, 3000, 5000, 9000],
                    'scan_hosts': ['localhost', '127.0.0.1'],
                    'discovery_methods': ['process_scan', 'port_scan', 'docker_scan', 'config_file_scan']
                })
                
                discovered_servers = await discovery.discover_all_servers()
                logger.info(f"Discovered {len(discovered_servers)} MCP servers")
                
                # Convert server list to dictionary format
                servers_dict = {server.server_id: server for server in discovered_servers}
                
                # Register MCP monitoring plugins with discovered servers
                if discovered_servers:
                    await self._register_plugin(MCPMetricsCollectorPlugin(discovered_servers), 'collectors')
                    await self._register_plugin(MCPPatternDetectorPlugin(servers_dict), 'detectors')
                    await self._register_plugin(MCPServerRemediationPlugin(servers_dict), 'remediators')
                
                logger.info("MCP monitoring plugins registered successfully")
            except ImportError as e:
                logger.warning(f"Failed to import MCP monitoring plugins: {e}")
            except Exception as e:
                logger.error(f"Error registering MCP monitoring plugins: {e}")
    
    async def _register_plugin(self, plugin: PluginInterface, plugin_type: str):
        """Registriert ein Plugin"""
        self.plugins[plugin_type][plugin.name] = plugin
        logger.info(f"Registered plugin: {plugin.name} ({plugin_type})")
    
    async def _initialize_plugins(self):
        """Initialisiert alle Plugins"""
        config_dict = asdict(self.config) if self.config else {}
        
        for plugin_type, plugins in self.plugins.items():
            for plugin_name, plugin in plugins.items():
                try:
                    await plugin.initialize(config_dict)
                    logger.info(f"Initialized plugin: {plugin_name}")
                except Exception as e:
                    logger.error(f"Failed to initialize plugin {plugin_name}: {e}")
        
        # Special case: Set log collector reference for pattern detector
        if 'log_pattern_detector' in self.plugins['detectors'] and 'log_file_collector' in self.plugins['collectors']:
            self.plugins['detectors']['log_pattern_detector'].set_log_collector(
                self.plugins['collectors']['log_file_collector']
            )
    
    async def start_monitoring(self):
        """Startet das Monitoring"""
        self.is_running = True
        logger.info("Starting monitoring framework...")
        
        try:
            while self.is_running:
                await self._monitoring_cycle()
                await asyncio.sleep(self.config.monitoring_interval if self.config else 30)
        except Exception as e:
            logger.error(f"Error in monitoring loop: {e}")
            self.is_running = False
    
    async def _monitoring_cycle(self):
        """Ein Monitoring-Zyklus"""
        try:
            # Collect metrics from all collectors
            current_metrics = await self._collect_all_metrics()
            
            # Store metrics in history
            self.metrics_history.append(current_metrics)
            
            # Detect problems
            problems = await self._detect_problems(current_metrics)
            
            # Send data to Node.js backend
            await self._send_data_to_backend(current_metrics, problems)
            
        except Exception as e:
            logger.error(f"Error in monitoring cycle: {e}")
    
    async def _collect_all_metrics(self) -> Dict[str, Any]:
        """Sammelt Metriken von allen Collectors"""
        all_metrics = {'timestamp': datetime.now()}
        
        for collector_name, collector in self.plugins['collectors'].items():
            try:
                metrics = await collector.collect_metrics()
                all_metrics.update(metrics)
            except Exception as e:
                logger.error(f"Error collecting metrics from {collector_name}: {e}")
        
        return all_metrics
    
    async def _detect_problems(self, current_metrics: Dict[str, Any]) -> List[Problem]:
        """Erkennt Probleme mit allen Detectors"""
        all_problems = []
        history_list = list(self.metrics_history)
        
        for detector_name, detector in self.plugins['detectors'].items():
            try:
                problems = await detector.detect_problems(current_metrics, history_list)
                all_problems.extend(problems)
            except Exception as e:
                logger.error(f"Error detecting problems with {detector_name}: {e}")
        
        return all_problems
    
    async def _send_data_to_backend(self, metrics: Dict[str, Any], problems: List[Problem]):
        """Sendet Daten an das Node.js Backend"""
        try:
            # Convert metrics for sending
            metrics_data = {
                'timestamp': datetime.now(),
                'cpuUsage': metrics.get('cpu_usage', 0),
                'memoryUsage': metrics.get('memory_usage', 0),
                'diskUsage': metrics.get('disk_usage', 0),
                'loadAverage': metrics.get('load_average', 0),
                'networkConnections': metrics.get('network_connections', 0),
                'processes': metrics.get('processes', 0),
                'metadata': {k: v for k, v in metrics.items() if k not in ['cpu_usage', 'memory_usage', 'disk_usage', 'load_average', 'network_connections', 'processes', 'timestamp']}
            }
            
            # Convert problems
            problems_data = [problem.to_dict() for problem in problems]
            
            # Convert log entries
            log_entries_data = []
            if 'log_file_collector' in self.plugins['collectors']:
                log_collector = self.plugins['collectors']['log_file_collector']
                recent_logs = list(log_collector.log_buffer)[-10:]  # Last 10 entries
                log_entries_data = [entry.to_dict() for entry in recent_logs]
            
            # Convert plugin status
            plugins_data = []
            for plugin_type, plugins in self.plugins.items():
                for plugin_name, plugin in plugins.items():
                    plugins_data.append({
                        'name': plugin_name,
                        'version': plugin.version,
                        'type': plugin_type[:-1] if plugin_type.endswith('s') else plugin_type,
                        'status': 'running',
                        'lastUpdate': datetime.now(),
                        'config': {}
                    })
            
            # Send all data as JSON
            output_data = {}
            if metrics_data:
                output_data['metrics'] = metrics_data
            if problems_data:
                output_data['problems'] = problems_data
            if log_entries_data:
                output_data['logEntries'] = log_entries_data
            if plugins_data:
                output_data['plugins'] = plugins_data
            
            if output_data:
                print(json.dumps(output_data, cls=DateTimeEncoder))
                
        except Exception as e:
            logger.error(f"Error sending data to backend: {e}")
    
    async def stop(self):
        """Stoppt das Framework"""
        self.is_running = False
        
        # Cleanup all plugins
        for plugin_type, plugins in self.plugins.items():
            for plugin_name, plugin in plugins.items():
                try:
                    await plugin.cleanup()
                except Exception as e:
                    logger.error(f"Error cleaning up plugin {plugin_name}: {e}")
        
        logger.info("Framework stopped")

# ============================================================================
# MAIN ENTRY POINT
# ============================================================================

async def main():
    """Hauptfunktion"""
    framework = IntelligentMonitoringFramework()
    
    try:
        await framework.initialize()
        await framework.start_monitoring()
    except KeyboardInterrupt:
        logger.info("Received interrupt signal")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
    finally:
        await framework.stop()

# Create aliases for backwards compatibility
MonitoringFramework = IntelligentMonitoringFramework
SystemMetricsCollector = SystemMetricsCollectorPlugin
LogFileMonitor = LogFileCollectorPlugin
ThresholdDetector = ThresholdDetectorPlugin
PerformanceAnalyzer = SystemMetricsCollectorPlugin  # Alias for performance analysis
AutoRemediator = SystemRemediationPlugin  # Alias for auto remediation

if __name__ == "__main__":
    asyncio.run(main())