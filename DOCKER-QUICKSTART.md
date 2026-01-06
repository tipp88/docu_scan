# DocuScan - Docker Quick Start

## Build Once, Run Anywhere

Build the Docker image on your development machine, then deploy to your LXC container.

## Step 1: Build the Image (on your dev machine)

```bash
# Clone repository
git clone https://github.com/tipp88/docu_scan.git
cd docu_scan

# Build Docker image
chmod +x build-docker.sh
./build-docker.sh

# This creates a production-ready image with everything built
```

## Step 2: Save and Transfer to LXC

```bash
# Save image to file
docker save docuscan:latest | gzip > docuscan-image.tar.gz

# Transfer to LXC container (from host)
lxc file push docuscan-image.tar.gz your-container/tmp/
```

## Step 3: Load and Run in LXC

```bash
# Enter LXC container
lxc exec your-container -- bash

# Install Docker if needed
apt-get update && apt-get install -y docker.io
systemctl start docker
systemctl enable docker

# Load the image
cd /tmp
docker load < docuscan-image.tar.gz

# Run the container
docker run -d \
  -p 8443:443 \
  -p 8080:80 \
  --name docuscan \
  --restart unless-stopped \
  docuscan:latest
```

## Access

Visit: `https://localhost:8443` or `https://your-lxc-ip:8443`

**Note:** You'll see an SSL warning (self-signed cert). Click "Advanced" → "Proceed" to access.

The camera will now work because HTTPS is enabled!

## Configure Paperless (Optional)

```bash
docker stop docuscan
docker rm docuscan

docker run -d \
  -p 8443:443 \
  -p 8080:80 \
  -e PAPERLESS_ENABLED=true \
  -e PAPERLESS_URL=http://your-paperless-ip:8000 \
  -e PAPERLESS_TOKEN=your-api-token \
  --name docuscan \
  --restart unless-stopped \
  docuscan:latest
```

## Integration with Existing Nginx Dashboard

If you have nginx running on port 443 in your LXC, proxy to Docker:

```nginx
# Add to your nginx config
location /docuscan/ {
    proxy_pass https://localhost:8443/;
    proxy_ssl_verify off;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Access at: `https://your-domain/docuscan/`

## Management

```bash
# View logs
docker logs -f docuscan

# Stop
docker stop docuscan

# Start
docker start docuscan

# Restart
docker restart docuscan

# Remove
docker stop docuscan && docker rm docuscan
```

## Update

```bash
# On dev machine: rebuild
cd docu_scan
git pull origin main
./build-docker.sh
docker save docuscan:latest | gzip > docuscan-image.tar.gz

# Transfer and reload in LXC
lxc file push docuscan-image.tar.gz your-container/tmp/
lxc exec your-container -- bash -c "
  docker stop docuscan
  docker rm docuscan
  docker load < /tmp/docuscan-image.tar.gz
  docker run -d -p 8443:443 -p 8080:80 --name docuscan --restart unless-stopped docuscan:latest
"
```

## Advantages

- ✅ Build once, run anywhere
- ✅ No need to install Node.js/Python in LXC
- ✅ Everything pre-built and optimized
- ✅ HTTPS with SSL certificates included
- ✅ Easy updates and rollbacks
- ✅ Isolated from host system

See `DOCKER-DEPLOYMENT.md` for advanced configuration.
