#!/bin/bash
# Bash script to start Chroma server using Docker

echo "Starting Chroma server with Docker..."

# Check if Docker is running
if ! docker ps > /dev/null 2>&1; then
    echo "Error: Docker is not running. Please start Docker first."
    exit 1
fi

# Check if container already exists
if docker ps -a --format '{{.Names}}' | grep -q "^rag-chroma$"; then
    echo "Chroma container already exists. Starting it..."
    docker start rag-chroma
else
    echo "Creating and starting Chroma container..."
    docker-compose up -d chroma
fi

# Wait for Chroma to be ready
echo "Waiting for Chroma server to be ready..."
max_attempts=30
attempt=0
ready=false

while [ $attempt -lt $max_attempts ] && [ "$ready" = false ]; do
    sleep 2
    attempt=$((attempt + 1))
    if curl -s http://localhost:8000/api/v1/heartbeat > /dev/null 2>&1; then
        ready=true
        echo "Chroma server is ready!"
    else
        echo -n "."
    fi
done

if [ "$ready" = false ]; then
    echo ""
    echo "Warning: Chroma server may not be ready yet. Check with: docker logs rag-chroma"
else
    echo ""
    echo "Chroma server is running at http://localhost:8000"
    echo "To view logs: docker logs -f rag-chroma"
    echo "To stop: docker stop rag-chroma"
fi
