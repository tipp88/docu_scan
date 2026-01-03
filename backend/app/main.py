from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import pdf, paperless

app = FastAPI(
    title="Document Scanner API",
    description="Backend API for privacy-first document scanning application",
    version="1.0.0"
)

# CORS Configuration - Allow all origins for local network
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for local network access
    allow_credentials=False,  # Must be False when allow_origins is ["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(pdf.router)
app.include_router(paperless.router)


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "paperless_enabled": settings.paperless_enabled,
        "webdav_enabled": settings.webdav_enabled,
        "smb_enabled": settings.smb_enabled,
        "ftp_enabled": settings.ftp_enabled
    }


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Document Scanner API",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": {
            "pdf": "/api/pdf",
            "paperless": "/api/paperless",
            "health": "/health"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.backend_host,
        port=settings.backend_port,
        reload=True,
        log_level=settings.log_level
    )
