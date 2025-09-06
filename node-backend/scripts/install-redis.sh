#!/bin/bash

# Redis Installation Script for Minecraft Server Manager
# This script installs Redis on various Linux distributions

set -e

echo "🚀 Installing Redis for Minecraft Server Manager..."

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$NAME
    VER=$VERSION_ID
else
    echo "❌ Cannot detect OS. Please install Redis manually."
    exit 1
fi

echo "📋 Detected OS: $OS"

# Install Redis based on OS
case "$OS" in
    "Ubuntu"|"Debian GNU/Linux")
        echo "📦 Installing Redis on Ubuntu/Debian..."
        sudo apt update
        sudo apt install -y redis-server
        sudo systemctl start redis-server
        sudo systemctl enable redis-server
        ;;
    "CentOS Linux"|"Red Hat Enterprise Linux"|"Fedora")
        echo "📦 Installing Redis on CentOS/RHEL/Fedora..."
        if command -v dnf &> /dev/null; then
            sudo dnf install -y redis
        else
            sudo yum install -y redis
        fi
        sudo systemctl start redis
        sudo systemctl enable redis
        ;;
    "Arch Linux")
        echo "📦 Installing Redis on Arch Linux..."
        sudo pacman -S --noconfirm redis
        sudo systemctl start redis
        sudo systemctl enable redis
        ;;
    *)
        echo "❌ Unsupported OS: $OS"
        echo "Please install Redis manually:"
        echo "  - Ubuntu/Debian: sudo apt install redis-server"
        echo "  - CentOS/RHEL: sudo yum install redis"
        echo "  - Arch: sudo pacman -S redis"
        echo "  - macOS: brew install redis"
        exit 1
        ;;
esac

# Test Redis installation
echo "🧪 Testing Redis installation..."
if redis-cli ping | grep -q "PONG"; then
    echo "✅ Redis installed and running successfully!"
else
    echo "❌ Redis installation failed or not running"
    exit 1
fi

# Show Redis info
echo "📊 Redis Information:"
redis-cli info server | grep -E "(redis_version|redis_mode|os|arch_bits)"

echo ""
echo "🎉 Redis installation completed!"
echo ""
echo "Next steps:"
echo "1. Run: npm run redis:setup setup"
echo "2. Run: npm run redis:test"
echo "3. Start your Node.js backend: npm run dev"
echo ""
echo "Redis is now available at: redis://localhost:6379"

