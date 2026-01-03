import asyncio
import base64
from app.services.paperless_service import upload_to_paperless
from app.services.pdf_service import generate_pdf_from_images

# Test with a minimal 1x1 pixel image
test_image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

async def test():
    try:
        # First generate PDF
        print("Generating PDF...")
        pdf_bytes = await generate_pdf_from_images(
            images_base64=[f"data:image/png;base64,{test_image}"],
            title="Test Document"
        )
        print(f"PDF generated: {len(pdf_bytes)} bytes")
        
        # Then upload to Paperless
        print("Uploading to Paperless...")
        result = await upload_to_paperless(
            pdf_bytes=pdf_bytes,
            title="Test Document",
            tags=["docu_scan"]
        )
        print(f"Success! Result type: {type(result)}")
        print(f"Result value: {result}")
        print(f"Result repr: {repr(result)}")
    except Exception as e:
        print(f"Error: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()

asyncio.run(test())
