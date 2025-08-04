#!/usr/bin/env python3
"""
Test version of the enhanced monitoring framework with shorter intervals
"""

import asyncio
import logging
import json
import psutil
from datetime import datetime
from typing import Dict, Any, List
from dataclasses import dataclass, field

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
    severity: str
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

class TestMonitoringFramework:
    def __init__(self):
        self.plugins = []
        self.is_running = False
        self.problems = []
        self.metrics_history = []
    
    async def initialize_plugins(self):
        """Initialize test plugins"""
        
        # System Metrics Collector
        async def collect_system_metrics():
            return {
                'cpuUsage': psutil.cpu_percent(interval=0.1),
                'memoryUsage': psutil.virtual_memory().percent,
                'diskUsage': psutil.disk_usage('/').percent,
                'processes': len(psutil.pids()),
                'loadAverage': psutil.getloadavg()[0] if hasattr(psutil, 'getloadavg') else 0
            }
        
        # Threshold Detector
        async def detect_threshold_problems(metrics):
            problems = []
            if metrics.get('cpuUsage', 0) > 80:
                problems.append(Problem(
                    type='HIGH_CPU_USAGE',
                    severity='WARNING',
                    description=f'CPU usage is {metrics["cpuUsage"]:.1f}%',
                    timestamp=datetime.now()
                ))
            if metrics.get('memoryUsage', 0) > 85:
                problems.append(Problem(
                    type='HIGH_MEMORY_USAGE',
                    severity='WARNING', 
                    description=f'Memory usage is {metrics["memoryUsage"]:.1f}%',
                    timestamp=datetime.now()
                ))
            return problems
        
        self.plugins = [
            {
                'name': 'system_metrics_collector',
                'version': '1.0.0',
                'type': 'collector',
                'status': 'running',
                'description': 'Collects system metrics',
                'collect_func': collect_system_metrics
            },
            {
                'name': 'threshold_detector',
                'version': '1.0.0', 
                'type': 'detector',
                'status': 'running',
                'description': 'Detects threshold violations',
                'detect_func': detect_threshold_problems
            }
        ]
        
        logger.info(f"Initialized {len(self.plugins)} test plugins")
    
    async def start_monitoring(self):
        """Start test monitoring with shorter intervals"""
        await self.initialize_plugins()
        self.is_running = True
        logger.info("Test monitoring framework started")
        
        # Run only 3 cycles for testing
        for cycle in range(3):
            try:
                # Collect metrics
                all_metrics = {'timestamp': datetime.now()}
                
                for plugin in self.plugins:
                    if plugin['type'] == 'collector' and plugin['status'] == 'running':
                        try:
                            if 'collect_func' in plugin:
                                plugin_metrics = await plugin['collect_func']()
                                all_metrics.update(plugin_metrics)
                        except Exception as e:
                            logger.error(f"Plugin {plugin['name']} collection error: {e}")
                
                # Run detectors
                all_problems = []
                for plugin in self.plugins:
                    if plugin['type'] == 'detector' and plugin['status'] == 'running':
                        try:
                            if 'detect_func' in plugin:
                                plugin_problems = await plugin['detect_func'](all_metrics)
                                all_problems.extend(plugin_problems)
                        except Exception as e:
                            logger.error(f"Plugin {plugin['name']} detection error: {e}")
                
                # Output data for Node.js
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
                
                # Output JSON to stdout
                print(json.dumps(output_data, cls=DateTimeEncoder))
                
                if cycle < 2:  # Don't sleep on last iteration
                    await asyncio.sleep(2)  # Short interval for testing
                    
            except Exception as e:
                logger.error(f"Error in monitoring loop: {e}")
        
        logger.info("Test monitoring completed")

async def main():
    framework = TestMonitoringFramework()
    try:
        await framework.start_monitoring()
    except Exception as e:
        logger.error(f"Test framework error: {e}")

if __name__ == "__main__":
    asyncio.run(main())