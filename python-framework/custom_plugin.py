#!/usr/bin/env python3
"""
Custom Monitoring Plugin - Beispiel
Zeigt wie man ein eigenes Plugin für das IMF erstellt
"""

import psutil
import time
from datetime import datetime
from typing import Dict, List, Any, Optional
from dataclasses import dataclass

# Import der Framework-Klassen
from main import (
    PluginInterface, 
    MetricsCollectorPlugin, 
    ProblemDetectorPlugin,
    Problem,
    ProblemSeverity
)

@dataclass
class CustomMetrics:
    """Custom Metrics für dein Plugin"""
    custom_value: float
    timestamp: datetime
    metadata: Dict[str, Any]

class CustomMetricsPlugin(MetricsCollectorPlugin):
    """
    Beispiel für einen Custom Metrics Collector
    """
    
    def __init__(self):
        super().__init__()
        self.name = "custom_metrics_plugin"
        self.version = "1.0.0"
        self.description = "Custom metrics collection plugin"
    
    async def collect_data(self) -> Dict[str, Any]:
        """Sammelt custom metrics"""
        try:
            # Beispiel: Custom System-Metriken
            cpu_temp = self._get_cpu_temperature()
            network_speed = self._get_network_speed()
            
            metrics = {
                "cpu_temperature": cpu_temp,
                "network_speed": network_speed,
                "custom_score": cpu_temp * network_speed,
                "timestamp": datetime.now(),
                "source": self.name
            }
            
            return metrics
            
        except Exception as e:
            self.logger.error(f"Error collecting custom metrics: {e}")
            return {}
    
    def _get_cpu_temperature(self) -> float:
        """Beispiel: CPU-Temperatur auslesen"""
        try:
            # Für macOS/Linux - anpassen je nach System
            sensors = psutil.sensors_temperatures()
            if sensors:
                for name, entries in sensors.items():
                    for entry in entries:
                        return entry.current
            return 0.0
        except:
            # Fallback: Simulierte Temperatur basierend auf CPU-Load
            cpu_usage = psutil.cpu_percent()
            return 30 + (cpu_usage * 0.5)  # 30-80°C Bereich
    
    def _get_network_speed(self) -> float:
        """Beispiel: Netzwerk-Geschwindigkeit messen"""
        try:
            # Vereinfachte Netzwerk-Speed Messung
            stats = psutil.net_io_counters()
            return (stats.bytes_sent + stats.bytes_recv) / (1024 * 1024)  # MB
        except:
            return 0.0

class CustomProblemDetector(ProblemDetectorPlugin):
    """
    Beispiel für einen Custom Problem Detector
    """
    
    def __init__(self):
        super().__init__()
        self.name = "custom_problem_detector"
        self.version = "1.0.0"
        self.description = "Custom problem detection plugin"
        
        # Thresholds für Problem-Erkennung
        self.cpu_temp_threshold = 75.0
        self.network_threshold = 1000.0  # MB
    
    async def detect_problems(self, data: Dict[str, Any]) -> List[Problem]:
        """Erkennt Probleme basierend auf custom metrics"""
        problems = []
        
        try:
            # CPU-Temperatur prüfen
            cpu_temp = data.get("cpu_temperature", 0)
            if cpu_temp > self.cpu_temp_threshold:
                problems.append(Problem(
                    type="HIGH_CPU_TEMPERATURE",
                    severity=ProblemSeverity.HIGH,
                    description=f"CPU temperature is {cpu_temp:.1f}°C (threshold: {self.cpu_temp_threshold}°C)",
                    timestamp=datetime.now(),
                    metadata={"temperature": cpu_temp, "threshold": self.cpu_temp_threshold}
                ))
            
            # Netzwerk-Performance prüfen
            network_speed = data.get("network_speed", 0)
            if network_speed > self.network_threshold:
                problems.append(Problem(
                    type="HIGH_NETWORK_USAGE",
                    severity=ProblemSeverity.MEDIUM,
                    description=f"High network usage: {network_speed:.1f} MB",
                    timestamp=datetime.now(),
                    metadata={"network_speed": network_speed, "threshold": self.network_threshold}
                ))
            
            return problems
            
        except Exception as e:
            self.logger.error(f"Error detecting problems: {e}")
            return []

# Plugin-Registration (wird automatisch vom Framework geladen)
def register_plugins():
    """Registriert die Plugins beim Framework"""
    return [
        CustomMetricsPlugin(),
        CustomProblemDetector()
    ]

if __name__ == "__main__":
    # Test des Plugins
    import asyncio
    
    async def test_plugin():
        metrics_plugin = CustomMetricsPlugin()
        detector_plugin = CustomProblemDetector()
        
        # Metrics sammeln
        data = await metrics_plugin.collect_data()
        print("Collected metrics:", data)
        
        # Probleme erkennen
        problems = await detector_plugin.detect_problems(data)
        print("Detected problems:", problems)
    
    asyncio.run(test_plugin())
