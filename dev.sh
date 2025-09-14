#!/bin/bash

# dev.sh - Development Environment Management Script
# CARD-001: Create dev.sh development environment management script
# CARD-041: Enhance dev.sh with comprehensive testing, demo mode, and process management

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
PID_FILE=".dev_server.pid"

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
    if lsof -Pi :"$port" -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to find available port
find_available_port() {
    local start_port=$1
    local port=$start_port

    while check_port "$port"; do
        port=$((port + 1))
        if [ $port -gt $((start_port + 100)) ]; then
            print_error "Could not find available port starting from $start_port"
            exit 1
        fi
    done

    echo "$port"
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

    if check_port "$requested_port"; then
        print_warning "Port $requested_port is already in use"
        flask_port=$(find_available_port "$requested_port")
        print_info "Using alternative port: $flask_port"
    else
        print_success "Port $requested_port is available"
    fi

    export FLASK_PORT=$flask_port
    print_info "Flask will run on port $flask_port"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS] [COMMAND] [COMMAND_OPTIONS]"
    echo ""
    echo "OPTIONS:"
    echo "  -p, --port PORT     Specify port to run on (default: 5000)"
    echo "  -d, --debug         Run in debug mode (default)"
    echo "  -t, --test          Run in test mode"
    echo "  --demo              Reset app to fresh install state for testing"
    echo "  --background        Start server in background mode"
    echo "  --kill              Kill running server instances"
    echo "  -h, --help          Show this help message"
    echo ""
    echo "COMMANDS:"
    echo "  run                 Run the Flask application (default)"
    echo "  test                Run tests (with optional test suite selection)"
    echo "  setup               Setup development environment only"
    echo ""
    echo "TEST OPTIONS (use with 'test' command):"
    echo "  --unit              Run only unit tests (tests/unit/)"
    echo "  --integration       Run only integration tests (tests/integration/)"
    echo "  --e2e               Run only end-to-end tests (tests/e2e/)"
    echo "  --performance       Run only performance tests (tests/performance/)"
    echo ""
    echo "EXAMPLES:"
    echo "  $0                                    # Run with default settings"
    echo "  $0 -p 5001                           # Run on port 5001"
    echo "  $0 --demo                            # Reset to fresh install state"
    echo "  $0 --background                      # Start server in background"
    echo "  $0 --kill                            # Kill running server"
    echo "  $0 test                              # Run all tests"
    echo "  $0 test --unit                       # Run only unit tests"
    echo "  $0 test --integration                # Run only integration tests"
    echo "  $0 test --e2e                        # Run only e2e tests"
    echo "  $0 test --performance                # Run only performance tests"
    echo "  $0 setup                             # Setup environment without running"
    echo ""
    echo "PROCESS MANAGEMENT:"
    echo "  The script prevents multiple instances from running simultaneously"
    echo "  Use --background to run server in background, --kill to stop it"
    echo "  Background processes are tracked via PID file: $PID_FILE"
}

# Function to check if server is already running
check_running_server() {
    if [ -f "$PID_FILE" ]; then
        local pid
        pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            return 0  # Server is running
        else
            # PID file exists but process is dead
            rm -f "$PID_FILE"
            return 1
        fi
    fi
    return 1  # No server running
}

# Function to kill running server instances
kill_server() {
    print_info "Checking for running server instances..."

    if check_running_server; then
        local pid
        pid=$(cat "$PID_FILE")
        print_info "Killing server process (PID: $pid)..."
        kill "$pid" 2>/dev/null || true
        rm -f "$PID_FILE"
        print_success "Server process killed"
    else
        print_info "No running server instances found"
    fi
}

# Function to setup demo mode
setup_demo_mode() {
    print_info "Setting up demo mode - resetting app to fresh install state..."

    # Clear database
    if [ -f "instance/minecraft_manager.db" ]; then
        print_info "Clearing existing database..."
        rm -f "instance/minecraft_manager.db"
        print_success "Database cleared"
    fi

    if [ -f "instance/dev_minecraft_manager.db" ]; then
        print_info "Clearing development database..."
        rm -f "instance/dev_minecraft_manager.db"
        print_success "Development database cleared"
    fi

    # Reset configuration
    print_info "Resetting configuration..."
    export FLASK_ENV="development"
    export FLASK_DEBUG="1"

    print_success "Demo mode setup complete - app is ready for fresh install testing"
}

# Function to run tests with enhanced options
run_tests() {
    local test_type="all"
    local test_path="tests/"

    # Parse test arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --unit)
                test_type="unit"
                test_path="tests/unit/"
                shift
                ;;
            --integration)
                test_type="integration"
                test_path="tests/integration/"
                shift
                ;;
            --e2e)
                test_type="e2e"
                test_path="tests/e2e/"
                shift
                ;;
            --performance)
                test_type="performance"
                test_path="tests/performance/"
                shift
                ;;
            *)
                shift
                ;;
        esac
    done

    print_info "Running $test_type tests..."

    # Check if pytest is available
    if ! command -v pytest &> /dev/null; then
        print_error "pytest not found. Installing..."
        pip install pytest >/dev/null 2>&1
    fi

    # Check if test directory exists
    if [ ! -d "$test_path" ]; then
        print_warning "Test directory $test_path not found"
        if [ "$test_type" != "all" ]; then
            print_info "Falling back to all tests..."
            test_path="tests/"
        fi
    fi

    # Run tests
    if [ -d "$test_path" ]; then
        print_info "Running tests from: $test_path"
        pytest "$test_path" -v
        print_success "Tests completed"
    else
        print_warning "No tests directory found"
    fi
}

# Function to run the application
run_app() {
    local background_mode=false

    # Check for background mode flag
    if [[ "$*" == *"--background"* ]]; then
        background_mode=true
    fi

    # Check if server is already running
    if check_running_server; then
        print_error "Server is already running (PID: $(cat "$PID_FILE"))"
        print_info "Use --kill to stop the running server first"
        exit 1
    fi

    print_info "Starting Flask application..."
    print_info "Environment: $FLASK_ENV"
    print_info "Debug mode: $FLASK_DEBUG"
    print_info "Port: $FLASK_PORT"
    print_info "App: $FLASK_APP"

    if [ "$background_mode" = true ]; then
        print_info "Starting server in background mode..."
        python "$FLASK_APP" &
        local server_pid=$!
        echo "$server_pid" > "$PID_FILE"
        print_success "Server started in background (PID: $server_pid)"
        print_info "Use --kill to stop the server"
        print_info "Server logs: tail -f app.log"
    else
        echo ""
        # Run the Flask application in foreground
        python "$FLASK_APP"
    fi
}

# Main function
main() {
    local port=$DEFAULT_PORT
    local command="run"
    local demo_mode=false
    local background_mode=false
    local kill_mode=false

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
            --demo)
                demo_mode=true
                shift
                ;;
            --background)
                background_mode=true
                shift
                ;;
            --kill)
                kill_mode=true
                shift
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            run|test|setup)
                command="$1"
                shift
                # For test command, continue parsing test-specific options
                if [ "$command" = "test" ]; then
                    continue
                fi
                ;;
            --unit|--integration|--e2e|--performance)
                # These are test-specific options, only valid after 'test' command
                if [ "$command" != "test" ]; then
                    print_error "Option $1 is only valid with 'test' command"
                    show_usage
                    exit 1
                fi
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

    # Handle special modes first
    if [ "$kill_mode" = true ]; then
        kill_server
        exit 0
    fi

    if [ "$demo_mode" = true ]; then
        setup_demo_mode
        # Continue with normal setup after demo mode
    fi

    # Setup virtual environment
    setup_venv

    # Handle port conflicts
    handle_port_conflicts "$port"

    # Setup environment variables
    setup_env_vars

    # Execute command
    case $command in
        run)
            if [ "$background_mode" = true ]; then
                run_app --background
            else
                run_app
            fi
            ;;
        test)
            # Pass all remaining arguments to run_tests
            run_tests "$@"
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
