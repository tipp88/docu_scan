from fastapi import APIRouter, HTTPException
from typing import List, Optional
from pydantic import BaseModel
import base64

from app.services.paperless_service import (
    upload_to_paperless,
    get_paperless_tags,
    get_paperless_correspondents,
    get_paperless_document_types,
    test_paperless_connection
)
from app.services.pdf_service import generate_pdf_from_images

router = APIRouter(prefix="/api/paperless", tags=["paperless"])


class PaperlessUploadRequest(BaseModel):
    images: List[str]  # Base64-encoded images
    title: str
    tags: Optional[List[str]] = None
    correspondent: Optional[str] = None
    document_type: Optional[str] = None
    compression_quality: Optional[int] = None
    paperless_url: Optional[str] = None  # Override URL from frontend
    paperless_token: Optional[str] = None  # Override token from frontend


@router.post("/upload")
async def upload_document(request: PaperlessUploadRequest):
    """
    Generate PDF and upload to Paperless-ngx

    Args:
        request: PaperlessUploadRequest with images and metadata

    Returns:
        Upload result with document ID
    """
    try:
        if not request.images:
            raise HTTPException(status_code=400, detail="No images provided")

        # Generate PDF from images
        pdf_bytes = await generate_pdf_from_images(
            images_base64=request.images,
            title=request.title,
            compression_quality=request.compression_quality
        )

        # Upload to Paperless
        result = await upload_to_paperless(
            pdf_bytes=pdf_bytes,
            title=request.title,
            tags=request.tags,
            correspondent=request.correspondent,
            document_type=request.document_type,
            paperless_url=request.paperless_url,
            paperless_token=request.paperless_token
        )

        return {
            "success": True,
            "message": "Document uploaded successfully to Paperless-ngx",
            "document_id": result.get('id'),
            "file_size_bytes": len(pdf_bytes),
            "file_size_mb": round(len(pdf_bytes) / (1024 * 1024), 2)
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Upload failed: {str(e)}"
        )


@router.get("/tags")
async def list_tags():
    """
    Get available tags from Paperless-ngx

    Returns:
        List of tags
    """
    try:
        tags = await get_paperless_tags()
        return {"tags": tags}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch tags: {str(e)}"
        )


@router.get("/correspondents")
async def list_correspondents():
    """
    Get available correspondents from Paperless-ngx

    Returns:
        List of correspondents
    """
    try:
        correspondents = await get_paperless_correspondents()
        return {"correspondents": correspondents}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch correspondents: {str(e)}"
        )


@router.get("/document-types")
async def list_document_types():
    """
    Get available document types from Paperless-ngx

    Returns:
        List of document types
    """
    try:
        document_types = await get_paperless_document_types()
        return {"document_types": document_types}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch document types: {str(e)}"
        )


@router.get("/test-connection")
async def test_connection():
    """
    Test connection to Paperless-ngx

    Returns:
        Connection status
    """
    result = await test_paperless_connection()
    return result
