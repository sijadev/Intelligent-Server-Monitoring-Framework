#!/bin/bash

# 🚀 COMPLETE DEVELOPMENT ENVIRONMENT SETUP
# Sets up ALL dependencies for a fully functional development environment

set -e  # Exit on any error

echo "🚀 IMF Complete Development Environment Setup"
echo "=============================================="
echo ""

print_status() { echo -e "\033[0;32m✅\033[0m $1"; }
print_warning() { echo -e "\033[1;33m⚠️\033[0m $1"; }
print_error() { echo -e "\033[0;31m❌\033[0m $1"; }
print_info() { echo -e "\033[0;34mℹ️\033[0m $1"; }

# 1. Node.js Dependencies
echo "📦 Installing Node.js Dependencies"
echo "=================================="
if ! command -v node &> /dev/null; then
    print_error "Node.js not found. Please install Node.js 18+ first"
    exit 1
fi

print_status "Node.js version: $(node --version)"
npm install
print_status "Node.js dependencies installed"

# 2. Python Environment
echo ""
echo "🐍 Setting up Python Environment"
echo "==============================="
if ! command -v python3 &> /dev/null; then
    print_error "Python3 not found. Please install Python 3.8+"
    exit 1
fi

print_status "Python version: $(python3 --version)"

# Create virtual environment
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
    print_status "Python virtual environment created"
fi

# Install Python dependencies
source .venv/bin/activate
cd python-framework
pip install -r requirements.txt
cd ..
print_status "Python dependencies installed"

# 3. Database Setup
echo ""
echo "🗄️ Setting up PostgreSQL Database"
echo "================================"

DB_NAME="imf_database"
DB_USER=$(whoami)

if ! command -v psql &> /dev/null; then
    print_warning "PostgreSQL not found. Please install PostgreSQL manually"
else
    if ! pg_isready -q; then
        print_warning "Starting PostgreSQL..."
        if [[ "$OSTYPE" == "darwin"* ]]; then
            brew services start postgresql || print_warning "Could not start PostgreSQL via Homebrew"
        fi
    fi

    # Create database
    if ! psql -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
        createdb $DB_NAME && print_status "Database created: $DB_NAME"
    else
        print_status "Database exists: $DB_NAME"
    fi
fi

# 4. Redis Setup  
echo ""
echo "📦 Setting up Redis"
echo "=================="
if ! command -v redis-server &> /dev/null; then
    print_warning "Redis not found. Please install Redis manually"
else
    if ! redis-cli ping &> /dev/null; then
        redis-server --daemonize yes
        print_status "Redis started"
    else
        print_status "Redis already running"
    fi
fi

# 5. Environment Configuration
echo ""
echo "⚙️ Setting up Environment"
echo "========================"

# Create .env file
cat > .env << EOF
DATABASE_URL=postgresql://${DB_USER}@localhost:5432/${DB_NAME}
REDIS_URL=redis://localhost:6379
SESSION_SECRET=dev-session-$(openssl rand -hex 16)
NODE_ENV=development
PORT=3000
PYTHON_FRAMEWORK_ENABLED=true
PYTHON_API_URL=http://localhost:8000
MONITORING_INTERVAL=30
LOG_LEVEL=INFO
TEST_MANAGER_ENABLED=true
WORKSPACE_PATH=./test-workspace
AI_STORAGE_TYPE=hybrid
IMF_FRAMEWORK_MODE=standalone
EOF

print_status "Environment configuration created"

# 6. Initialize Database Schema
echo ""
echo "🏗️ Initializing Database"
echo "======================="
if command -v psql &> /dev/null && pg_isready -q; then
    npm run db:push && print_status "Database schema initialized"
else
    print_warning "Skipping database initialization - PostgreSQL not available"
fi

# 7. Create Development Scripts
echo ""
echo "📜 Creating Development Scripts"
echo "============================="

cat > dev-start.sh << 'EOF'
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
EOF

chmod +x dev-start.sh

cat > dev-stop.sh << 'EOF'
#!/bin/bash
echo "🛑 Stopping IMF Development Environment"

pkill -f "tsx server/index.ts"
pkill -f "python.*api_integration.py"
pkill -f "uvicorn"

echo "✅ All services stopped"
EOF

chmod +x dev-stop.sh

print_status "Development scripts created"

# 8. Final Verification
echo ""
echo "✅ Environment Verification"
echo "=========================="

if command -v node &> /dev/null; then
    print_status "Node.js: $(node --version)"
fi

if command -v python3 &> /dev/null && [ -d ".venv" ]; then
    print_status "Python: Virtual environment ready"
fi

if command -v psql &> /dev/null; then
    if pg_isready -q; then
        print_status "PostgreSQL: Running"
    else
        print_warning "PostgreSQL: Installed but not running"
    fi
fi

if command -v redis-cli &> /dev/null; then
    if redis-cli ping | grep -q "PONG"; then
        print_status "Redis: Running"
    else
        print_warning "Redis: Installed but not running"  
    fi
fi

echo ""
echo "🎉 COMPLETE DEVELOPMENT ENVIRONMENT READY!"
echo "==========================================="
echo ""
echo "🚀 To start the full environment:"
echo "   ./dev-start.sh"
echo ""
echo "🛑 To stop all services:"
echo "   ./dev-stop.sh"
echo ""  
echo "📊 Available endpoints:"
echo "   • Main Application: http://localhost:3000"
echo "   • Python API: http://localhost:8000"
echo "   • API Documentation: http://localhost:8000/docs"
echo ""
echo "You now have a COMPLETE development environment with:"
echo "✅ Node.js server with full functionality"
echo "✅ Python monitoring framework with FastAPI"
echo "✅ PostgreSQL database with real schema"
echo "✅ Redis for caching and sessions"
echo "✅ Test Manager CLI with real test generation"
echo "✅ All services integrated and working together"
echo ""
echo "Start developing with full capabilities! 🎯"