#!/bin/bash

# ===========================================
# Setup Script for "runner" user
# FULL UNRESTRICTED PERMISSIONS
# Home: /home/runner
# ===========================================

set -e

echo "🚀 Starting setup for 'runner' user (FULL ACCESS)..."

# 1. Create the user
echo "📦 Creating user 'runner'..."
if id "runner" &>/dev/null; then
    echo "   User 'runner' already exists, skipping creation"
else
    adduser --gecos "" runner
    echo "   ✅ User 'runner' created"
fi

# 2. Add to sudo group (full admin access)
echo "🔑 Adding to sudo group..."
usermod -aG sudo runner
echo "   ✅ Added to sudo"

# 3. Add to docker group (full docker access)
echo "🐳 Adding to docker group..."
usermod -aG docker runner
echo "   ✅ Added to docker"

# 4. Passwordless sudo
echo "⚡ Configuring passwordless sudo..."
echo "runner ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/runner
chmod 440 /etc/sudoers.d/runner
echo "   ✅ Passwordless sudo enabled"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "✅ Setup complete!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Summary:"
echo "  👤 User: runner"
echo "  📁 Home: /home/runner"
echo "  🔑 Sudo: FULL ACCESS (no password)"
echo "  🐳 Docker: FULL ACCESS"
echo ""
echo "To switch to runner:"
echo "  su - runner"
echo ""
echo "═══════════════════════════════════════════════════════════"
