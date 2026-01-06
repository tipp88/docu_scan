# DocuScan LXC Container Deployment Guide

This guide explains how to deploy DocuScan in an LXC container with nginx.

## Prerequisites

- LXC container running Ubuntu 22.04 or 24.04
- Root access to the container
- Nginx already installed (or will be installed by setup script)

## Quick Start

### 1. Copy Project to Container

From your host machine:

```bash
# Copy the entire project to your LXC container
lxc file push -r /path/to/Docu_Scan/ container-name/tmp/

# Or use scp/rsync if you have SSH access
rsync -avz /path/to/Docu_Scan/ root@container-ip:/tmp/Docu_Scan/
```

### 2. Enter Container and Run Setup

```bash
# Enter the container
lxc exec container-name -- bash

# Navigate to project
cd /tmp/Docu_Scan

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
- ✓ Configure nginx
- ✓ Create systemd service for backend
- ✓ Start all services

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

### 2. Configure Nginx Domain (Optional)

Edit nginx configuration:

```bash
nano /etc/nginx/sites-available/docuscan
```

Change the `server_name`:

```nginx
server {
    listen 80;
    server_name your-domain.com;  # Change this
    # ... rest of config
}
```

Reload nginx:

```bash
nginx -t  # Test configuration
systemctl reload nginx
```

### 3. Set Up SSL with Let's Encrypt (Optional)

```bash
# Install certbot
apt-get install -y certbot python3-certbot-nginx

# Get SSL certificate (replace with your domain)
certbot --nginx -d your-domain.com

# Certbot will automatically update nginx config
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
