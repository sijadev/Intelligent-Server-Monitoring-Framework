#!/usr/bin/env python3
"""
IMF Python Framework HTTP API Server
Provides REST API endpoints for container communication
"""

import asyncio
import json
import threading
import time
from datetime import datetime
from typing import Dict, Any, List, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Import the existing framework
from enhanced_main import EnhancedMonitoringFramework, DateTimeEncoder

class FrameworkAPIServer:
    def __init__(self):
        self.framework = EnhancedMonitoringFramework()
        self.framework_task = None
        self.is_running = False
        self.last_data = {
            "metrics": {},
            "problems": [],
            "plugins": [],
            "status": {"running": False}
        }
        
    async def start_framework(self):
        """Start the monitoring framework in background"""
        if not self.is_running:
            self.is_running = True
            self.framework_task = asyncio.create_task(self._run_framework())
            
    async def stop_framework(self):
        """Stop the monitoring framework"""
        if self.framework_task:
            self.framework_task.cancel()
            try:
                await self.framework_task
            except asyncio.CancelledError:
                pass
        self.is_running = False
        
    async def _run_framework(self):
        """Run the framework and capture its output"""
        try:
            # Override framework's output method to capture data
            original_output = self.framework.output_results
            
            def capture_output(data):
                self.last_data = {
                    "metrics": data.get("metrics", {}),
                    "problems": data.get("problems", []),
                    "plugins": data.get("plugins", []),
                    "status": {"running": True, "timestamp": datetime.now().isoformat()}
                }
                # Still call original output for logging
                original_output(data)
                
            self.framework.output_results = capture_output
            await self.framework.start_monitoring()
            
        except asyncio.CancelledError:
            raise
        except Exception as e:
            self.last_data["status"] = {
                "running": False, 
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
            self.is_running = False

# Global framework instance
framework_server = FrameworkAPIServer()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Start the framework
    await framework_server.start_framework()
    yield
    # Shutdown: Stop the framework
    await framework_server.stop_framework()

# Create FastAPI app
app = FastAPI(
    title="IMF Python Framework API",
    description="HTTP API for IMF Python Monitoring Framework",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "IMF Python Framework API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "framework_running": framework_server.is_running,
        "timestamp": datetime.now().isoformat()
    }

@app.get("/status")
async def get_status():
    """Get framework status"""
    return {
        "running": framework_server.is_running,
        "last_update": framework_server.last_data.get("status", {}).get("timestamp"),
        "plugins_count": len(framework_server.last_data.get("plugins", [])),
        "problems_count": len(framework_server.last_data.get("problems", []))
    }

@app.get("/metrics")
async def get_metrics():
    """Get current system metrics"""
    if not framework_server.is_running:
        raise HTTPException(status_code=503, detail="Framework not running")
    
    return framework_server.last_data.get("metrics", {})

@app.get("/problems")
async def get_problems():
    """Get detected problems"""
    if not framework_server.is_running:
        raise HTTPException(status_code=503, detail="Framework not running")
    
    return framework_server.last_data.get("problems", [])

@app.get("/plugins")
async def get_plugins():
    """Get plugin status"""
    if not framework_server.is_running:
        raise HTTPException(status_code=503, detail="Framework not running")
    
    return framework_server.last_data.get("plugins", [])

@app.get("/data")
async def get_all_data():
    """Get all framework data"""
    if not framework_server.is_running:
        return {
            "metrics": {},
            "problems": [],
            "plugins": [],
            "status": {"running": False}
        }
    
    return framework_server.last_data

@app.post("/start")
async def start_framework():
    """Start the monitoring framework"""
    if framework_server.is_running:
        return {"message": "Framework already running"}
    
    await framework_server.start_framework()
    return {"message": "Framework started successfully"}

@app.post("/stop")
async def stop_framework():
    """Stop the monitoring framework"""
    if not framework_server.is_running:
        return {"message": "Framework not running"}
    
    await framework_server.stop_framework()
    return {"message": "Framework stopped successfully"}

@app.post("/restart")
async def restart_framework():
    """Restart the monitoring framework"""
    await framework_server.stop_framework()
    await asyncio.sleep(1)  # Brief pause
    await framework_server.start_framework()
    return {"message": "Framework restarted successfully"}

if __name__ == "__main__":
    # Run the API server
    uvicorn.run(
        "api_server:app",
        host="0.0.0.0",
        port=8000,
        log_level="info",
        reload=False
    )