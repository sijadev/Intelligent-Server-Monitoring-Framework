#!/bin/bash
echo "🛑 Stopping IMF Development Environment"

pkill -f "tsx server/index.ts"
pkill -f "python.*api_integration.py"
pkill -f "uvicorn"

echo "✅ All services stopped"
