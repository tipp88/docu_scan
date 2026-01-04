# DocuScan - Privacy-First Document Scanner

A self-hosted, mobile-first web application for scanning documents with manual corner adjustment, perspective correction, and seamless integration with Paperless-ngx.

![Design Preview](https://img.shields.io/badge/Design-Precision_Instrument-fbbf24?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Active-5cb576?style=for-the-badge)

## Features

### Core Functionality
- **📸 Camera-Based Scanning**: High-resolution capture using your device camera (up to 4K)
- **✋ Manual Corner Adjustment**: Precise document boundary control with interactive draggable handles
- **🔄 Perspective Correction**: Automatically straighten and crop documents using OpenCV.js
- **🎨 Image Enhancement**: Color, grayscale, black & white, and enhanced modes
- **📄 Multi-Page PDFs**: Scan multiple pages into a single PDF document
- **📤 Paperless-ngx Integration**: Direct upload with real-time progress tracking
- **🔒 Privacy-First**: Runs entirely on your local network, no cloud services
- **📱 Mobile Optimized**: Responsive design for iOS Safari and Android Chrome
- **⚡ Progressive Web App**: Install on home screen for app-like experience

### Design System: "Precision Instrument"
- **Refined Brutalist-Industrial Aesthetic**: Swiss design influence with geometric precision
- **Typography**: Syne (display) + Outfit (body) for distinctive character
- **Color Palette**: Deep charcoal base with warm amber accents
- **Visual Effects**: Animated scan lines, glowing elements, subtle noise texture
- **Micro-interactions**: Smooth transitions, hover states, and staggered animations

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)
- Python 3.11+ (for local development)

### 1. Clone and Setup

```bash
cd Docu_Scan
cp .env.example .env
# Edit .env with your configuration (see Configuration section)
```

### 2. Download OpenCV.js (Optional but Recommended)

OpenCV.js provides superior perspective correction. A fallback canvas-based method is used if OpenCV is not available.

```bash
cd frontend/public/opencv/
curl -L https://docs.opencv.org/4.8.0/opencv.js -o opencv.js
cd ../../..
```

**What OpenCV is used for:**
- ✅ Perspective transformation (warping documents based on corner points)
- ✅ Image enhancement filters (grayscale, black & white, etc.)
- ❌ ~~Edge detection~~ (currently disabled - manual corner adjustment only)

**Without OpenCV:**
- Simple canvas-based cropping (crops to bounding box, no perspective correction)
- Limited image enhancement options

### 3. Deploy with Docker

```bash
docker-compose up -d
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8080

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

#### Backend API
```bash
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8080
BACKEND_CORS_ORIGINS=http://localhost:5173
```

#### Paperless-ngx Integration
```bash
PAPERLESS_ENABLED=true
PAPERLESS_URL=http://192.168.178.113:8000
PAPERLESS_TOKEN=your_api_token_here
PAPERLESS_DEFAULT_TAGS=scanned,mobile
```

**Getting Paperless API Token:**
1. Log into your Paperless-ngx instance
2. Go to Settings → API Tokens
3. Create a new token
4. Copy and paste it into your `.env` file

#### Network Storage (Optional)

**WebDAV:**
```bash
WEBDAV_ENABLED=true
WEBDAV_URL=https://your-nextcloud.com/remote.php/dav/files/username/
WEBDAV_USERNAME=your_username
WEBDAV_PASSWORD=your_password
WEBDAV_DEFAULT_PATH=/Scans/
```

**SMB/CIFS:**
```bash
SMB_ENABLED=true
SMB_SERVER=192.168.178.100
SMB_SHARE=documents
SMB_USERNAME=your_username
SMB_PASSWORD=your_password
SMB_DEFAULT_PATH=/Scans/
```

**FTP:**
```bash
FTP_ENABLED=true
FTP_HOST=192.168.178.100
FTP_PORT=21
FTP_USERNAME=your_username
FTP_PASSWORD=your_password
FTP_DEFAULT_PATH=/Scans/
```

## Development

### Frontend Development

```bash
cd frontend
npm install
npm run dev
```

### Backend Development

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m app.main
```

### Project Structure

```
Docu_Scan/
├── frontend/              # Vite + React + TypeScript
│   ├── src/
│   │   ├── components/
│   │   │   ├── Camera/    # Camera capture and edge detection
│   │   │   ├── Editor/    # Image editing and enhancement
│   │   │   └── Export/    # PDF export and upload
│   │   ├── hooks/         # React hooks
│   │   ├── stores/        # Zustand state management
│   │   ├── utils/         # Utilities (OpenCV, transforms)
│   │   └── workers/       # Web Workers for heavy processing
│   └── public/opencv/     # OpenCV.js WASM files
│
├── backend/               # FastAPI + Python
│   └── app/
│       ├── routers/       # API endpoints
│       ├── services/      # Business logic
│       │   └── storage/   # WebDAV/SMB/FTP connectors
│       └── models/        # Data models
│
├── docker-compose.yml
├── .env.example
└── README.md
```

## Usage

### Basic Workflow

1. **Open the App**: Navigate to http://your-lan-ip:5173 on your mobile device
2. **Grant Camera Permission**: Allow access when prompted
3. **Position Document**: Point camera at a document
4. **Wait for Detection**: Green overlay indicates good detection
5. **Capture**: Tap the capture button
6. **Review**: Switch to Gallery view to see captured pages
7. **Export**: Generate PDF and/or upload to Paperless-ngx

### Camera Controls

- **Flash Button**: Toggle flash/torch (if device supports it)
- **Capture Button**: Take a photo of the current frame
- **Scan Line Animation**: Visual guide for document positioning
- **Corner Frame Overlay**: Amber markers showing recommended document placement

After capture, you'll enter **Corner Adjustment Mode**:
- Drag the numbered corner handles (1-4) to precisely frame your document
- Precision grid lines help align the document accurately
- Selection area shown with glowing amber border

### Gallery Features

- **Reorder Pages**: Drag and drop thumbnails
- **Delete Pages**: Remove unwanted captures
- **Edit Pages**: Re-crop or adjust individual pages
- **Clear All**: Start fresh with a new document

## Troubleshooting

### Camera Not Working

**iOS Safari:**
- Requires HTTPS connection, even on LAN
- Use a self-signed certificate or mDNS (docu-scan.local)
- Check Settings → Safari → Camera permission

**Android Chrome:**
- Check site permissions in Chrome settings
- Ensure camera is not in use by another app

### Backend Not Running

**Upload Stuck or Failing:**
- Ensure backend server is running: `cd backend && ./venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8888 --reload`
- Verify backend is accessible at `http://localhost:8888`
- Check backend logs for errors
- Test connection: `curl http://localhost:8888/api/paperless/test-connection`

### Corner Adjustment Issues

**Handles Not Responding:**
- Ensure you're tapping directly on the numbered circles
- On mobile, touch threshold is larger (easier to grab)
- Try zooming out if the image is too large

### Paperless Upload Fails

- Verify Paperless-ngx URL is accessible
- Check API token is valid
- Ensure CORS is properly configured
- Check backend logs: `docker-compose logs backend`

### OpenCV.js Fails to Load (Optional)

If OpenCV fails to load, the app will automatically fall back to canvas-based cropping (no perspective correction).

**To use full perspective correction:**
- Verify `frontend/public/opencv/opencv.js` exists and is ~8MB
- Download from: https://docs.opencv.org/4.8.0/opencv.js
- Clear browser cache
- Check browser console for errors

**Note:** Edge detection is disabled. OpenCV is only used for perspective transformation and image enhancement.

### Network Share Connection Issues

**WebDAV:**
- Test URL in browser first
- Ensure credentials are correct
- Check if HTTPS is required

**SMB:**
- Verify SMB server is accessible
- Check firewall settings
- Ensure SMB version compatibility

**FTP:**
- Test with FTP client first
- Check passive vs active mode
- Verify port is open

## Security Considerations

- **LAN-Only**: App is designed for local network use only
- **API Tokens**: Store securely in environment variables
- **HTTPS**: Recommended for iOS camera access
- **Credentials**: Never commit .env file to version control
- **CORS**: Restrict origins to known frontends only

## Performance Tips

### Mobile Devices

- Edge detection runs at 5-10 FPS to save battery
- Processing is done in Web Workers to keep UI responsive
- Large documents (>10 pages) may use more memory

### Optimization

- Adjust `VITE_EDGE_DETECTION_FPS` (default: 8)
- Set `PDF_COMPRESSION_QUALITY` (default: 85)
- Limit `PDF_MAX_IMAGE_SIZE` (default: 3000px)

## Status & Roadmap

### Completed ✅
- ✅ Camera capture with 4K resolution support
- ✅ Manual corner adjustment with interactive handles
- ✅ Image enhancement filters (color, grayscale, B&W, enhanced)
- ✅ Perspective correction using OpenCV.js
- ✅ Multi-page document workflow
- ✅ Page reordering and rotation
- ✅ PDF generation
- ✅ Paperless-ngx integration with real-time upload progress
- ✅ PWA support for offline use
- ✅ Zustand state management
- ✅ Docker deployment
- ✅ Refined design system with custom component library
- ✅ Mobile-optimized touch interactions

### Planned 📋
- 📋 Automatic edge detection (currently disabled - manual mode only)
- 📋 Network share connectors (WebDAV/SMB/FTP)
- 📋 Batch processing for multiple documents
- 📋 OCR integration with text extraction
- 📋 Custom enhancement presets
- 📋 Document templates (receipts, business cards, etc.)
- 📋 Export history and document library

## Contributing

This is a personal project for local document scanning. Feel free to fork and adapt for your own use.

## License

MIT License - See LICENSE file for details

## Credits

### Technology Stack
- **OpenCV.js**: Computer vision and image processing
- **FastAPI**: Python backend framework
- **React 19 + TypeScript**: Frontend framework
- **Vite**: Build tool and dev server
- **Tailwind CSS v4**: Utility-first CSS framework
- **Zustand**: Lightweight state management
- **Paperless-ngx**: Document management integration

### Design
- **Typography**: [Syne](https://fonts.google.com/specimen/Syne) by Bonjour Monde, [Outfit](https://fonts.google.com/specimen/Outfit) by Rodrigo Fuenzalida
- **Design System**: "Precision Instrument" - Refined brutalist-industrial aesthetic
- **Icons**: Custom SVG icons based on Heroicons

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review Docker logs: `docker-compose logs -f`
3. Check browser console for frontend errors
4. Verify environment variables are correct

---

**Built with privacy in mind. Your documents never leave your local network.**
