#!/usr/bin/env python3
"""
Simplified Monitoring Framework - Minimal Version
Nur System-Metriken ohne komplexe Plugins
"""

import asyncio
import logging
import json
import time
import psutil
from datetime import datetime
from typing import Dict, Any

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

class SimpleMonitoringFramework:
    """Vereinfachtes Monitoring Framework"""
    
    def __init__(self):
        self.is_running = False
    
    async def collect_system_metrics(self) -> Dict[str, Any]:
        """Sammelt grundlegende System-Metriken mit Error-Handling"""
        try:
            metrics = {
                'timestamp': datetime.now(),
                'cpuUsage': 0,
                'memoryUsage': 0,
                'diskUsage': 0,
                'processes': 0,
                'networkConnections': 0,
                'loadAverage': 0
            }
            
            # CPU Usage - sicher
            try:
                metrics['cpuUsage'] = int(psutil.cpu_percent(interval=0.1))
            except Exception as e:
                logger.warning(f"CPU collection error: {e}")
            
            # Memory Usage - sicher
            try:
                metrics['memoryUsage'] = int(psutil.virtual_memory().percent)
            except Exception as e:
                logger.warning(f"Memory collection error: {e}")
            
            # Disk Usage - sicher
            try:
                metrics['diskUsage'] = int(psutil.disk_usage('/').percent)
            except Exception as e:
                logger.warning(f"Disk collection error: {e}")
            
            # Process Count - kann problematisch sein
            try:
                metrics['processes'] = len(psutil.pids())
            except Exception as e:
                logger.warning(f"Process count error: {e}")
                metrics['processes'] = 0
            
            # Network Connections - DEAKTIVIERT auf macOS
            try:
                # Einfacher Fallback ohne psutil.net_connections()
                metrics['networkConnections'] = 0  # Deaktiviert
            except Exception as e:
                logger.warning(f"Network connections error: {e}")
                metrics['networkConnections'] = 0
            
            # Load Average - sicher
            try:
                import os
                if hasattr(os, 'getloadavg'):
                    metrics['loadAverage'] = int(os.getloadavg()[0] * 100)
                else:
                    metrics['loadAverage'] = 0
            except Exception as e:
                logger.warning(f"Load average error: {e}")
                metrics['loadAverage'] = 0
            
            return metrics
            
        except Exception as e:
            logger.error(f"Error collecting system metrics: {e}")
            return {
                'timestamp': datetime.now(),
                'error': str(e),
                'cpuUsage': 0,
                'memoryUsage': 0,
                'diskUsage': 0,
                'loadAverage': 0,
                'processes': 0,
                'networkConnections': 0
            }
    
    async def start_monitoring(self):
        """Startet das Monitoring"""
        self.is_running = True
        logger.info("Simple monitoring framework started")
        
        while self.is_running:
            try:
                # Collect metrics
                metrics = await self.collect_system_metrics()
                
                # Send to Node.js backend
                output_data = {
                    'metrics': metrics,
                    'plugins': [{
                        'name': 'simple_system_monitor',
                        'version': '1.0.0',
                        'type': 'collector',
                        'status': 'running',
                        'lastUpdate': datetime.now()
                    }]
                }
                
                # Output JSON für Node.js
                print(json.dumps(output_data, cls=DateTimeEncoder))
                
                # Wait for next cycle
                await asyncio.sleep(30)
                
            except Exception as e:
                logger.error(f"Error in monitoring loop: {e}")
                await asyncio.sleep(5)
    
    async def stop(self):
        """Stoppt das Monitoring"""
        self.is_running = False
        logger.info("Monitoring stopped")

async def main():
    """Hauptfunktion"""
    framework = SimpleMonitoringFramework()
    
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
