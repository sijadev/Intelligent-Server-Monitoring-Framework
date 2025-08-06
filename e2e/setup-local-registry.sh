#!/bin/bash

# IMF Local Docker Registry Setup
# Erstellt ein lokales Docker Registry und pushed alle benötigten Images

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

REGISTRY_HOST="localhost:5000"
REGISTRY_DIR="./docker-registry"

print_status() {
    echo -e "${BLUE}[Registry Setup]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

print_status "=== Setting up IMF Local Docker Registry ==="

# Create registry directory
mkdir -p "$REGISTRY_DIR"

# Start local registry
print_status "Starting local Docker registry..."
cd "$REGISTRY_DIR"
docker-compose -f docker-compose.registry.yml up -d

# Wait for registry to be ready
print_status "Waiting for registry to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:5000/v2/ > /dev/null; then
        print_success "Registry is ready!"
        break
    fi
    sleep 2
    if [ $i -eq 30 ]; then
        print_error "Registry failed to start"
        exit 1
    fi
done

cd ..

# List of images to cache
IMAGES=(
    "postgres:15"
    "redis:7-alpine"
    "node:20-alpine"
    "mcr.microsoft.com/playwright:v1.40.0-focal"
    "registry:2"
    "joxit/docker-registry-ui:static"
)

print_status "Pulling and caching images to local registry..."

for image in "${IMAGES[@]}"; do
    print_status "Processing $image..."
    
    # Pull image if not exists
    docker pull "$image"
    
    # Tag for local registry
    local_tag="${REGISTRY_HOST}/${image##*/}"
    docker tag "$image" "$local_tag"
    
    # Push to local registry
    docker push "$local_tag"
    
    print_success "Cached $image -> $local_tag"
done

# Build and cache our custom images
print_status "Building and caching custom IMF images..."

# Build IMF App image
print_status "Building IMF application image..."
docker build -t "${REGISTRY_HOST}/imf-app:latest" -f ../Dockerfile --target development ..
docker push "${REGISTRY_HOST}/imf-app:latest"
print_success "Cached IMF App image"

# Build Playwright image
print_status "Building Playwright test image..."
docker build -t "${REGISTRY_HOST}/imf-playwright:latest" -f Dockerfile.playwright .
docker push "${REGISTRY_HOST}/imf-playwright:latest"
print_success "Cached Playwright image"

print_status "=== Registry Setup Complete ==="
print_success "Local registry running at: http://localhost:5000"
print_success "Registry UI available at: http://localhost:5001"
print_status "Cached images:"

for image in "${IMAGES[@]}"; do
    echo "  - ${REGISTRY_HOST}/${image##*/}"
done

echo "  - ${REGISTRY_HOST}/imf-app:latest"
echo "  - ${REGISTRY_HOST}/imf-playwright:latest"

print_status "Next steps:"
echo "1. Update docker-compose.yml to use local registry images"
echo "2. Run tests with: ./run-docker-e2e.sh"
echo "3. Stop registry with: cd docker-registry && docker-compose -f docker-compose.registry.yml down"

print_success "Setup completed successfully!"