# DocuScan - LXC Quick Start

## One-Command Setup

```bash
# Copy project to container
lxc file push -r . container-name/tmp/Docu_Scan/

# Run setup inside container
lxc exec container-name -- bash -c "cd /tmp/Docu_Scan && chmod +x setup-lxc.sh && ./setup-lxc.sh"
```

## Manual Steps (if preferred)

```bash
# 1. Enter container
lxc exec container-name -- bash

# 2. Copy project (from outside container)
# From host: lxc file push -r /path/to/Docu_Scan/ container-name/tmp/

# 3. Run setup
cd /tmp/Docu_Scan
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

# Update app
cd /opt/docuscan && git pull
cd frontend && npm run build
systemctl restart docuscan-backend && systemctl reload nginx
```

## Files Created

- Application: `/opt/docuscan/`
- Nginx config: `/etc/nginx/sites-available/docuscan`
- Systemd service: `/etc/systemd/system/docuscan-backend.service`

See `DEPLOYMENT.md` for full documentation.
