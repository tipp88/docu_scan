# DocuScan - LXC Quick Start

## One-Command Setup (from inside container)

```bash
# Enter container (from host)
lxc exec your-container-name -- bash

# Clone and setup (inside container)
apt-get update && apt-get install -y git && \
cd /tmp && \
git clone https://github.com/tipp88/docu_scan.git && \
cd docu_scan && \
chmod +x setup-lxc.sh && \
./setup-lxc.sh
```

## Step-by-Step (from inside container)

```bash
# 1. Enter container (run from host)
lxc exec your-container-name -- bash

# 2. Install git (inside container)
apt-get update && apt-get install -y git

# 3. Clone repository
cd /tmp
git clone https://github.com/tipp88/docu_scan.git
cd docu_scan

# 4. Run setup
chmod +x setup-lxc.sh
./setup-lxc.sh
```

## Post-Setup

### 1. Add to Your Nginx Config

The script will display the nginx config to add. Two options:

**Option A: Add to existing HTTPS site**
```bash
nano /etc/nginx/sites-available/your-dashboard
# Add the location blocks shown by setup script
nginx -t && systemctl reload nginx
```

**Option B: Create new subdomain**
```bash
nano /etc/nginx/sites-available/docuscan
# Copy config from setup script output
ln -s /etc/nginx/sites-available/docuscan /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

### 2. Configure Paperless (optional)
```bash
nano /opt/docuscan/backend/.env
systemctl restart docuscan-backend
```

## Access

**IMPORTANT: Camera requires HTTPS!**

Self-signed cert created at: `/opt/docuscan/ssl/`

Access at: `https://your-domain/` or `https://your-domain/docuscan/`

Accept the self-signed certificate warning in your browser for camera to work.

## Common Commands

```bash
# View backend logs
journalctl -u docuscan-backend -f

# Restart backend
systemctl restart docuscan-backend

# Reload nginx
systemctl reload nginx

# Update app from GitHub
cd /opt/docuscan
git pull origin main
cd frontend && npm run build
systemctl restart docuscan-backend && systemctl reload nginx
```

## Files Created

- Application: `/opt/docuscan/`
- Nginx config: `/etc/nginx/sites-available/docuscan`
- Systemd service: `/etc/systemd/system/docuscan-backend.service`

## Troubleshooting

### Check Services
```bash
systemctl status docuscan-backend
systemctl status nginx
```

### View Logs
```bash
# Backend logs
journalctl -u docuscan-backend -n 50 --no-pager

# Nginx logs
tail -20 /var/log/nginx/error.log
```

### Test Backend API
```bash
curl http://localhost:3001/health
```

### Test Nginx
```bash
nginx -t
curl http://localhost/
```

See `DEPLOYMENT.md` for full documentation.
