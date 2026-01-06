# DocuScan LXC Container Deployment Guide

This guide explains how to deploy DocuScan in an LXC container with nginx.

## Prerequisites

- LXC container running Ubuntu 22.04 or 24.04
- Root access to the container
- Internet connection in the container
- Git installed (or will be installed by setup script)

## Quick Start

### 1. Enter Container

```bash
# Enter your LXC container
lxc exec your-container-name -- bash
```

### 2. Clone Repository and Run Setup

```bash
# Install git if not present
apt-get update && apt-get install -y git

# Clone the repository
cd /tmp
git clone https://github.com/tipp88/docu_scan.git
cd docu_scan

# Make setup script executable
chmod +x setup-lxc.sh

# Run setup (as root)
./setup-lxc.sh
```

The setup script will:
- ✓ Install Node.js 20.x
- ✓ Install Python 3 and create virtual environment
- ✓ Install all dependencies
- ✓ Build the frontend
- ✓ Generate self-signed SSL certificates
- ✓ Create systemd service for backend
- ✓ Start backend service
- ✓ Display nginx configuration to add manually

**Important:** The script does NOT configure nginx automatically to avoid conflicts with your existing setup.

## Post-Installation Configuration

### 1. Configure Backend Environment

Edit the backend configuration:

```bash
nano /opt/docuscan/backend/.env
```

Example configuration:

```env
# Server Configuration
BACKEND_HOST=0.0.0.0
BACKEND_PORT=3001
LOG_LEVEL=info

# Paperless-ngx Integration (optional)
PAPERLESS_ENABLED=true
PAPERLESS_URL=http://your-paperless-server:8000
PAPERLESS_TOKEN=your-api-token-here
PAPERLESS_VERIFY_SSL=false

# Other integrations (optional)
WEBDAV_ENABLED=false
SMB_ENABLED=false
FTP_ENABLED=false
```

After editing, restart the backend:

```bash
systemctl restart docuscan-backend
```

### 2. Configure Nginx with HTTPS (REQUIRED for camera access)

The setup script provides nginx configuration at the end. You have two options:

#### Option A: Subdomain (Recommended)

Create a new site configuration:

```bash
nano /etc/nginx/sites-available/docuscan
```

Add this configuration:

```nginx
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name docuscan.yourdomain.com;  # Change this

    # SSL Configuration
    ssl_certificate /opt/docuscan/ssl/docuscan.crt;
    ssl_certificate_key /opt/docuscan/ssl/docuscan.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Frontend
    location / {
        root /opt/docuscan/frontend/dist;
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache";
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    client_max_body_size 50M;
}

# HTTP redirect
server {
    listen 80;
    listen [::]:80;
    server_name docuscan.yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

Enable and reload:

```bash
ln -s /etc/nginx/sites-available/docuscan /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

#### Option B: Path-Based (add to existing dashboard config)

Edit your existing nginx site:

```bash
nano /etc/nginx/sites-available/your-dashboard
```

Add to your existing SSL server block:

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    # Your existing SSL config...

    # Add DocuScan paths
    location /docuscan/ {
        alias /opt/docuscan/frontend/dist/;
        try_files $uri $uri/ /docuscan/index.html;
    }

    location /docuscan/api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        client_max_body_size 50M;
    }
}
```

Reload nginx:

```bash
nginx -t && systemctl reload nginx
```

### 3. SSL Certificates for Camera Access

**Camera access REQUIRES HTTPS.** The setup script creates self-signed certificates at `/opt/docuscan/ssl/`.

#### Using Self-Signed Certificates (Development/Internal)

**Pros:**
- Works immediately, no domain required
- Good for internal networks
- Free

**Cons:**
- Browser shows security warning
- Need to accept certificate in each browser

**To accept self-signed certificate:**
1. Visit https://your-server
2. Click "Advanced" or "Show Details"
3. Click "Proceed to site" or "Accept Risk"
4. The camera will now work

#### Using Let's Encrypt (Production - Recommended)

For a proper SSL certificate without warnings:

```bash
# Install certbot
apt-get install -y certbot python3-certbot-nginx

# Get certificate for subdomain
certbot --nginx -d docuscan.yourdomain.com

# Certbot will automatically update nginx config
```

**Requirements:**
- Public domain name pointing to your server
- Port 80/443 accessible from internet
- Valid DNS records

After getting Let's Encrypt cert, update nginx config to use:
```nginx
ssl_certificate /etc/letsencrypt/live/docuscan.yourdomain.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/docuscan.yourdomain.com/privkey.pem;
```

#### Using Existing SSL Certificates

If you already have SSL certs for your domain, use them in the nginx config:

```nginx
ssl_certificate /path/to/your/cert.crt;
ssl_certificate_key /path/to/your/cert.key;
```

## Service Management

### Backend Service

```bash
# Check status
systemctl status docuscan-backend

# View logs
journalctl -u docuscan-backend -f

# Restart
systemctl restart docuscan-backend

# Stop
systemctl stop docuscan-backend

# Start
systemctl start docuscan-backend

# Disable auto-start
systemctl disable docuscan-backend
```

### Nginx

```bash
# Check status
systemctl status nginx

# Test configuration
nginx -t

# Reload (graceful)
systemctl reload nginx

# Restart
systemctl restart nginx

# View logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

## Updating the Application

### Update Frontend

```bash
cd /opt/docuscan/frontend
npm install  # If package.json changed
npm run build
systemctl reload nginx
```

### Update Backend

```bash
cd /opt/docuscan/backend
source venv/bin/activate
pip install -r requirements.txt  # If requirements changed
systemctl restart docuscan-backend
```

### Full Update from Git

```bash
cd /opt/docuscan
git pull origin main

# Update frontend
cd frontend
npm install
npm run build

# Update backend
cd ../backend
source venv/bin/activate
pip install -r requirements.txt

# Restart services
systemctl restart docuscan-backend
systemctl reload nginx
```

## Network Configuration

### Accessing from Local Network

The app will be accessible at:
- **From LXC host**: `http://container-ip`
- **From other devices**: `http://container-ip` (if container has bridge network)

To find the container IP:

```bash
hostname -I | awk '{print $1}'
```

### Port Forwarding (if using NAT)

If your LXC container uses NAT networking, you need to forward ports from host to container:

```bash
# On the LXC host, forward port 80 to container
iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 8080 -j DNAT --to container-ip:80

# Or use lxc proxy device
lxc config device add container-name http-proxy proxy listen=tcp:0.0.0.0:8080 connect=tcp:127.0.0.1:80
```

## Integration with Existing Nginx Dashboard

If you already have an nginx dashboard/reverse proxy on the host:

### Option 1: Subdomain

Add a new server block on your host nginx:

```nginx
server {
    listen 80;
    server_name docuscan.yourdomain.com;

    location / {
        proxy_pass http://container-ip;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Option 2: Path-Based

Add to your existing nginx config on the host:

```nginx
location /docuscan/ {
    proxy_pass http://container-ip/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## Troubleshooting

### Backend Not Starting

Check logs:
```bash
journalctl -u docuscan-backend -n 50
```

Common issues:
- Port 3001 already in use: Change `BACKEND_PORT` in service file
- Python dependencies missing: Re-run `pip install -r requirements.txt`
- Environment variables: Check `/opt/docuscan/backend/.env`

### Frontend Not Loading

Check nginx logs:
```bash
tail -f /var/log/nginx/error.log
```

Verify build exists:
```bash
ls -la /opt/docuscan/frontend/dist
```

Rebuild if needed:
```bash
cd /opt/docuscan/frontend
npm run build
```

### API Calls Failing

Check backend is running:
```bash
curl http://localhost:3001/health
```

Check nginx proxy configuration:
```bash
nginx -t
curl http://localhost/api/pdf/generate
```

### Permission Issues

Ensure correct ownership:
```bash
chown -R root:root /opt/docuscan
chmod -R 755 /opt/docuscan
```

## File Locations

| Component | Location |
|-----------|----------|
| Application | `/opt/docuscan/` |
| Frontend build | `/opt/docuscan/frontend/dist/` |
| Backend venv | `/opt/docuscan/backend/venv/` |
| Backend config | `/opt/docuscan/backend/.env` |
| Nginx config | `/etc/nginx/sites-available/docuscan` |
| Systemd service | `/etc/systemd/system/docuscan-backend.service` |
| Nginx logs | `/var/log/nginx/` |
| Backend logs | `journalctl -u docuscan-backend` |

## Performance Tuning

### For Production Use

1. **Enable nginx caching**:

```nginx
# Add to nginx config
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=docuscan_cache:10m max_size=100m;

location /api/ {
    proxy_cache docuscan_cache;
    proxy_cache_valid 200 5m;
    # ... rest of config
}
```

2. **Increase worker processes**:

```bash
# Edit /etc/nginx/nginx.conf
worker_processes auto;
worker_connections 2048;
```

3. **Backend workers** (if needed):

```bash
# Edit /etc/systemd/system/docuscan-backend.service
ExecStart=/opt/docuscan/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 3001 --workers 2
```

## Backup

```bash
# Backup configuration
tar -czf docuscan-backup-$(date +%Y%m%d).tar.gz \
    /opt/docuscan/backend/.env \
    /etc/nginx/sites-available/docuscan \
    /etc/systemd/system/docuscan-backend.service

# Backup entire application (if needed)
tar -czf docuscan-full-backup-$(date +%Y%m%d).tar.gz /opt/docuscan/
```

## Uninstall

```bash
# Stop and disable services
systemctl stop docuscan-backend
systemctl disable docuscan-backend

# Remove systemd service
rm /etc/systemd/system/docuscan-backend.service
systemctl daemon-reload

# Remove nginx config
rm /etc/nginx/sites-enabled/docuscan
rm /etc/nginx/sites-available/docuscan
systemctl reload nginx

# Remove application
rm -rf /opt/docuscan
```

## Support

For issues or questions:
- GitHub: https://github.com/tipp88/docu_scan
- Check logs: `journalctl -u docuscan-backend -f`
- Test API: `curl http://localhost:3001/health`
