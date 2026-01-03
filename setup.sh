#!/bin/bash

# Docu_Scan Setup Script
# Automates initial setup tasks

set -e

echo "========================================="
echo "Document Scanner Setup"
echo "========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: Please run this script from the Docu_Scan root directory"
    exit 1
fi

# Create .env from example if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📄 Creating .env from .env.example..."
    cp .env.example .env
    echo "✅ Created .env - Please edit it with your configuration"
else
    echo "⏭️  .env already exists, skipping"
fi

# Download OpenCV.js if not present
OPENCV_PATH="frontend/public/opencv/opencv.js"
if [ ! -f "$OPENCV_PATH" ]; then
    echo ""
    echo "📥 Downloading OpenCV.js (this may take a minute)..."
    mkdir -p frontend/public/opencv

    if command -v curl &> /dev/null; then
        curl -L https://docs.opencv.org/4.8.0/opencv.js -o "$OPENCV_PATH"
    elif command -v wget &> /dev/null; then
        wget -O "$OPENCV_PATH" https://docs.opencv.org/4.8.0/opencv.js
    else
        echo "❌ Error: Neither curl nor wget found. Please install one of them."
        exit 1
    fi

    # Verify file size (should be around 8-9 MB)
    FILE_SIZE=$(stat -f%z "$OPENCV_PATH" 2>/dev/null || stat -c%s "$OPENCV_PATH" 2>/dev/null)
    if [ "$FILE_SIZE" -lt 7000000 ]; then
        echo "❌ Error: OpenCV.js download seems incomplete (file too small)"
        rm "$OPENCV_PATH"
        exit 1
    fi

    echo "✅ OpenCV.js downloaded successfully ($(numfmt --to=iec-i --suffix=B $FILE_SIZE))"
else
    echo "⏭️  OpenCV.js already exists, skipping download"
fi

echo ""
echo "========================================="
echo "Setup Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Edit .env with your configuration"
echo "   - Set PAPERLESS_TOKEN if using Paperless-ngx"
echo "   - Configure storage connectors if needed"
echo ""
echo "2. Start the application:"
echo "   docker-compose up -d"
echo ""
echo "3. Access the app:"
echo "   http://localhost:5173"
echo ""
echo "For mobile access, use your LAN IP:"
echo "   http://$(hostname -I | awk '{print $1}'):5173"
echo ""
echo "For help, see README.md"
echo ""
