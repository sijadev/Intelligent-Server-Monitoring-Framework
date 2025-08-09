#!/bin/bash
echo "🚀 Starting Complete IMF Development Environment"

# Check services
if ! redis-cli ping &>/dev/null; then
    echo "📦 Starting Redis..."
    redis-server --daemonize yes
fi

if ! pg_isready -q; then
    echo "🗄️ Starting PostgreSQL..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew services start postgresql
    fi
fi

# Start Python API in background
echo "🐍 Starting Python API..."
source .venv/bin/activate
cd python-framework
python api_integration.py &
PYTHON_PID=$!
cd ..

# Start Node.js server
echo "🌐 Starting Node.js server..."
npm run dev &
NODE_PID=$!

echo ""
echo "✅ All services started!"
echo "   • Main App: http://localhost:3000"
echo "   • Python API: http://localhost:8000"
echo "   • Database: postgresql://localhost:5432/imf_database"  
echo "   • Redis: redis://localhost:6379"
echo ""
echo "Press Ctrl+C to stop all services"

trap 'echo ""; echo "🛑 Stopping..."; kill $PYTHON_PID $NODE_PID 2>/dev/null; exit' INT
wait
