# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **🤖 Automatic Image Enhancement**: Auto-detects best enhancement mode for each page
  - Analyzes image contrast and brightness
  - Chooses between Grayscale, B&W, or Enhanced mode
  - Optimized for OCR and readability
- **⚙️ Settings Menu**: Comprehensive settings interface
  - Configure Paperless-ngx URL, API token, and default tags
  - Set default image enhancement mode (auto or manual)
  - Settings stored in browser localStorage
  - Beautiful modal UI matching design system
- **🎨 Manual Enhancement Controls**: Per-page enhancement mode selector
  - Appears on hover over page thumbnails
  - 4 modes: Color (📸), Grayscale (⬜), B&W (⬛), Enhanced (✨)
  - Real-time reprocessing when changing modes
- Complete UI redesign with "Precision Instrument" design system
- Custom typography: Syne (display) and Outfit (body) fonts
- Warm amber accent color (#fbbf24) with deep charcoal base palette
- Animated scan line in camera view
- Amber corner markers framing document area
- Vignette overlay for visual depth
- Enhanced corner adjuster with glowing borders and numbered handles
- Precision grid lines in corner adjustment mode
- Frosted glass header with amber-glowing logo badge
- Card hover animations with lift effects
- Staggered slide-up animations for page grid
- Subtle noise texture overlay throughout UI
- Real-time upload progress tracking with XMLHttpRequest
- Export modal with refined progress bar and glow effects

### Changed
- Migrated from Tailwind CSS v3 to v4 (CSS-based configuration)
- Updated color palette from generic grays/blues to carbon/amber theme
- Improved page thumbnail design with gradient overlays
- Enhanced button styles with consistent design language
- Refined navigation tabs with active state indicators
- Updated empty states with better visual hierarchy
- Paperless tags now configurable via settings (no longer hardcoded)
- Default enhancement mode is now auto-detect (was color/no processing)

### Fixed
- Upload progress getting stuck at 30% during Paperless-ngx uploads
- Removed unused Tailwind config file (migrated to CSS @theme)
- **Image enhancement causing app freeze** - Resolved by loading OpenCV via HTML script tag
  - Root cause: async/await promise chain had a resolution bug where resolve() was called but promise never completed
  - Solution: Load OpenCV directly via `<script async>` in index.html, bypassing JavaScript promise complexity
  - Enhancement modes (grayscale, B&W, enhanced) now work reliably without freezing

## [0.2.0] - 2025-01-04

### Added
- Manual corner adjustment with interactive draggable handles
- Image enhancement filters (color, grayscale, B&W, enhanced)
- PDF generation from scanned pages
- Paperless-ngx integration with direct upload
- Multi-page document workflow
- Page reordering with drag-and-drop
- Page rotation support
- Zustand state management
- Progressive Web App (PWA) support
- Docker deployment configuration

### Changed
- Disabled automatic edge detection (now manual corner adjustment only)
- Improved camera capture with 4K resolution support
- Enhanced perspective transformation using OpenCV

### Fixed
- Camera initialization issues on mobile devices
- Edge detection causing camera crashes
- Touch detection threshold for mobile devices

## [0.1.0] - 2025-01-01

### Added
- Initial release
- Camera-based document capture
- Real-time edge detection with OpenCV.js
- Temporal filtering for stable detection
- Mobile-optimized interface
- FastAPI backend
- React + TypeScript frontend
- Vite build system
- Environment-based configuration

---

**Legend:**
- 🎨 Design / UI changes
- ✨ New features
- 🐛 Bug fixes
- 🔧 Configuration / Infrastructure
- 📝 Documentation
- ⚡ Performance improvements
