#!/bin/bash

# Setup Let's Encrypt SSL for api.pencilpanda.in
DOMAIN="api.pencilpanda.in"
EMAIL="admin@pencilpanda.in"

echo "================================================"
echo "Setting up HTTPS for $DOMAIN"
echo "================================================"

# Install Certbot if not already installed
if ! command -v certbot &> /dev/null; then
    echo "Installing Certbot..."
    sudo apt update
    sudo apt install -y certbot python3-certbot-nginx
else
    echo "✓ Certbot already installed"
fi

# Create webroot directory for Let's Encrypt verification
sudo mkdir -p /var/www/certbot

# Stop Nginx temporarily to avoid port 80 conflict during first-time setup
echo "Stopping Nginx temporarily..."
sudo systemctl stop nginx

# Copy the new Nginx configuration
echo "Installing Nginx configuration..."
sudo cp ~/lakecity/nginx-domain.conf /etc/nginx/sites-available/lakecity
sudo ln -sf /etc/nginx/sites-available/lakecity /etc/nginx/sites-enabled/lakecity

# Remove the old self-signed certificate config if it exists
sudo rm -f /etc/nginx/sites-enabled/default

# Get SSL certificate from Let's Encrypt
echo "Obtaining SSL certificate from Let's Encrypt..."
sudo certbot certonly --standalone \
    -d $DOMAIN \
    --non-interactive \
    --agree-tos \
    --email $EMAIL \
    --preferred-challenges http

# Check if certificate was obtained successfully
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    echo "✓ SSL certificate obtained successfully!"
    
    # Test Nginx configuration
    echo "Testing Nginx configuration..."
    sudo nginx -t
    
    if [ $? -eq 0 ]; then
        echo "✓ Nginx configuration is valid"
        
        # Start Nginx
        echo "Starting Nginx..."
        sudo systemctl start nginx
        sudo systemctl enable nginx
        
        echo ""
        echo "================================================"
        echo "✓ HTTPS setup complete!"
        echo "================================================"
        echo "Your API is now available at:"
        echo "  https://$DOMAIN"
        echo ""
        echo "Certificate will auto-renew via certbot."
        echo "================================================"
    else
        echo "✗ Nginx configuration has errors. Please check the config."
        exit 1
    fi
else
    echo "✗ Failed to obtain SSL certificate"
    echo "Please check the error messages above."
    exit 1
fi
