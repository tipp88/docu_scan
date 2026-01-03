from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
import io
from typing import List
from pydantic import BaseModel

from app.services.pdf_service import (
    generate_pdf_from_images,
    get_pdf_file_size,
    estimate_pdf_size
)

router = APIRouter(prefix="/api/pdf", tags=["pdf"])


class PDFGenerateRequest(BaseModel):
    images: List[str]  # Base64-encoded images
    title: str = "Scanned Document"
    compression_quality: int | None = None


class PDFEstimateRequest(BaseModel):
    num_pages: int
    compression_quality: int = 85


@router.post("/generate")
async def generate_pdf(request: PDFGenerateRequest):
    """
    Generate a PDF from a list of base64-encoded images

    Args:
        request: PDFGenerateRequest with images and metadata

    Returns:
        PDF file as streaming response
    """
    try:
        if not request.images:
            raise HTTPException(status_code=400, detail="No images provided")

        # Generate PDF
        pdf_bytes = await generate_pdf_from_images(
            images_base64=request.images,
            title=request.title,
            compression_quality=request.compression_quality
        )

        # Get file size
        file_size = get_pdf_file_size(pdf_bytes)

        # Return as streaming response
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{request.title}.pdf"',
                "Content-Length": str(file_size),
                "X-File-Size": str(file_size)
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")


@router.post("/estimate-size")
async def estimate_size(request: PDFEstimateRequest):
    """
    Estimate PDF file size based on number of pages

    Args:
        request: PDFEstimateRequest with num_pages and compression_quality

    Returns:
        Estimated file size in bytes
    """
    try:
        estimated_size = estimate_pdf_size(
            num_pages=request.num_pages,
            compression_quality=request.compression_quality
        )

        return {
            "estimated_size_bytes": estimated_size,
            "estimated_size_mb": round(estimated_size / (1024 * 1024), 2),
            "num_pages": request.num_pages,
            "compression_quality": request.compression_quality
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Estimation failed: {str(e)}")
