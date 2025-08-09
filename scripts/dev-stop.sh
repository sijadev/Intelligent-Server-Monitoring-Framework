#!/bin/bash

# 🛑 IMF Development Environment Shutdown
echo "🛑 Stopping IMF Development Environment"
echo "======================================="

# Stop Node.js processes
echo "Stopping Node.js server..."
pkill -f "tsx server/index.ts" 2>/dev/null
pkill -f "node.*server" 2>/dev/null

# Stop Python processes
echo "Stopping Python API..."
pkill -f "python.*api_integration.py" 2>/dev/null
pkill -f "uvicorn.*api_integration" 2>/dev/null

# Stop any remaining development processes
pkill -f "npm run dev" 2>/dev/null

echo ""
echo "✅ All IMF development services stopped"
echo "======================================"