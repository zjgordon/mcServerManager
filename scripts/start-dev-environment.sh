#!/bin/bash

# Development Environment Startup Script
# Starts both Flask and Express backends for dual-backend development

set -e

echo "🚀 Starting Dual-Backend Development Environment"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
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

# Check if we're in the right directory
if [ ! -f "run.py" ] || [ ! -d "node-backend" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    print_error "Python virtual environment not found. Please run 'python -m venv venv' first"
    exit 1
fi

# Check if Node.js dependencies are installed
if [ ! -d "node-backend/node_modules" ]; then
    print_warning "Node.js dependencies not found. Installing..."
    cd node-backend
    npm install
    cd ..
fi

# Create .env file for Node.js backend if it doesn't exist
if [ ! -f "node-backend/.env" ]; then
    print_status "Creating Node.js backend environment file..."
    cp node-backend/env.example node-backend/.env
    print_success "Environment file created at node-backend/.env"
fi

# Check if Redis is running
print_status "Checking Redis connectivity..."
if ! redis-cli ping > /dev/null 2>&1; then
    print_warning "Redis is not running. Starting Redis with Docker..."
    cd node-backend
    npm run redis:start
    cd ..
    sleep 3
    if ! redis-cli ping > /dev/null 2>&1; then
        print_error "Failed to start Redis. Please start Redis manually."
        exit 1
    fi
fi
print_success "Redis is running"

# Setup Node.js database
print_status "Setting up Node.js database..."
cd node-backend
npm run setup:db
cd ..
print_success "Node.js database setup complete"

# Kill any existing processes on ports 5000 and 5001
print_status "Cleaning up existing processes..."
pkill -f "python.*run.py" || true
pkill -f "node.*dist/index.js" || true
pkill -f "ts-node.*src/index.ts" || true
sleep 2

# Start Flask backend (port 5000)
print_status "Starting Flask backend on port 5000..."
source venv/bin/activate
python run.py &
FLASK_PID=$!
sleep 3

# Check if Flask started successfully
if ! curl -s http://localhost:5000/healthz > /dev/null 2>&1; then
    print_warning "Flask health check failed, but continuing..."
fi
print_success "Flask backend started (PID: $FLASK_PID)"

# Start Express backend (port 5001)
print_status "Starting Express backend on port 5001..."
cd node-backend
npm run dev &
EXPRESS_PID=$!
cd ..
sleep 5

# Check if Express started successfully
if ! curl -s http://localhost:5001/healthz > /dev/null 2>&1; then
    print_warning "Express health check failed, but continuing..."
fi
print_success "Express backend started (PID: $EXPRESS_PID)"

echo ""
echo "🎉 Dual-Backend Development Environment Started!"
echo "================================================"
echo ""
echo "📊 Backend Services:"
echo "  • Flask API:    http://localhost:5000"
echo "  • Express API:  http://localhost:5001"
echo ""
echo "🔍 Health Checks:"
echo "  • Flask:        http://localhost:5000/healthz"
echo "  • Express:      http://localhost:5001/healthz"
echo ""
echo "📖 API Documentation:"
echo "  • Flask API:    http://localhost:5000/api/v1"
echo "  • Express API:  http://localhost:5001/api/v1"
echo ""
echo "🛠️  Development Tools:"
echo "  • Redis:        redis://localhost:6379"
echo "  • Redis UI:     http://localhost:8081 (if running)"
echo ""
echo "🔄 Routing Management:"
echo "  • Test routing: python scripts/test-routing.py"
echo "  • Manage phases: python scripts/manage-routing.py"
echo ""
echo "⏹️  To stop all services:"
echo "  • Run: ./scripts/stop-dev-environment.sh"
echo "  • Or: kill $FLASK_PID $EXPRESS_PID"
echo ""

# Save PIDs for cleanup script
echo "$FLASK_PID" > .flask.pid
echo "$EXPRESS_PID" > .express.pid

print_success "Development environment is ready!"
print_status "Both backends are running and ready for development"
