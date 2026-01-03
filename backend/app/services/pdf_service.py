import io
import base64
from typing import List
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from PIL import Image
from datetime import datetime
from app.config import settings


async def generate_pdf_from_images(
    images_base64: List[str],
    title: str = "Scanned Document",
    compression_quality: int = None
) -> bytes:
    """
    Generate a PDF from a list of base64-encoded images

    Args:
        images_base64: List of base64-encoded images (with or without data URI prefix)
        title: PDF title metadata
        compression_quality: JPEG compression quality (1-100), uses config default if None

    Returns:
        PDF file as bytes
    """
    if compression_quality is None:
        compression_quality = settings.pdf_compression_quality

    # Create PDF in memory
    pdf_buffer = io.BytesIO()
    c = canvas.Canvas(pdf_buffer, pagesize=A4)

    # Set PDF metadata
    c.setTitle(title)
    c.setAuthor("Document Scanner")
    c.setSubject("Scanned Document")
    c.setCreator("Document Scanner v1.0")

    # A4 dimensions
    page_width, page_height = A4

    for idx, img_base64 in enumerate(images_base64):
        try:
            # Remove data URI prefix if present
            if ',' in img_base64:
                img_base64 = img_base64.split(',', 1)[1]

            # Decode base64 to image bytes
            img_bytes = base64.b64decode(img_base64)
            img = Image.open(io.BytesIO(img_bytes))

            # Convert to RGB if needed (removes alpha channel)
            if img.mode != 'RGB':
                # Create white background
                background = Image.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'RGBA':
                    background.paste(img, mask=img.split()[3])  # Use alpha as mask
                else:
                    background.paste(img)
                img = background

            # Resize if image is too large
            max_size = settings.pdf_max_image_size
            if img.width > max_size or img.height > max_size:
                img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)

            # Compress image
            img_buffer = io.BytesIO()
            img.save(
                img_buffer,
                'JPEG',
                quality=compression_quality,
                optimize=True,
                progressive=True
            )
            img_buffer.seek(0)

            # Calculate scaling to fit page while maintaining aspect ratio
            img_aspect = img.width / img.height
            page_aspect = page_width / page_height

            if img_aspect > page_aspect:
                # Image is wider than page
                draw_width = page_width
                draw_height = page_width / img_aspect
            else:
                # Image is taller than page
                draw_height = page_height
                draw_width = page_height * img_aspect

            # Center image on page
            x_offset = (page_width - draw_width) / 2
            y_offset = (page_height - draw_height) / 2

            # Draw image on PDF
            c.drawImage(
                ImageReader(img_buffer),
                x_offset,
                y_offset,
                width=draw_width,
                height=draw_height,
                preserveAspectRatio=True
            )

            # DON'T add page numbers - this causes OCRmyPDF to skip OCR!
            # The PDF must be pure images for Paperless OCR to work

            # Move to next page if not the last image
            if idx < len(images_base64) - 1:
                c.showPage()

        except Exception as e:
            print(f"Error processing image {idx + 1}: {e}")
            # Skip this image and continue
            continue

    # Save PDF
    c.save()

    # Get PDF bytes
    pdf_buffer.seek(0)
    return pdf_buffer.getvalue()


def get_pdf_file_size(pdf_bytes: bytes) -> int:
    """Get the size of PDF in bytes"""
    return len(pdf_bytes)


def estimate_pdf_size(num_pages: int, compression_quality: int = 85) -> int:
    """
    Estimate PDF file size based on number of pages

    Args:
        num_pages: Number of pages
        compression_quality: Compression quality (1-100)

    Returns:
        Estimated file size in bytes
    """
    # Rough estimates based on compression quality
    if compression_quality >= 90:
        bytes_per_page = 400000  # ~400KB per page
    elif compression_quality >= 75:
        bytes_per_page = 250000  # ~250KB per page
    else:
        bytes_per_page = 150000  # ~150KB per page

    # Add PDF overhead (usually ~10KB)
    overhead = 10000

    return (num_pages * bytes_per_page) + overhead
