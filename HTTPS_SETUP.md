# HTTPS Setup Guide for LakeCity VM

## Problem
Your frontend is on Vercel (HTTPS) but backend is on VM (HTTP), causing mixed content errors.

## Solution
Set up HTTPS on your VM using Nginx as a reverse proxy with SSL certificate.

## Steps to Enable HTTPS on VM

### 1. Copy files to VM
```bash
# From your local machine, copy the necessary files
scp -i ~/.ssh/lakecity_deploy_key nginx-ssl.conf rhd@34.100.170.102:~/lakecity/
scp -i ~/.ssh/lakecity_deploy_key scripts/setup-https.sh rhd@34.100.170.102:~/lakecity/scripts/
```

### 2. SSH into your VM
```bash
ssh -i ~/.ssh/lakecity_deploy_key rhd@34.100.170.102
```

### 3. Run the HTTPS setup script
```bash
cd ~/lakecity
chmod +x scripts/setup-https.sh
sudo scripts/setup-https.sh
```

This script will:
- Install Nginx
- Create a self-signed SSL certificate
- Configure Nginx as a reverse proxy
- Set up automatic HTTP to HTTPS redirect
- Start Nginx on port 443 (HTTPS)

### 4. Verify HTTPS is working
```bash
# Test from VM
curl -k https://34.100.170.102/health

# Test from your local machine
curl -k https://34.100.170.102/health
```

### 5. Update Vercel Environment Variables
Go to your Vercel project settings and update:
- `VITE_API_URL` from `http://34.100.170.102` to `https://34.100.170.102`

Then redeploy your frontend.

## Important Notes

### Self-Signed Certificate Warning
Since we're using a self-signed certificate (IP addresses can't use Let's Encrypt), browsers will show a security warning. Users will need to:
- Click "Advanced" 
- Click "Proceed to 34.100.170.102 (unsafe)"

This is a one-time action per browser.

### For Production (Recommended)
For a production app, you should:
1. Get a domain name (e.g., api.lakecity.com)
2. Point it to your VM IP (34.100.170.102)
3. Use Let's Encrypt for a free, trusted SSL certificate:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.lakecity.com
```

## Troubleshooting

### Check Nginx status
```bash
sudo systemctl status nginx
```

### View Nginx logs
```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### Restart Nginx
```bash
sudo systemctl restart nginx
```

### Check if port 443 is open
```bash
sudo netstat -tlnp | grep 443
```

### Test Nginx configuration
```bash
sudo nginx -t
```

## Architecture After Setup

```
Vercel Frontend (HTTPS) 
    ↓
Nginx (Port 443 - HTTPS)
    ↓
Node.js Backend (Port 8080 - HTTP internal)
```

Nginx handles SSL/TLS termination and forwards requests to your Node.js backend internally over HTTP.
