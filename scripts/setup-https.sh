#!/bin/bash

# Setup HTTPS with self-signed certificate for LakeCity VM
# Run this script on your VM (34.100.170.102)

set -e

echo "🔒 Setting up HTTPS for LakeCity Backend..."

# Update system packages
echo "📦 Updating system packages..."
sudo apt update

# Install Nginx if not already installed
if ! command -v nginx &> /dev/null; then
    echo "📥 Installing Nginx..."
    sudo apt install -y nginx
else
    echo "✅ Nginx already installed"
fi

# Stop nginx if running
sudo systemctl stop nginx || true

# Create self-signed SSL certificate (since Let's Encrypt requires a domain name)
echo "🔐 Creating self-signed SSL certificate..."
sudo mkdir -p /etc/letsencrypt/live/34.100.170.102

# Generate self-signed certificate valid for 365 days
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/letsencrypt/live/34.100.170.102/privkey.pem \
    -out /etc/letsencrypt/live/34.100.170.102/fullchain.pem \
    -subj "/C=IN/ST=State/L=City/O=LakeCity/CN=34.100.170.102"

# Set proper permissions
sudo chmod 644 /etc/letsencrypt/live/34.100.170.102/fullchain.pem
sudo chmod 600 /etc/letsencrypt/live/34.100.170.102/privkey.pem

# Backup existing nginx configuration
if [ -f /etc/nginx/sites-available/default ]; then
    echo "💾 Backing up existing nginx config..."
    sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup
fi

# Copy new nginx configuration
echo "📝 Setting up Nginx configuration..."
sudo cp ~/lakecity/nginx-ssl.conf /etc/nginx/sites-available/lakecity

# Remove default site if exists
sudo rm -f /etc/nginx/sites-enabled/default

# Enable lakecity site
sudo ln -sf /etc/nginx/sites-available/lakecity /etc/nginx/sites-enabled/

# Test nginx configuration
echo "🧪 Testing Nginx configuration..."
sudo nginx -t

# Start nginx
echo "🚀 Starting Nginx..."
sudo systemctl enable nginx
sudo systemctl start nginx

# Configure firewall if ufw is active
if sudo ufw status | grep -q "Status: active"; then
    echo "🔥 Configuring firewall..."
    sudo ufw allow 'Nginx Full'
fi

echo ""
echo "✅ HTTPS setup complete!"
echo ""
echo "🌐 Your backend is now accessible at:"
echo "   https://34.100.170.102"
echo ""
echo "⚠️  Note: Since this uses a self-signed certificate, browsers will show a security warning."
echo "   You'll need to accept the certificate or add an exception."
echo ""
echo "📝 Next steps:"
echo "   1. Update your Vercel environment variable VITE_API_URL to https://34.100.170.102"
echo "   2. Test the API: curl -k https://34.100.170.102/health"
echo "   3. In production, consider getting a domain and using Let's Encrypt for a trusted certificate"
