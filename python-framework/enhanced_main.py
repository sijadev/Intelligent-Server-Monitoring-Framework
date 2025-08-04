#!/usr/bin/env python3
"""
Enhanced Monitoring Framework mit mehreren Plugins
Erweiterte Version mit allen verfügbaren Plugins
"""

import asyncio
import logging
import json
import time
import psutil
import os
import re
import hashlib
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from pathlib import Path
from collections import defaultdict, deque

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class DateTimeEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, datetime):
            return o.isoformat()
        return super().default(o)

@dataclass
class Problem:
    type: str
    severity: str  # LOW, MEDIUM, HIGH, CRITICAL
    description: str
    timestamp: datetime
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'type': self.type,
            'severity': self.severity,
            'description': self.description,
            'timestamp': self.timestamp.isoformat(),
            'metadata': self.metadata
        }

class EnhancedMonitoringFramework:
    """Erweiterte Monitoring Framework mit mehreren Plugins"""
    
    def __init__(self):
        self.is_running = False
        self.plugins = []
        self.problems = deque(maxlen=100)
        self.metrics_history = deque(maxlen=50)
        
    async def initialize_plugins(self):
        """Initialisiert alle verfügbaren Plugins"""
        
        # System Metrics Plugin
        self.plugins.append({
            'name': 'system_metrics_collector',
            'version': '1.0.0',
            'type': 'collector',
            'status': 'running',
            'description': 'Collects CPU, Memory, Disk metrics',
            'collect_func': self.collect_system_metrics
        })
        
        # Network Monitor Plugin
        self.plugins.append({
            'name': 'network_monitor',
            'version': '1.0.0', 
            'type': 'collector',
            'status': 'running',
            'description': 'Monitors network interfaces and connections',
            'collect_func': self.collect_network_metrics
        })
        
        # Process Monitor Plugin
        self.plugins.append({
            'name': 'process_monitor',
            'version': '1.0.0',
            'type': 'collector', 
            'status': 'running',
            'description': 'Monitors running processes and resource usage',
            'collect_func': self.collect_process_metrics
        })
        
        # Log File Monitor Plugin
        self.plugins.append({
            'name': 'log_file_monitor',
            'version': '1.0.0',
            'type': 'collector',
            'status': 'running', 
            'description': 'Monitors system and application logs',
            'collect_func': self.collect_log_metrics
        })
        
        # Threshold Detector Plugin
        self.plugins.append({
            'name': 'threshold_detector',
            'version': '1.0.0',
            'type': 'detector',
            'status': 'running',
            'description': 'Detects threshold breaches in system metrics',
            'detect_func': self.detect_threshold_problems
        })
        
        # Performance Analyzer Plugin
        self.plugins.append({
            'name': 'performance_analyzer',
            'version': '1.0.0',
            'type': 'detector',
            'status': 'running',
            'description': 'Analyzes system performance trends',
            'detect_func': self.detect_performance_problems
        })
        
        # Security Monitor Plugin  
        self.plugins.append({
            'name': 'security_monitor',
            'version': '1.0.0',
            'type': 'detector',
            'status': 'running',
            'description': 'Monitors for security-related issues',
            'detect_func': self.detect_security_problems
        })
        
        # Auto-Remediation Plugin
        self.plugins.append({
            'name': 'auto_remediator',
            'version': '1.0.0',
            'type': 'remediator',
            'status': 'running',
            'description': 'Automatically fixes common system issues',
            'remediate_func': self.auto_remediate_problems
        })
        
        logger.info(f"Initialized {len(self.plugins)} plugins")

    async def collect_system_metrics(self) -> Dict[str, Any]:
        """System Metrics Plugin"""
        try:
            metrics = {
                'timestamp': datetime.now(),
                'cpuUsage': 0,
                'memoryUsage': 0, 
                'diskUsage': 0,
                'processes': 0,
                'loadAverage': 0
            }
            
            try:
                metrics['cpuUsage'] = int(psutil.cpu_percent(interval=0.1))
            except: pass
            
            try:
                metrics['memoryUsage'] = int(psutil.virtual_memory().percent)
            except: pass
            
            try:
                metrics['diskUsage'] = int(psutil.disk_usage('/').percent)
            except: pass
            
            try:
                metrics['processes'] = len(psutil.pids())
            except: pass
            
            try:
                if hasattr(os, 'getloadavg'):
                    metrics['loadAverage'] = int(os.getloadavg()[0] * 100)
            except: pass
            
            return metrics
            
        except Exception as e:
            logger.error(f"System metrics error: {e}")
            return {'error': str(e)}

    async def collect_network_metrics(self) -> Dict[str, Any]:
        """Network Monitor Plugin"""
        try:
            metrics = {
                'timestamp': datetime.now(),
                'networkInterfaces': 0,
                'totalBytesSent': 0,
                'totalBytesReceived': 0,
                'packetsDropped': 0
            }
            
            try:
                net_io = psutil.net_io_counters()
                metrics['totalBytesSent'] = net_io.bytes_sent
                metrics['totalBytesReceived'] = net_io.bytes_recv
                metrics['packetsDropped'] = net_io.dropin + net_io.dropout
            except: pass
            
            try:
                interfaces = psutil.net_if_stats()
                metrics['networkInterfaces'] = len([i for i, stats in interfaces.items() if stats.isup])
            except: pass
            
            return metrics
            
        except Exception as e:
            logger.warning(f"Network metrics error: {e}")
            return {'error': str(e)}

    async def collect_process_metrics(self) -> Dict[str, Any]:
        """Process Monitor Plugin"""
        try:
            metrics = {
                'timestamp': datetime.now(),
                'totalProcesses': 0,
                'runningProcesses': 0,
                'sleepingProcesses': 0,
                'zombieProcesses': 0,
                'topCpuProcess': '',
                'topMemoryProcess': ''
            }
            
            try:
                processes = []
                for proc in psutil.process_iter(['pid', 'name', 'status', 'cpu_percent', 'memory_percent']):
                    try:
                        processes.append(proc.info)
                    except (psutil.NoSuchProcess, psutil.AccessDenied):
                        pass
                
                metrics['totalProcesses'] = len(processes)
                metrics['runningProcesses'] = len([p for p in processes if p['status'] == 'running'])
                metrics['sleepingProcesses'] = len([p for p in processes if p['status'] == 'sleeping'])
                metrics['zombieProcesses'] = len([p for p in processes if p['status'] == 'zombie'])
                
                # Top processes
                if processes:
                    top_cpu = max(processes, key=lambda x: x['cpu_percent'] or 0)
                    top_mem = max(processes, key=lambda x: x['memory_percent'] or 0)
                    
                    # Safe formatting with None checks
                    cpu_name = top_cpu['name'] or 'Unknown'
                    cpu_pct = top_cpu['cpu_percent'] or 0
                    mem_name = top_mem['name'] or 'Unknown'
                    mem_pct = top_mem['memory_percent'] or 0
                    
                    metrics['topCpuProcess'] = f"{cpu_name} ({cpu_pct:.1f}%)"
                    metrics['topMemoryProcess'] = f"{mem_name} ({mem_pct:.1f}%)"
                    
            except Exception as e:
                logger.warning(f"Process enumeration error: {e}")
            
            return metrics
            
        except Exception as e:
            logger.warning(f"Process metrics error: {e}")
            return {'error': str(e)}

    async def collect_log_metrics(self) -> Dict[str, Any]:
        """Log File Monitor Plugin"""
        try:
            metrics = {
                'timestamp': datetime.now(),
                'systemLogSize': 0,
                'errorLogEntries': 0,
                'warningLogEntries': 0,
                'recentErrors': []
            }
            
            # Check common log locations
            log_paths = [
                '/var/log/system.log',
                '/var/log/messages', 
                '/var/log/syslog',
                '/usr/local/var/log/system.log'  # macOS Homebrew
            ]
            
            for log_path in log_paths:
                try:
                    if Path(log_path).exists():
                        stat = Path(log_path).stat()
                        metrics['systemLogSize'] = stat.st_size
                        break
                except: pass
            
            return metrics
            
        except Exception as e:
            logger.warning(f"Log metrics error: {e}")
            return {'error': str(e)}

    async def detect_threshold_problems(self, metrics: Dict[str, Any]) -> List[Problem]:
        """Threshold Detector Plugin"""
        problems = []
        
        try:
            # CPU Threshold
            cpu_usage = metrics.get('cpuUsage', 0)
            if cpu_usage > 90:
                problems.append(Problem(
                    type='HIGH_CPU_USAGE',
                    severity='CRITICAL' if cpu_usage > 95 else 'HIGH',
                    description=f'CPU usage is {cpu_usage}%',
                    timestamp=datetime.now(),
                    metadata={'cpu_usage': cpu_usage, 'threshold': 90}
                ))
            
            # Memory Threshold
            memory_usage = metrics.get('memoryUsage', 0)
            if memory_usage > 85:
                problems.append(Problem(
                    type='HIGH_MEMORY_USAGE',
                    severity='CRITICAL' if memory_usage > 95 else 'HIGH',
                    description=f'Memory usage is {memory_usage}%',
                    timestamp=datetime.now(),
                    metadata={'memory_usage': memory_usage, 'threshold': 85}
                ))
            
            # Disk Threshold
            disk_usage = metrics.get('diskUsage', 0)
            if disk_usage > 80:
                problems.append(Problem(
                    type='HIGH_DISK_USAGE',
                    severity='CRITICAL' if disk_usage > 95 else 'MEDIUM',
                    description=f'Disk usage is {disk_usage}%',
                    timestamp=datetime.now(),
                    metadata={'disk_usage': disk_usage, 'threshold': 80}
                ))
                
        except Exception as e:
            logger.warning(f"Threshold detection error: {e}")
        
        return problems

    async def detect_performance_problems(self, metrics: Dict[str, Any]) -> List[Problem]:
        """Performance Analyzer Plugin"""
        problems = []
        
        try:
            # Analyze trends over last 5 minutes
            if len(self.metrics_history) >= 5:
                recent_cpu = [m.get('cpuUsage', 0) for m in list(self.metrics_history)[-5:]]
                avg_cpu = sum(recent_cpu) / len(recent_cpu)
                
                if avg_cpu > 80:
                    problems.append(Problem(
                        type='SUSTAINED_HIGH_CPU',
                        severity='HIGH',
                        description=f'Sustained high CPU usage: {avg_cpu:.1f}% average over 5 minutes',
                        timestamp=datetime.now(),
                        metadata={'average_cpu': avg_cpu, 'sample_size': len(recent_cpu)}
                    ))
                    
        except Exception as e:
            logger.warning(f"Performance analysis error: {e}")
        
        return problems

    async def detect_security_problems(self, metrics: Dict[str, Any]) -> List[Problem]:
        """Security Monitor Plugin"""
        problems = []
        
        try:
            # Check for unusual process count
            process_count = metrics.get('totalProcesses', 0)
            if process_count > 500:
                problems.append(Problem(
                    type='HIGH_PROCESS_COUNT',
                    severity='MEDIUM',
                    description=f'Unusual number of processes: {process_count}',
                    timestamp=datetime.now(),
                    metadata={'process_count': process_count}
                ))
                
        except Exception as e:
            logger.warning(f"Security detection error: {e}")
        
        return problems

    async def auto_remediate_problems(self, problems: List[Problem]) -> Dict[str, Any]:
        """Auto-Remediation Plugin"""
        remediation_results = []
        
        try:
            for problem in problems:
                if problem.type == 'HIGH_MEMORY_USAGE':
                    # Simulate memory cleanup
                    remediation_results.append({
                        'problem_type': problem.type,
                        'action': 'memory_cleanup_attempted',
                        'success': True,
                        'details': 'Triggered garbage collection'
                    })
                    
        except Exception as e:
            logger.warning(f"Auto-remediation error: {e}")
        
        return {'remediations': remediation_results}

    async def start_monitoring(self):
        """Startet das erweiterte Monitoring"""
        await self.initialize_plugins()
        self.is_running = True
        logger.info("Enhanced monitoring framework started")
        
        while self.is_running:
            try:
                # Collect metrics from all collector plugins
                all_metrics = {'timestamp': datetime.now()}
                
                for plugin in self.plugins:
                    if plugin['type'] == 'collector' and plugin['status'] == 'running':
                        try:
                            if 'collect_func' in plugin:
                                plugin_metrics = await plugin['collect_func']()
                                all_metrics.update(plugin_metrics)
                        except Exception as e:
                            logger.error(f"Plugin {plugin['name']} collection error: {e}")
                
                # Store metrics history
                self.metrics_history.append(all_metrics)
                
                # Run all detector plugins
                all_problems = []
                for plugin in self.plugins:
                    if plugin['type'] == 'detector' and plugin['status'] == 'running':
                        try:
                            if 'detect_func' in plugin:
                                plugin_problems = await plugin['detect_func'](all_metrics)
                                all_problems.extend(plugin_problems)
                        except Exception as e:
                            logger.error(f"Plugin {plugin['name']} detection error: {e}")
                
                # Store problems
                self.problems.extend(all_problems)
                
                # Run remediator plugins if problems exist
                if all_problems:
                    for plugin in self.plugins:
                        if plugin['type'] == 'remediator' and plugin['status'] == 'running':
                            try:
                                if 'remediate_func' in plugin:
                                    await plugin['remediate_func'](all_problems)
                            except Exception as e:
                                logger.error(f"Plugin {plugin['name']} remediation error: {e}")
                
                # Send to Node.js backend
                output_data = {
                    'metrics': all_metrics,
                    'problems': [p.to_dict() for p in all_problems],
                    'plugins': [{
                        'name': p['name'],
                        'version': p['version'],
                        'type': p['type'], 
                        'status': p['status'],
                        'lastUpdate': datetime.now(),
                        'config': {},
                        'metadata': {'description': p['description']}
                    } for p in self.plugins]
                }
                
                print(json.dumps(output_data, cls=DateTimeEncoder))
                
                # Wait for next cycle
                await asyncio.sleep(30)
                
            except Exception as e:
                logger.error(f"Error in monitoring loop: {e}")
                await asyncio.sleep(5)
    
    async def stop(self):
        """Stoppt das Monitoring"""
        self.is_running = False
        logger.info("Enhanced monitoring stopped")

async def main():
    """Hauptfunktion"""
    framework = EnhancedMonitoringFramework()
    
    try:
        await framework.start_monitoring()
    except KeyboardInterrupt:
        logger.info("Received interrupt signal")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
    finally:
        await framework.stop()

if __name__ == "__main__":
    asyncio.run(main())
