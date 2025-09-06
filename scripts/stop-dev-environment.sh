#!/bin/bash

# Development Environment Stop Script
# Stops both Flask and Express backends

set -e

echo "🛑 Stopping Dual-Backend Development Environment"
echo "==============================================="

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

# Stop Flask backend
if [ -f ".flask.pid" ]; then
    FLASK_PID=$(cat .flask.pid)
    print_status "Stopping Flask backend (PID: $FLASK_PID)..."
    if kill $FLASK_PID 2>/dev/null; then
        print_success "Flask backend stopped"
    else
        print_warning "Flask backend was not running or already stopped"
    fi
    rm -f .flask.pid
else
    print_warning "Flask PID file not found, killing any Python processes..."
    pkill -f "python.*run.py" || true
fi

# Stop Express backend
if [ -f ".express.pid" ]; then
    EXPRESS_PID=$(cat .express.pid)
    print_status "Stopping Express backend (PID: $EXPRESS_PID)..."
    if kill $EXPRESS_PID 2>/dev/null; then
        print_success "Express backend stopped"
    else
        print_warning "Express backend was not running or already stopped"
    fi
    rm -f .express.pid
else
    print_warning "Express PID file not found, killing any Node.js processes..."
    pkill -f "node.*dist/index.js" || true
    pkill -f "ts-node.*src/index.ts" || true
fi

# Clean up any remaining processes
print_status "Cleaning up any remaining processes..."
pkill -f "python.*run.py" || true
pkill -f "node.*dist/index.js" || true
pkill -f "ts-node.*src/index.ts" || true

# Wait a moment for processes to fully stop
sleep 2

# Check if ports are still in use
if lsof -i :5000 > /dev/null 2>&1; then
    print_warning "Port 5000 is still in use"
fi

if lsof -i :5001 > /dev/null 2>&1; then
    print_warning "Port 5001 is still in use"
fi

print_success "Development environment stopped"
print_status "All backend services have been terminated"
