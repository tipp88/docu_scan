import { getOpenCV } from './opencv';
import type { Point } from '../types/document';

/**
 * Apply perspective transformation to straighten a document
 * @param imageData - Original image data
 * @param corners - Four corner points of the document
 * @param outputWidth - Desired output width (default: A4 aspect ratio)
 * @param outputHeight - Desired output height
 * @returns Transformed image as base64 string
 */
export async function applyPerspectiveTransform(
  imageData: string, // base64 image
  corners: [Point, Point, Point, Point],
  outputWidth?: number,
  outputHeight?: number
): Promise<string> {
  const cv = getOpenCV();
  if (!cv) {
    throw new Error('OpenCV not loaded');
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        // Create canvas to load the image
        const inputCanvas = document.createElement('canvas');
        inputCanvas.width = img.width;
        inputCanvas.height = img.height;
        const inputCtx = inputCanvas.getContext('2d');
        if (!inputCtx) throw new Error('Failed to get canvas context');

        inputCtx.drawImage(img, 0, 0);

        // Convert to OpenCV Mat
        const src = cv.imread(inputCanvas);

        // Define source points (the detected corners)
        const srcPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
          corners[0].x, corners[0].y, // top-left
          corners[1].x, corners[1].y, // top-right
          corners[2].x, corners[2].y, // bottom-right
          corners[3].x, corners[3].y, // bottom-left
        ]);

        // Calculate output dimensions if not provided
        if (!outputWidth || !outputHeight) {
          // Estimate document dimensions from corners
          const width1 = distance(corners[0], corners[1]);
          const width2 = distance(corners[3], corners[2]);
          const height1 = distance(corners[0], corners[3]);
          const height2 = distance(corners[1], corners[2]);

          const avgWidth = (width1 + width2) / 2;
          const avgHeight = (height1 + height2) / 2;

          // Use actual dimensions or default to A4 aspect ratio (1:1.414)
          outputWidth = Math.round(avgWidth);
          outputHeight = Math.round(avgHeight);

          // Ensure minimum size
          const minDimension = 800;
          if (outputWidth < minDimension) {
            const scale = minDimension / outputWidth;
            outputWidth = minDimension;
            outputHeight = Math.round(outputHeight * scale);
          }
        }

        // Define destination points (rectangle)
        const dstPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
          0, 0,                                // top-left
          outputWidth, 0,                      // top-right
          outputWidth, outputHeight,           // bottom-right
          0, outputHeight,                     // bottom-left
        ]);

        // Calculate perspective transform matrix
        const M = cv.getPerspectiveTransform(srcPoints, dstPoints);

        // Apply perspective transformation
        const dst = new cv.Mat();
        const dsize = new cv.Size(outputWidth, outputHeight);
        cv.warpPerspective(
          src,
          dst,
          M,
          dsize,
          cv.INTER_LINEAR,
          cv.BORDER_CONSTANT,
          new cv.Scalar(255, 255, 255, 255)
        );

        // Convert back to canvas
        const outputCanvas = document.createElement('canvas');
        cv.imshow(outputCanvas, dst);

        // Convert to base64
        const result = outputCanvas.toDataURL('image/jpeg', 0.95);

        // Clean up
        src.delete();
        dst.delete();
        M.delete();
        srcPoints.delete();
        dstPoints.delete();

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
 * Calculate Euclidean distance between two points
 */
function distance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Normalize corner coordinates from absolute pixels to 0-1 range
 */
export function normalizeCorners(
  corners: [Point, Point, Point, Point],
  imageWidth: number,
  imageHeight: number
): [Point, Point, Point, Point] {
  return corners.map(corner => ({
    x: corner.x / imageWidth,
    y: corner.y / imageHeight,
  })) as [Point, Point, Point, Point];
}

/**
 * Denormalize corner coordinates from 0-1 range to absolute pixels
 */
export function denormalizeCorners(
  corners: [Point, Point, Point, Point],
  imageWidth: number,
  imageHeight: number
): [Point, Point, Point, Point] {
  return corners.map(corner => ({
    x: corner.x * imageWidth,
    y: corner.y * imageHeight,
  })) as [Point, Point, Point, Point];
}
