#!/bin/bash

# This script fixes SSH connection issues and makes keys persistent
# Run this ON THE VM (not locally)

echo "=========================================="
echo "Fixing SSH Configuration on VM"
echo "=========================================="

# Ensure proper SSH directory setup
echo "1. Setting up SSH directory with correct permissions..."
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Backup existing authorized_keys if it exists
if [ -f ~/.ssh/authorized_keys ]; then
    echo "2. Backing up existing authorized_keys..."
    cp ~/.ssh/authorized_keys ~/.ssh/authorized_keys.backup.$(date +%Y%m%d_%H%M%S)
fi

# Create or fix authorized_keys
touch ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

echo ""
echo "=========================================="
echo "Current authorized_keys content:"
echo "=========================================="
cat ~/.ssh/authorized_keys
echo ""
echo "=========================================="

echo ""
echo "3. Checking SSH daemon configuration..."
# Check if SSH allows key authentication
sudo grep -E "^(PubkeyAuthentication|PermitRootLogin|PasswordAuthentication)" /etc/ssh/sshd_config || echo "Using defaults"

echo ""
echo "=========================================="
echo "NEXT STEPS:"
echo "=========================================="
echo ""
echo "On your LOCAL machine, run:"
echo "  cat ~/.ssh/github_lakecity_deploy.pub"
echo ""
echo "Then, BACK ON THIS VM, add the public key:"
echo "  echo 'PASTE_PUBLIC_KEY_HERE' >> ~/.ssh/authorized_keys"
echo "  chmod 600 ~/.ssh/authorized_keys"
echo ""
echo "Or if you have the public key in a file:"
echo "  scp your-machine:~/.ssh/github_lakecity_deploy.pub /tmp/gh_key.pub"
echo "  cat /tmp/gh_key.pub >> ~/.ssh/authorized_keys"
echo "  chmod 600 ~/.ssh/authorized_keys"
echo "  rm /tmp/gh_key.pub"
echo ""
echo "To verify permissions are correct:"
echo "  ls -la ~/.ssh/"
echo "  # Should show: drwx------ for .ssh and -rw------- for authorized_keys"
echo ""
echo "=========================================="
