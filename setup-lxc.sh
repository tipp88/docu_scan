#!/bin/bash
set -e

echo "=========================================="
echo "DocuScan LXC Container Setup"
echo "=========================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/opt/docuscan"
NGINX_SITE="docuscan"
BACKEND_PORT=3001
FRONTEND_PORT=5175

echo -e "${BLUE}[1/8] Updating system packages...${NC}"
apt-get update
apt-get install -y curl wget git python3 python3-pip python3-venv nginx

echo -e "${BLUE}[2/8] Installing Node.js 20.x...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi
echo "Node version: $(node --version)"
echo "npm version: $(npm --version)"

echo -e "${BLUE}[3/8] Creating project directory...${NC}"
mkdir -p $PROJECT_DIR
cp -r . $PROJECT_DIR/
cd $PROJECT_DIR

echo -e "${BLUE}[4/8] Setting up Python backend...${NC}"
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

echo -e "${BLUE}[5/8] Installing frontend dependencies and building...${NC}"
cd $PROJECT_DIR/frontend
npm install
npm run build

echo -e "${BLUE}[6/8] Configuring nginx...${NC}"
cat > /etc/nginx/sites-available/$NGINX_SITE <<'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name docuscan.local;

    # Frontend - serve built static files
    location / {
        root /opt/docuscan/frontend/dist;
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache";
    }

    # Backend API proxy
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

    # Increase upload size for document images
    client_max_body_size 50M;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/$NGINX_SITE /etc/nginx/sites-enabled/$NGINX_SITE

# Test nginx configuration
nginx -t

echo -e "${BLUE}[7/8] Creating systemd service for backend...${NC}"
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

echo -e "${BLUE}[8/8] Starting services...${NC}"
systemctl daemon-reload
systemctl enable docuscan-backend
systemctl start docuscan-backend
systemctl reload nginx

echo ""
echo -e "${GREEN}=========================================="
echo "Installation Complete!"
echo "==========================================${NC}"
echo ""
echo "Backend API: http://localhost:$BACKEND_PORT"
echo "Frontend: http://localhost (via nginx)"
echo ""
echo "Service commands:"
echo "  - Backend status: systemctl status docuscan-backend"
echo "  - Backend logs: journalctl -u docuscan-backend -f"
echo "  - Restart backend: systemctl restart docuscan-backend"
echo "  - Nginx status: systemctl status nginx"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Configure backend/.env with your Paperless settings"
echo "2. Update nginx server_name to your domain"
echo "3. Set up SSL with certbot (optional)"
echo ""
echo -e "${GREEN}Access your scanner at: http://$(hostname -I | awk '{print $1}')${NC}"
