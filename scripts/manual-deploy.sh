#!/bin/bash

# Manual deployment script when GitHub Actions fails
# Run this from your LOCAL machine

set -e

VM_USER="unirooms_in"
VM_HOST="34.100.170.102"
VM_PATH="~/lakecity"
SSH_KEY="$HOME/.ssh/github_lakecity_deploy"

echo "=========================================="
echo "Manual Deployment to VM"
echo "=========================================="

# Check if SSH key exists
if [ ! -f "$SSH_KEY" ]; then
    echo "❌ SSH key not found at $SSH_KEY"
    echo "Run: bash scripts/setup-github-ssh.sh first"
    exit 1
fi

echo "1. Testing SSH connection..."
ssh -i "$SSH_KEY" -o ConnectTimeout=10 $VM_USER@$VM_HOST "echo '✓ Connected to VM'" || {
    echo "❌ Cannot connect to VM. Check SSH setup."
    exit 1
}

echo ""
echo "2. Syncing code to VM..."
rsync -avz -e "ssh -i $SSH_KEY" \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude 'client/node_modules' \
    --exclude 'server/node_modules' \
    --exclude 'ai_backend/target' \
    --exclude '.env' \
    --exclude '*.log' \
    ./ $VM_USER@$VM_HOST:$VM_PATH/

echo ""
echo "3. Pulling latest Docker images and restarting services..."
ssh -i "$SSH_KEY" $VM_USER@$VM_HOST << 'ENDSSH'
cd ~/lakecity
echo "Pulling latest images from Docker Hub..."
docker-compose pull
echo "Stopping containers..."
docker-compose down
echo "Starting containers with new images..."
docker-compose up -d --force-recreate
echo "Checking container status..."
docker-compose ps
echo ""
echo "✓ Deployment complete!"
echo ""
echo "Check logs with:"
echo "  docker-compose logs -f"
ENDSSH

echo ""
echo "=========================================="
echo "✓ Manual deployment completed!"
echo "=========================================="
echo ""
echo "To check application status:"
echo "  ssh -i $SSH_KEY $VM_USER@$VM_HOST 'cd lakecity && docker-compose ps'"
echo ""
echo "To view logs:"
echo "  ssh -i $SSH_KEY $VM_USER@$VM_HOST 'cd lakecity && docker-compose logs -f'"
echo ""
