#!/usr/bin/env python3

"""
🌐 API INTEGRATION FOR COMPLETE DEVELOPMENT ENVIRONMENT
Integrates the existing Python framework with FastAPI for full functionality
"""

import asyncio
import logging
from datetime import datetime
from typing import Dict, Any, List
import uvicorn
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware

# Import the existing main framework
try:
    from main import (
        MonitoringFramework,
        SystemMetricsCollector,
        LogFileMonitor,
        ThresholdDetector,
        PerformanceAnalyzer,
        AutoRemediator
    )
    FRAMEWORK_AVAILABLE = True
except ImportError as e:
    logging.error(f"Could not import main framework: {e}")
    FRAMEWORK_AVAILABLE = False

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI
app = FastAPI(
    title="IMF Python Monitoring API",
    description="Complete monitoring and analysis API integrated with IMF framework", 
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global framework instance
framework_instance = None

class FrameworkAPIBridge:
    """Bridge between the existing framework and FastAPI"""
    
    def __init__(self):
        self.framework = None
        self.is_running = False
        
    async def initialize_framework(self):
        """Initialize the main monitoring framework"""
        if not FRAMEWORK_AVAILABLE:
            logger.error("Main framework not available")
            return False
            
        try:
            logger.info("🔧 Initializing monitoring framework...")
            
            # Initialize framework with plugins
            self.framework = MonitoringFramework()
            
            # Add plugins
            plugins = [
                SystemMetricsCollector(interval=30),
                LogFileMonitor(log_paths=['/var/log', './logs']),
                ThresholdDetector(),
                PerformanceAnalyzer(),
                AutoRemediator()
            ]
            
            for plugin in plugins:
                self.framework.register_plugin(plugin)
            
            # Start framework
            await self.framework.start()
            self.is_running = True
            
            logger.info("✅ Framework initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize framework: {e}")
            return False
    
    def get_metrics(self) -> List[Dict[str, Any]]:
        """Get latest metrics from framework"""
        if not self.framework or not self.is_running:
            return []
            
        try:
            # Get metrics from the framework storage
            metrics = []
            if hasattr(self.framework, 'data_storage'):
                metrics = list(self.framework.data_storage.metrics_db.values())
                # Sort by timestamp, most recent first
                metrics.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
            
            return metrics[:10]  # Return last 10 metrics
            
        except Exception as e:
            logger.error(f"Error getting metrics: {e}")
            return []
    
    def get_problems(self) -> List[Dict[str, Any]]:
        """Get detected problems from framework"""
        if not self.framework or not self.is_running:
            return []
            
        try:
            problems = []
            if hasattr(self.framework, 'data_storage'):
                problems = list(self.framework.data_storage.problems_db.values())
                # Sort by timestamp, most recent first  
                problems.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
            
            return problems[:20]  # Return last 20 problems
            
        except Exception as e:
            logger.error(f"Error getting problems: {e}")
            return []
    
    def get_plugins(self) -> List[Dict[str, Any]]:
        """Get plugin status from framework"""
        if not self.framework or not self.is_running:
            return []
            
        try:
            plugins = []
            for plugin in self.framework.plugins:
                plugins.append({
                    "id": getattr(plugin, 'plugin_id', plugin.__class__.__name__.lower()),
                    "name": plugin.__class__.__name__,
                    "version": getattr(plugin, 'version', '1.0.0'),
                    "type": getattr(plugin, 'plugin_type', 'unknown'),
                    "status": "running" if self.is_running else "stopped",
                    "config": getattr(plugin, 'config', {}),
                    "last_update": datetime.now().isoformat()
                })
            
            return plugins
            
        except Exception as e:
            logger.error(f"Error getting plugins: {e}")
            return []

# Initialize the bridge
framework_bridge = FrameworkAPIBridge()

# API Endpoints
@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "name": "IMF Python Monitoring API",
        "version": "1.0.0", 
        "status": "running",
        "framework_status": "running" if framework_bridge.is_running else "stopped",
        "framework_available": FRAMEWORK_AVAILABLE,
        "endpoints": [
            "/health",
            "/metrics", 
            "/metrics/latest",
            "/problems",
            "/plugins", 
            "/system/info",
            "/analyze/logs"
        ]
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "framework_running": framework_bridge.is_running,
        "framework_available": FRAMEWORK_AVAILABLE,
        "metrics_count": len(framework_bridge.get_metrics()),
        "problems_count": len(framework_bridge.get_problems()),
        "plugins_count": len(framework_bridge.get_plugins())
    }

@app.get("/metrics")
async def get_all_metrics():
    """Get all recent metrics"""
    metrics = framework_bridge.get_metrics()
    return {
        "metrics": metrics,
        "count": len(metrics),
        "timestamp": datetime.now().isoformat()
    }

@app.get("/metrics/latest") 
async def get_latest_metrics():
    """Get latest system metrics"""
    metrics = framework_bridge.get_metrics()
    if metrics:
        return metrics[0]  # Most recent
    else:
        return {
            "error": "No metrics available",
            "timestamp": datetime.now().isoformat()
        }

@app.get("/problems")
async def get_problems():
    """Get detected problems"""
    problems = framework_bridge.get_problems()
    return {
        "problems": problems,
        "count": len(problems),
        "timestamp": datetime.now().isoformat()
    }

@app.get("/plugins")
async def get_plugins():
    """Get plugin status"""
    plugins = framework_bridge.get_plugins()
    return {
        "plugins": plugins,
        "count": len(plugins),
        "active": len([p for p in plugins if p["status"] == "running"])
    }

@app.get("/system/info")
async def get_system_info():
    """Get system information"""
    try:
        import psutil
        import sys
        
        return {
            "platform": {
                "system": sys.platform,
                "python_version": sys.version,
                "cpu_count": psutil.cpu_count()
            },
            "resources": {
                "memory_total": psutil.virtual_memory().total,
                "disk_total": psutil.disk_usage('/').total
            },
            "framework": {
                "available": FRAMEWORK_AVAILABLE,
                "running": framework_bridge.is_running,
                "plugins": len(framework_bridge.get_plugins())
            },
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting system info: {str(e)}")

@app.post("/analyze/logs")
async def analyze_log_file(file_path: str):
    """Analyze a log file"""
    import os
    
    try:
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail=f"Log file not found: {file_path}")
        
        # Use framework's log analysis if available
        if framework_bridge.framework and hasattr(framework_bridge.framework, 'analyze_log_file'):
            result = await framework_bridge.framework.analyze_log_file(file_path)
            return result
        
        # Fallback to simple analysis
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        lines = content.split('\n')
        error_count = sum(1 for line in lines if any(pattern in line.upper() for pattern in ['ERROR', 'FATAL', 'EXCEPTION']))
        warning_count = sum(1 for line in lines if any(pattern in line.upper() for pattern in ['WARN', 'WARNING']))
        
        return {
            "file_path": file_path,
            "analysis": {
                "total_lines": len(lines),
                "error_count": error_count,
                "warning_count": warning_count,
                "file_size": len(content)
            },
            "timestamp": datetime.now().isoformat(),
            "analyzer": "fallback" if not framework_bridge.is_running else "framework"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing log: {str(e)}")

@app.post("/framework/start")
async def start_framework():
    """Start the monitoring framework"""
    if framework_bridge.is_running:
        return {"message": "Framework already running", "status": "running"}
    
    success = await framework_bridge.initialize_framework()
    if success:
        return {"message": "Framework started successfully", "status": "running"}
    else:
        raise HTTPException(status_code=500, detail="Failed to start framework")

@app.post("/framework/stop")
async def stop_framework():
    """Stop the monitoring framework"""
    if not framework_bridge.is_running:
        return {"message": "Framework not running", "status": "stopped"}
    
    try:
        if framework_bridge.framework:
            await framework_bridge.framework.stop()
        framework_bridge.is_running = False
        return {"message": "Framework stopped successfully", "status": "stopped"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error stopping framework: {str(e)}")

# Background task to auto-start framework
async def auto_start_framework():
    """Auto-start the framework on API startup"""
    logger.info("🚀 Auto-starting monitoring framework...")
    await asyncio.sleep(2)  # Give API time to fully start
    await framework_bridge.initialize_framework()

# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize on startup"""
    logger.info("🚀 Starting IMF Python Monitoring API")
    
    # Auto-start framework in background
    if FRAMEWORK_AVAILABLE:
        asyncio.create_task(auto_start_framework())
    else:
        logger.warning("Main framework not available - API will run with limited functionality")

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("🛑 Shutting down IMF Python Monitoring API")
    
    if framework_bridge.is_running:
        try:
            await framework_bridge.framework.stop()
        except Exception as e:
            logger.error(f"Error stopping framework: {e}")

if __name__ == "__main__":
    print("🐍 IMF Python Monitoring API")
    print("=============================")
    print("Starting integrated API server with full framework...")
    print("")
    print("Available at: http://localhost:8000")
    print("API docs: http://localhost:8000/docs")
    print("")
    
    # Run with uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info",
        reload=True
    )