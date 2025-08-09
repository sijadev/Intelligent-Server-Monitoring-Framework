#!/bin/bash

# 🚀 IMF Complete Development Environment Startup
echo "🚀 Starting Complete IMF Development Environment"
echo "==============================================="

# Check and start Redis
if ! redis-cli ping &>/dev/null; then
    echo "📦 Starting Redis..."
    redis-server --daemonize yes
    sleep 1
fi

# Check and start PostgreSQL
if ! pg_isready -q; then
    echo "🗄️ Starting PostgreSQL..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew services start postgresql
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo systemctl start postgresql
    fi
    sleep 2
fi

# Start Python API in background
echo "🐍 Starting Python Monitoring API..."
source .venv/bin/activate
cd python-framework
python api_integration.py &
PYTHON_PID=$!
cd ..

# Wait a moment for Python API to start
sleep 3

# Start Node.js server
echo "🌐 Starting Node.js Main Application..."
npm run dev &
NODE_PID=$!

echo ""
echo "✅ All IMF services started successfully!"
echo "========================================"
echo ""
echo "🌐 Available endpoints:"
echo "   • Main Application:     http://localhost:3000"
echo "   • Python Monitoring:    http://localhost:8000"
echo "   • API Documentation:    http://localhost:8000/docs"
echo ""
echo "🗄️ Database & Cache:"
echo "   • PostgreSQL:           localhost:5432/imf_database"
echo "   • Redis:                localhost:6379"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Handle shutdown gracefully
cleanup() {
    echo ""
    echo "🛑 Shutting down IMF Development Environment..."
    echo "==============================================="
    
    echo "Stopping Python API..."
    kill $PYTHON_PID 2>/dev/null
    
    echo "Stopping Node.js server..."
    kill $NODE_PID 2>/dev/null
    
    echo "✅ All services stopped"
    exit 0
}

trap cleanup INT TERM

# Wait for processes
wait