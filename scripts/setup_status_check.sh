#!/bin/bash

# Setup script for periodic Minecraft server status checks
# This script sets up a cron job to periodically check server statuses

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "Setting up periodic status checks for Minecraft Server Manager..."

# Check if we're in the right directory
if [ ! -f "$PROJECT_DIR/run.py" ]; then
    echo "Error: This script must be run from the project root directory"
    exit 1
fi

# Create the status check script
STATUS_CHECK_SCRIPT="$PROJECT_DIR/scripts/status_check.sh"
cat > "$STATUS_CHECK_SCRIPT" << 'EOF'
#!/bin/bash

# Minecraft Server Manager Status Check Script
# This script is called by cron to check server statuses

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Change to project directory
cd "$PROJECT_DIR"

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Set API key (change this to a secure value)
export STATUS_CHECK_API_KEY="your_secure_api_key_here"

# Call the status check endpoint
curl -s -X POST \
    -H "X-API-Key: $STATUS_CHECK_API_KEY" \
    -H "Content-Type: application/json" \
    "http://127.0.0.1:5000/admin/status_check" > /dev/null

# Log the check
echo "$(date): Status check completed" >> "$PROJECT_DIR/logs/status_check.log"
EOF

# Make the script executable
chmod +x "$STATUS_CHECK_SCRIPT"

# Create logs directory if it doesn't exist
mkdir -p "$PROJECT_DIR/logs"

# Set up cron job (every 5 minutes)
CRON_JOB="*/5 * * * * $STATUS_CHECK_SCRIPT"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "$STATUS_CHECK_SCRIPT"; then
    echo "Cron job already exists, updating..."
    # Remove existing job
    crontab -l 2>/dev/null | grep -v "$STATUS_CHECK_SCRIPT" | crontab -
fi

# Add new cron job
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

echo "Setup complete!"
echo ""
echo "A cron job has been created to run every 5 minutes."
echo "The status check script is located at: $STATUS_CHECK_SCRIPT"
echo ""
echo "IMPORTANT: Please edit $STATUS_CHECK_SCRIPT and change the API key to a secure value!"
echo ""
echo "To view cron jobs: crontab -l"
echo "To edit cron jobs: crontab -e"
echo "To remove cron jobs: crontab -r"
echo ""
echo "The status check will log to: $PROJECT_DIR/logs/status_check.log"
