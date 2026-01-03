# Document Scanner - Privacy-First Web Application

A self-hosted, mobile-first web application for scanning documents with automatic edge detection, perspective correction, and seamless integration with Paperless-ngx.

## Features

- **Camera-Based Scanning**: Use your device camera to capture documents
- **Automatic Edge Detection**: Real-time document outline detection using OpenCV.js
- **Perspective Correction**: Automatically straighten and crop documents
- **Image Enhancement**: Color, grayscale, black & white, and enhanced modes
- **Multi-Page PDFs**: Scan multiple pages into a single PDF
- **Paperless-ngx Integration**: Direct upload to your document management system
- **Network Share Support**: Optional WebDAV/SMB/FTP storage
- **Privacy-First**: Runs entirely on your local network, no cloud services
- **Mobile Optimized**: Works great on iOS Safari and Android Chrome

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

### 2. Download OpenCV.js

```bash
cd frontend/public/opencv/
curl -L https://docs.opencv.org/4.8.0/opencv.js -o opencv.js
cd ../../..
```

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

- **Flash Button**: Toggle flash/torch (if available)
- **Capture Button**: Take a photo of the current frame
- **Edge Detection Overlay**:
  - 🟢 Green = High confidence, stable detection
  - 🟡 Yellow = Medium confidence
  - 🔴 Red = Low confidence

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

### Edge Detection Issues

**No Detection:**
- Ensure good lighting
- Hold camera steady
- Try manual crop mode (if implemented)

**False Positives:**
- Clear background helps
- Avoid complex patterns
- Adjust min area threshold in settings

### Paperless Upload Fails

- Verify Paperless-ngx URL is accessible
- Check API token is valid
- Ensure CORS is properly configured
- Check backend logs: `docker-compose logs backend`

### OpenCV.js Fails to Load

- Verify `frontend/public/opencv/opencv.js` exists
- Check file size (~8MB)
- Clear browser cache
- Check browser console for errors

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

## Roadmap

### Implemented ✅
- Camera capture with edge detection
- Real-time document outline overlay
- Temporal filtering for stable detection
- Multi-page workflow
- Zustand state management
- Docker deployment

### In Progress 🚧
- Manual corner adjustment
- Image enhancement filters
- PDF generation
- Paperless-ngx upload
- Network share connectors

### Planned 📋
- PWA support for offline use
- Batch processing
- OCR integration
- Custom enhancement presets
- Dark mode

## Contributing

This is a personal project for local document scanning. Feel free to fork and adapt for your own use.

## License

MIT License - See LICENSE file for details

## Credits

- **OpenCV.js**: Computer vision library
- **FastAPI**: Backend framework
- **React + Vite**: Frontend framework
- **Paperless-ngx**: Document management system

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review Docker logs: `docker-compose logs -f`
3. Check browser console for frontend errors
4. Verify environment variables are correct

---

**Built with privacy in mind. Your documents never leave your local network.**
