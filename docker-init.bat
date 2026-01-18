@echo off
REM Script to initialize Docker environment (Windows)

echo 🐳 SOC Report Generator - Docker Setup
echo =======================================

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not installed. Please install Docker Desktop.
    exit /b 1
)

REM Check if Docker Compose is installed
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker Compose is not installed.
    exit /b 1
)

echo ✅ Docker and Docker Compose are installed

REM Create .env if it doesn't exist
if not exist .env (
    echo 📝 Creating .env file from template...
    copy .env.example .env
    echo ✅ .env created
) else (
    echo ✅ .env already exists
)

REM Build the image
echo 🔨 Building Docker image...
docker-compose build

if %errorlevel% neq 0 (
    echo ❌ Build failed
    exit /b 1
)

echo ✅ Build successful

REM Start services
echo 🚀 Starting services...
docker-compose up -d

if %errorlevel% neq 0 (
    echo ❌ Failed to start services
    exit /b 1
)

echo ✅ Services started

REM Wait for app to be ready
echo ⏳ Waiting for app to be ready...
timeout /t 10 /nobreak

REM Check health
echo 🔍 Checking health...
curl http://localhost:3000/health

echo.
echo ✨ Docker setup complete!
echo.
echo 📌 Quick commands:
echo   • View logs:      docker-compose logs -f app
echo   • Stop services:  docker-compose down
echo   • Restart app:    docker-compose restart app
echo.
