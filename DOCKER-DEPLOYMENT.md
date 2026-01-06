# DocuScan - Docker Deployment Guide

This guide explains how to deploy DocuScan using Docker with a pre-built production container.

## Quick Start

### Option 1: Pull Pre-Built Image (Recommended)

```bash
# Pull the latest pre-built image from GitHub Container Registry
docker pull ghcr.io/tipp88/docu_scan:latest

# Run the container
docker run -d -p 8443:443 -p 8080:80 --name docuscan ghcr.io/tipp88/docu_scan:latest

# Access at https://localhost:8443
```

**Note:** Images are automatically built and published for each push to main and version tags.

### Option 2: Build and Run Locally

```bash
# Clone repository
git clone https://github.com/tipp88/docu_scan.git
cd docu_scan

# Build and start
docker compose -f docker-compose.standalone.yml up -d

# Access at https://localhost:8443
```

## What's Included

The Docker container includes:
- ✅ Pre-built frontend (optimized production build)
- ✅ Python backend with all dependencies
- ✅ Nginx web server
- ✅ Self-signed SSL certificates (auto-generated)
- ✅ Supervisor to manage services
- ✅ Health checks

Everything runs in a single container - no external dependencies needed!

## Building the Image

### Build on Your Machine

```bash
# From project root
docker build -t docuscan:latest .

# This will:
# 1. Build frontend (Node.js multi-stage)
# 2. Install Python backend dependencies
# 3. Configure nginx + supervisor
# 4. Generate SSL certificates
# 5. Create production-ready image
```

### Save and Transfer Image

Build on your local machine and transfer to LXC:

```bash
# Build image
docker build -t docuscan:latest .

# Save to tar file
docker save docuscan:latest | gzip > docuscan-image.tar.gz

# Copy to LXC container (from host)
lxc file push docuscan-image.tar.gz your-container/tmp/

# Load in LXC container
lxc exec your-container -- bash
cd /tmp
docker load < docuscan-image.tar.gz
docker run -d -p 8443:443 -p 8080:80 --name docuscan docuscan:latest
```

## Configuration

### Environment Variables

Create a `.env` file or pass environment variables:

```bash
docker run -d \
  -p 8443:443 \
  -p 8080:80 \
  -e PAPERLESS_ENABLED=true \
  -e PAPERLESS_URL=http://your-paperless:8000 \
  -e PAPERLESS_TOKEN=your-token-here \
  --name docuscan \
  docuscan:latest
```

### Using Docker Compose

Edit `docker-compose.standalone.yml`:

```yaml
services:
  docuscan:
    environment:
      - PAPERLESS_ENABLED=true
      - PAPERLESS_URL=http://paperless:8000
      - PAPERLESS_TOKEN=your-token
```

Then:

```bash
docker compose -f docker-compose.standalone.yml up -d
```

### Custom SSL Certificates

Mount your own SSL certificates:

```yaml
volumes:
  - ./ssl/your-cert.crt:/app/ssl/docuscan.crt:ro
  - ./ssl/your-cert.key:/app/ssl/docuscan.key:ro
```

Or with docker run:

```bash
docker run -d \
  -p 8443:443 \
  -v $(pwd)/ssl/cert.crt:/app/ssl/docuscan.crt:ro \
  -v $(pwd)/ssl/cert.key:/app/ssl/docuscan.key:ro \
  docuscan:latest
```

## Port Mapping

Default ports:
- `443` - HTTPS (required for camera access)
- `80` - HTTP (redirects to HTTPS)

### Change External Ports

If port 8443 is in use:

```bash
# Map to different ports
docker run -d -p 9443:443 -p 9080:80 --name docuscan docuscan:latest

# Access at https://localhost:9443
```

### Integration with Existing Nginx

If you have nginx on your host/LXC, you can proxy to the container:

```nginx
# On host nginx
server {
    listen 443 ssl http2;
    server_name docuscan.yourdomain.com;

    ssl_certificate /path/to/cert.crt;
    ssl_certificate_key /path/to/cert.key;

    location / {
        proxy_pass https://localhost:8443;
        proxy_ssl_verify off;  # Since container uses self-signed cert
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Management Commands

### Start/Stop Container

```bash
# Start
docker start docuscan

# Stop
docker stop docuscan

# Restart
docker restart docuscan

# Remove
docker stop docuscan && docker rm docuscan
```

### View Logs

```bash
# All logs
docker logs docuscan

# Follow logs
docker logs -f docuscan

# Just backend
docker exec docuscan supervisorctl tail -f backend

# Just nginx
docker exec docuscan supervisorctl tail -f nginx
```

### Execute Commands Inside Container

```bash
# Access shell
docker exec -it docuscan /bin/bash

# Check service status
docker exec docuscan supervisorctl status

# Restart backend only
docker exec docuscan supervisorctl restart backend

# Restart nginx only
docker exec docuscan supervisorctl restart nginx
```

### Health Check

```bash
# Check if container is healthy
docker ps --filter "name=docuscan" --format "table {{.Names}}\t{{.Status}}"

# Manual health check
curl -k https://localhost:8443/health
```

## Updating the Application

### Rebuild and Replace

```bash
# Pull latest code
cd docu_scan
git pull origin main

# Rebuild image
docker build -t docuscan:latest .

# Stop and remove old container
docker stop docuscan
docker rm docuscan

# Start new container
docker run -d -p 8443:443 -p 8080:80 --name docuscan docuscan:latest
```

### Using Docker Compose

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker compose -f docker-compose.standalone.yml up -d --build
```

## Docker Compose Stack with Paperless

To run DocuScan with Paperless in the same network:

```yaml
version: '3.8'

services:
  docuscan:
    image: docuscan:latest
    ports:
      - "8443:443"
    environment:
      - PAPERLESS_ENABLED=true
      - PAPERLESS_URL=http://paperless:8000
      - PAPERLESS_TOKEN=${PAPERLESS_TOKEN}
    networks:
      - app-network

  paperless:
    image: ghcr.io/paperless-ngx/paperless-ngx:latest
    ports:
      - "8000:8000"
    environment:
      - PAPERLESS_URL=http://paperless.local
      - PAPERLESS_SECRET_KEY=change-me-to-random-string
    volumes:
      - paperless-data:/usr/src/paperless/data
      - paperless-media:/usr/src/paperless/media
    networks:
      - app-network

volumes:
  paperless-data:
  paperless-media:

networks:
  app-network:
```

## Troubleshooting

### Container Won't Start

Check logs:
```bash
docker logs docuscan
```

Common issues:
- Port already in use: Change `-p 8443:443` to different port
- Permission errors: Run with `--user root` (already default)

### Can't Access Camera

**Camera requires HTTPS!**

1. Make sure you're accessing via `https://` not `http://`
2. Accept the self-signed certificate warning in browser
3. Grant camera permissions when prompted

### Backend Not Responding

```bash
# Check if backend is running
docker exec docuscan supervisorctl status backend

# Restart backend
docker exec docuscan supervisorctl restart backend

# View backend logs
docker exec docuscan supervisorctl tail -f backend
```

### Nginx Errors

```bash
# Check nginx status
docker exec docuscan supervisorctl status nginx

# Test nginx config
docker exec docuscan nginx -t

# View nginx logs
docker exec docuscan tail -f /var/log/nginx/error.log
```

### Reset Everything

```bash
# Stop and remove container
docker stop docuscan
docker rm docuscan

# Remove image
docker rmi docuscan:latest

# Rebuild from scratch
docker build --no-cache -t docuscan:latest .
docker run -d -p 8443:443 -p 8080:80 --name docuscan docuscan:latest
```

## Performance Tuning

### Resource Limits

Limit container resources:

```bash
docker run -d \
  -p 8443:443 \
  --memory="512m" \
  --cpus="1" \
  --name docuscan \
  docuscan:latest
```

Or in docker-compose.yml:

```yaml
services:
  docuscan:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

## Security

### Production Checklist

- [ ] Replace self-signed certificates with proper SSL (Let's Encrypt)
- [ ] Configure firewall rules
- [ ] Set strong Paperless token if using integration
- [ ] Regular updates: `docker pull` latest image
- [ ] Monitor logs for suspicious activity
- [ ] Use docker secrets for sensitive env vars (in Swarm mode)

### Using Docker Secrets (Swarm)

```yaml
services:
  docuscan:
    secrets:
      - paperless_token
    environment:
      - PAPERLESS_TOKEN_FILE=/run/secrets/paperless_token

secrets:
  paperless_token:
    file: ./secrets/paperless_token.txt
```

## Backup

### Backup Configuration

```bash
# Backup environment variables
docker inspect docuscan | jq '.[0].Config.Env' > docuscan-env-backup.json

# Backup volumes (if using)
docker run --rm -v docuscan-logs:/data -v $(pwd):/backup \
  alpine tar czf /backup/docuscan-volumes.tar.gz /data
```

## File Locations Inside Container

| Component | Location |
|-----------|----------|
| Frontend | `/app/frontend/dist/` |
| Backend | `/app/backend/` |
| SSL Certs | `/app/ssl/` |
| Nginx config | `/etc/nginx/sites-available/default` |
| Supervisor config | `/etc/supervisor/conf.d/supervisord.conf` |
| Nginx logs | `/var/log/nginx/` |

## Build Arguments

Customize build process:

```bash
docker build \
  --build-arg NODE_VERSION=20 \
  --build-arg PYTHON_VERSION=3.11 \
  -t docuscan:custom .
```

## Next Steps

- Set up reverse proxy with Let's Encrypt
- Configure Paperless integration
- Set up automated backups
- Monitor with Portainer or similar tools
