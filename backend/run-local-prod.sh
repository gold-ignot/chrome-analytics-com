#!/bin/bash

echo "Starting Chrome Extension Analytics in Local Production Mode"
echo "=========================================================="

# Set production environment variables
export MONGO_URI="mongodb://admin:password123@localhost:27017/chrome_analytics?authSource=admin"
export REDIS_URL="redis://localhost:6379"
export PORT="8080"
export GIN_MODE="release"

echo "Environment configured:"
echo "  MONGO_URI: $MONGO_URI"
echo "  REDIS_URL: $REDIS_URL"
echo "  PORT: $PORT"
echo "  GIN_MODE: $GIN_MODE"
echo ""

# Build the latest version
echo "Building server..."
go build -o bin/server ./cmd/server

if [ $? -eq 0 ]; then
    echo "Build successful! Starting server..."
    echo ""
    
    # Start the server
    ./bin/server
else
    echo "Build failed!"
    exit 1
fi