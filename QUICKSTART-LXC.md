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

Configure Paperless (optional):
```bash
nano /opt/docuscan/backend/.env
systemctl restart docuscan-backend
```

## Access

Get container IP:
```bash
hostname -I | awk '{print $1}'
```

Access at: `http://container-ip`

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
