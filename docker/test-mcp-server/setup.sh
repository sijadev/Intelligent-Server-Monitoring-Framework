#!/bin/bash

set -e

echo "🔧 Setting up Test MCP Server environment..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Build the Docker image
echo "🏗️  Building Test MCP Server Docker image..."
docker build -t test-mcp-server .

# Start the services
echo "🚀 Starting Test MCP Server services..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check service health
services=("test-mcp-basic:3001" "test-mcp-errors:3002" "test-mcp-performance:3003" "test-mcp-websocket:3004")

for service in "${services[@]}"; do
    name="${service%%:*}"
    port="${service##*:}"
    
    echo "🔍 Checking health of $name on port $port..."
    
    max_attempts=30
    attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "http://localhost:$port/health" > /dev/null; then
            echo "✅ $name is healthy"
            break
        else
            if [ $attempt -eq $max_attempts ]; then
                echo "❌ $name failed to start after $max_attempts attempts"
                docker-compose logs "$name"
                exit 1
            fi
            echo "⏳ Attempt $attempt/$max_attempts: $name not ready yet, waiting..."
            sleep 2
            ((attempt++))
        fi
    done
done

echo ""
echo "🎉 Test MCP Server environment is ready!"
echo ""
echo "Available endpoints:"
echo "  Basic Tests:      http://localhost:3001"
echo "  Error Simulation: http://localhost:3002"
echo "  Performance:      http://localhost:3003"
echo "  WebSocket:        ws://localhost:3004"
echo ""
echo "Health checks:"
echo "  curl http://localhost:3001/health"
echo "  curl http://localhost:3002/health"
echo "  curl http://localhost:3003/health"
echo "  curl http://localhost:3004/health"
echo ""
echo "To run tests:"
echo "  cd ../../server && npm test -- mcp-integration"
echo ""
echo "To stop services:"
echo "  docker-compose down"
echo ""
echo "To view logs:"
echo "  docker-compose logs -f [service-name]"