from pydantic import BaseModel
from typing import List, Optional


class PDFGenerationRequest(BaseModel):
    """Request model for PDF generation"""
    images: List[str]  # Base64 encoded images
    title: Optional[str] = "Scanned Document"
    compression_quality: Optional[int] = 85


class PDFGenerationResponse(BaseModel):
    """Response model for PDF generation"""
    success: bool
    message: str
    file_size: Optional[int] = None  # in bytes


class PaperlessUploadRequest(BaseModel):
    """Request model for Paperless-ngx upload"""
    pdf_data: str  # Base64 encoded PDF
    title: str
    tags: Optional[List[str]] = []
    correspondent: Optional[str] = None
    document_type: Optional[str] = None


class PaperlessUploadResponse(BaseModel):
    """Response model for Paperless-ngx upload"""
    success: bool
    message: str
    document_id: Optional[int] = None
