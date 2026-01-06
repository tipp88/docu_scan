#!/bin/bash
set -e

echo "=========================================="
echo "DocuScan LXC Container Setup"
echo "=========================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/opt/docuscan"
BACKEND_PORT=3001

echo -e "${BLUE}[1/7] Updating system packages...${NC}"
apt-get update
apt-get install -y curl wget git python3 python3-pip python3-venv openssl

echo -e "${BLUE}[2/7] Installing Node.js 20.x...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi
echo "Node version: $(node --version)"
echo "npm version: $(npm --version)"

echo -e "${BLUE}[3/7] Creating project directory...${NC}"
mkdir -p $PROJECT_DIR
cp -r . $PROJECT_DIR/
cd $PROJECT_DIR

echo -e "${BLUE}[4/7] Generating self-signed SSL certificates...${NC}"
mkdir -p $PROJECT_DIR/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout $PROJECT_DIR/ssl/docuscan.key \
    -out $PROJECT_DIR/ssl/docuscan.crt \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=docuscan.local" \
    -addext "subjectAltName=DNS:docuscan.local,DNS:localhost,IP:127.0.0.1"

echo -e "${GREEN}SSL certificates created at $PROJECT_DIR/ssl/${NC}"

echo -e "${BLUE}[5/7] Setting up Python backend...${NC}"
cd $PROJECT_DIR/backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Create .env if not exists
if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${GREEN}Created backend .env file - please configure it${NC}"
fi

echo -e "${BLUE}[6/7] Installing frontend dependencies and building...${NC}"
cd $PROJECT_DIR/frontend
npm install
npm run build

echo -e "${BLUE}[7/7] Creating systemd service for backend...${NC}"
cat > /etc/systemd/system/docuscan-backend.service <<EOF
[Unit]
Description=DocuScan Backend API
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$PROJECT_DIR/backend
Environment="PATH=$PROJECT_DIR/backend/venv/bin"
ExecStart=$PROJECT_DIR/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port $BACKEND_PORT
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable docuscan-backend
systemctl start docuscan-backend

echo ""
echo -e "${GREEN}=========================================="
echo "Installation Complete!"
echo "==========================================${NC}"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: Nginx Configuration Required${NC}"
echo ""
echo "The backend is running on port $BACKEND_PORT"
echo "Frontend files are built at: $PROJECT_DIR/frontend/dist"
echo ""
echo -e "${BLUE}Add this to your EXISTING nginx configuration:${NC}"
echo ""
cat <<'NGINX_CONFIG'
# OPTION 1: Subdomain (Recommended)
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name docuscan.yourdomain.com;

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

# OR OPTION 2: Path-based (add to existing server block)
# location /docuscan/ {
#     alias /opt/docuscan/frontend/dist/;
#     try_files $uri $uri/ /docuscan/index.html;
# }
#
# location /docuscan/api/ {
#     proxy_pass http://localhost:3001/api/;
#     # ... same proxy settings as above
# }
NGINX_CONFIG

echo ""
echo -e "${BLUE}Quick Setup Commands:${NC}"
echo ""
echo "1. Edit your nginx config:"
echo "   nano /etc/nginx/sites-available/your-existing-site"
echo ""
echo "2. Add the configuration above"
echo ""
echo "3. Test and reload nginx:"
echo "   nginx -t && systemctl reload nginx"
echo ""
echo "4. Configure Paperless (optional):"
echo "   nano /opt/docuscan/backend/.env"
echo "   systemctl restart docuscan-backend"
echo ""
echo -e "${YELLOW}⚠️  Camera Access Requires HTTPS!${NC}"
echo "   - Self-signed cert created at: /opt/docuscan/ssl/"
echo "   - For production: Use Let's Encrypt (certbot)"
echo "   - Browsers will show security warning with self-signed cert"
echo ""
echo -e "${BLUE}Service Commands:${NC}"
echo "  Backend status:  systemctl status docuscan-backend"
echo "  Backend logs:    journalctl -u docuscan-backend -f"
echo "  Restart backend: systemctl restart docuscan-backend"
echo ""
echo -e "${GREEN}Installation files:${NC}"
echo "  Application:     $PROJECT_DIR/"
echo "  Frontend build:  $PROJECT_DIR/frontend/dist/"
echo "  SSL certs:       $PROJECT_DIR/ssl/"
echo "  Backend service: /etc/systemd/system/docuscan-backend.service"
echo ""
