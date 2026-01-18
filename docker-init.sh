#!/bin/bash

# Script to initialize Docker environment

echo "🐳 SOC Report Generator - Docker Setup"
echo "========================================"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker Desktop."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed."
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "✅ .env created"
else
    echo "✅ .env already exists"
fi

# Build the image
echo "🔨 Building Docker image..."
docker-compose build

if [ $? -eq 0 ]; then
    echo "✅ Build successful"
else
    echo "❌ Build failed"
    exit 1
fi

# Start services
echo "🚀 Starting services..."
docker-compose up -d

if [ $? -eq 0 ]; then
    echo "✅ Services started"
else
    echo "❌ Failed to start services"
    exit 1
fi

# Wait for app to be ready
echo "⏳ Waiting for app to be ready..."
sleep 10

# Check health
echo "🔍 Checking health..."
HEALTH=$(curl -s http://localhost:3000/health)

if [ $? -eq 0 ]; then
    echo "✅ App is healthy"
    echo "$HEALTH" | jq '.' 2>/dev/null || echo "$HEALTH"
else
    echo "❌ App health check failed"
    echo "View logs: docker-compose logs -f app"
fi

echo ""
echo "✨ Docker setup complete!"
echo ""
echo "📌 Quick commands:"
echo "  • View logs:      docker-compose logs -f app"
echo "  • Stop services:  docker-compose down"
echo "  • Restart app:    docker-compose restart app"
echo ""
