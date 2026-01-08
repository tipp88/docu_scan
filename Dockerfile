# Multi-stage build for DocuScan

# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./
RUN npm ci

# Copy frontend source
COPY frontend/ ./

# Build frontend for production
RUN npm run build

# Stage 2: Setup Backend
FROM python:3.11-slim AS backend-builder

WORKDIR /app/backend

# Install dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Stage 3: Final Runtime Image
FROM python:3.11-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    supervisor \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy Python packages from builder
COPY --from=backend-builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=backend-builder /usr/local/bin /usr/local/bin

# Copy backend application
COPY backend/ /app/backend/

# Copy built frontend
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Copy environment example
COPY backend/.env.example /app/backend/.env

# Create SSL directory and generate self-signed certificate
RUN mkdir -p /app/ssl && \
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /app/ssl/docuscan.key \
    -out /app/ssl/docuscan.crt \
    -subj "/C=US/ST=State/L=City/O=DocuScan/CN=localhost" \
    -addext "subjectAltName=DNS:localhost,DNS:docuscan,IP:127.0.0.1"

# Create data directory for persistent settings
RUN mkdir -p /app/data && chmod 777 /app/data

# Configure nginx
COPY docker/nginx.conf /etc/nginx/sites-available/default

# Configure supervisor
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Create nginx directories
RUN mkdir -p /var/log/nginx /var/lib/nginx/body /var/lib/nginx/fastcgi \
    && chown -R www-data:www-data /var/log/nginx /var/lib/nginx

# Expose ports
EXPOSE 80 443

# Volume for persistent settings
VOLUME ["/app/data"]

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f https://localhost/health || exit 1

# Start supervisor (manages nginx + uvicorn)
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
