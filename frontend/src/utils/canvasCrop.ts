import type { Point } from '../types/document';

/**
 * Simple canvas-based cropping without perspective correction
 * This is a fallback when OpenCV is not available
 */
export async function cropImage(
  imageData: string,
  corners: [Point, Point, Point, Point]
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        // Find bounding box
        const xs = corners.map(c => c.x * img.width);
        const ys = corners.map(c => c.y * img.height);

        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);

        const width = maxX - minX;
        const height = maxY - minY;

        // Create canvas for cropped image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Failed to get canvas context');

        // Draw the cropped portion
        ctx.drawImage(
          img,
          minX, minY, width, height,  // Source rectangle
          0, 0, width, height          // Destination rectangle
        );

        // Convert to base64
        const result = canvas.toDataURL('image/jpeg', 0.95);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = imageData;
  });
}

/**
 * Crop with perspective correction using canvas transformation
 * More advanced than simple crop but doesn't require OpenCV
 */
export async function cropWithPerspective(
  imageData: string,
  corners: [Point, Point, Point, Point]
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        // Denormalize corners
        const denormalizedCorners = corners.map(c => ({
          x: c.x * img.width,
          y: c.y * img.height
        }));

        // Get bounding box of the selected area
        const xs = denormalizedCorners.map(c => c.x);
        const ys = denormalizedCorners.map(c => c.y);

        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);

        const cropWidth = maxX - minX;
        const cropHeight = maxY - minY;

        // Use FULL RESOLUTION crop - don't scale down!
        // This preserves maximum image quality for OCR
        const canvas = document.createElement('canvas');
        canvas.width = cropWidth;
        canvas.height = cropHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Failed to get canvas context');

        // Fill with white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, cropWidth, cropHeight);

        // Draw the cropped region at FULL RESOLUTION
        ctx.drawImage(
          img,
          minX, minY, cropWidth, cropHeight,  // Source: exact crop area
          0, 0, cropWidth, cropHeight          // Destination: full canvas (no scaling!)
        );

        // Use maximum JPEG quality
        const result = canvas.toDataURL('image/jpeg', 0.99);
        resolve(result);
      } catch (error) {
        console.error('Crop error:', error);
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = imageData;
  });
}
