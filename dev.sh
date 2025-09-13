#!/bin/bash

# dev.sh - Development Environment Management Script
# CARD-001: Create dev.sh development environment management script

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default configuration
DEFAULT_PORT=5000
VENV_DIR="venv"
REQUIREMENTS_FILE="requirements.txt"

# Function to print colored output
print_info() {
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

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to find available port
find_available_port() {
    local start_port=$1
    local port=$start_port
    
    while check_port $port; do
        port=$((port + 1))
        if [ $port -gt $((start_port + 100)) ]; then
            print_error "Could not find available port starting from $start_port"
            exit 1
        fi
    done
    
    echo $port
}

# Function to setup virtual environment
setup_venv() {
    print_info "Setting up virtual environment..."
    
    if [ ! -d "$VENV_DIR" ]; then
        print_info "Creating virtual environment in $VENV_DIR..."
        python3 -m venv "$VENV_DIR"
        print_success "Virtual environment created"
    else
        print_info "Virtual environment already exists"
    fi
    
    # Activate virtual environment
    print_info "Activating virtual environment..."
    source "$VENV_DIR/bin/activate"
    print_success "Virtual environment activated"
    
    # Upgrade pip
    print_info "Upgrading pip..."
    pip install --upgrade pip >/dev/null 2>&1
    
    # Install/update dependencies
    if [ -f "$REQUIREMENTS_FILE" ]; then
        print_info "Installing/updating dependencies from $REQUIREMENTS_FILE..."
        pip install -r "$REQUIREMENTS_FILE" >/dev/null 2>&1
        print_success "Dependencies installed/updated"
    else
        print_warning "No $REQUIREMENTS_FILE found"
    fi
}

# Function to setup environment variables
setup_env_vars() {
    print_info "Setting up environment variables..."
    
    # Set default environment variables if not already set
    export FLASK_APP="${FLASK_APP:-run.py}"
    export FLASK_ENV="${FLASK_ENV:-development}"
    export FLASK_DEBUG="${FLASK_DEBUG:-1}"
    export PYTHONPATH="${PYTHONPATH:-$(pwd)}"
    
    # Load .env file if it exists
    if [ -f ".env" ]; then
        print_info "Loading environment variables from .env file..."
        set -a  # automatically export all variables
        source .env
        set +a  # stop automatically exporting
        print_success "Environment variables loaded from .env"
    else
        print_info "No .env file found, using defaults"
    fi
    
    # Set port-specific environment variable
    export FLASK_RUN_PORT=$FLASK_PORT
    
    print_success "Environment variables configured"
}

# Function to handle port conflicts
handle_port_conflicts() {
    local requested_port=${1:-$DEFAULT_PORT}
    local flask_port=$requested_port
    
    print_info "Checking for port conflicts on port $requested_port..."
    
    if check_port $requested_port; then
        print_warning "Port $requested_port is already in use"
        flask_port=$(find_available_port $requested_port)
        print_info "Using alternative port: $flask_port"
    else
        print_success "Port $requested_port is available"
    fi
    
    export FLASK_PORT=$flask_port
    print_info "Flask will run on port $flask_port"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS] [COMMAND]"
    echo ""
    echo "Options:"
    echo "  -p, --port PORT     Specify port to run on (default: 5000)"
    echo "  -d, --debug         Run in debug mode (default)"
    echo "  -t, --test          Run in test mode"
    echo "  -h, --help          Show this help message"
    echo ""
    echo "Commands:"
    echo "  run                 Run the Flask application (default)"
    echo "  test                Run tests"
    echo "  setup               Setup development environment only"
    echo ""
    echo "Examples:"
    echo "  $0                  # Run with default settings"
    echo "  $0 -p 5001         # Run on port 5001"
    echo "  $0 test            # Run tests"
    echo "  $0 setup           # Setup environment without running"
}

# Function to run tests
run_tests() {
    print_info "Running tests..."
    
    # Check if pytest is available
    if ! command -v pytest &> /dev/null; then
        print_error "pytest not found. Installing..."
        pip install pytest >/dev/null 2>&1
    fi
    
    # Run tests
    if [ -d "tests" ]; then
        pytest tests/ -v
        print_success "Tests completed"
    else
        print_warning "No tests directory found"
    fi
}

# Function to run the application
run_app() {
    print_info "Starting Flask application..."
    print_info "Environment: $FLASK_ENV"
    print_info "Debug mode: $FLASK_DEBUG"
    print_info "Port: $FLASK_PORT"
    print_info "App: $FLASK_APP"
    echo ""
    
    # Run the Flask application
    python "$FLASK_APP"
}

# Main function
main() {
    local port=$DEFAULT_PORT
    local mode="run"
    local command="run"
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -p|--port)
                port="$2"
                shift 2
                ;;
            -d|--debug)
                export FLASK_ENV="development"
                export FLASK_DEBUG="1"
                shift
                ;;
            -t|--test)
                export FLASK_ENV="testing"
                export FLASK_DEBUG="0"
                shift
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            run|test|setup)
                command="$1"
                shift
                ;;
            *)
                print_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    print_info "Minecraft Server Manager - Development Environment"
    print_info "=================================================="
    
    # Setup virtual environment
    setup_venv
    
    # Handle port conflicts
    handle_port_conflicts $port
    
    # Setup environment variables
    setup_env_vars
    
    # Execute command
    case $command in
        run)
            run_app
            ;;
        test)
            run_tests
            ;;
        setup)
            print_success "Development environment setup complete"
            print_info "Virtual environment: $VENV_DIR"
            print_info "Port: $FLASK_PORT"
            print_info "Environment: $FLASK_ENV"
            ;;
        *)
            print_error "Unknown command: $command"
            show_usage
            exit 1
            ;;
    esac
}

# Check if running on Linux (for lsof command)
if ! command -v lsof &> /dev/null; then
    print_error "lsof command not found. Please install lsof package."
    print_info "On Ubuntu/Debian: sudo apt-get install lsof"
    print_info "On CentOS/RHEL: sudo yum install lsof"
    exit 1
fi

# Run main function with all arguments
main "$@"
