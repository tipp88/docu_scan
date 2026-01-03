import { getOpenCV } from './opencv';
import type { Point } from '../types/document';

/**
 * Detect document edges in an image using OpenCV
 * Returns null if no document is detected
 */
export async function detectDocumentEdges(
  imageData: string
): Promise<[Point, Point, Point, Point] | null> {
  const cv = getOpenCV();
  if (!cv) {
    console.warn('OpenCV not available for edge detection');
    return null;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        // Create canvas to load the image
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }

        ctx.drawImage(img, 0, 0);

        // Convert to OpenCV Mat
        const src = cv.imread(canvas);
        const gray = new cv.Mat();
        const blurred = new cv.Mat();
        const edges = new cv.Mat();
        const hierarchy = new cv.Mat();
        const contours = new cv.MatVector();

        // Convert to grayscale
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

        // Apply Gaussian blur to reduce noise
        cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);

        // Canny edge detection
        cv.Canny(blurred, edges, 50, 150);

        // Find contours
        cv.findContours(
          edges,
          contours,
          hierarchy,
          cv.RETR_EXTERNAL,
          cv.CHAIN_APPROX_SIMPLE
        );

        // Find the largest contour that is a quadrilateral
        let bestContour: any = null;
        let maxArea = 0;
        const imageArea = img.width * img.height;

        for (let i = 0; i < contours.size(); i++) {
          const contour = contours.get(i);
          const area = cv.contourArea(contour);

          // Filter by area (must be at least 10% of image)
          if (area < imageArea * 0.1) continue;

          // Approximate the contour to a polygon
          const peri = cv.arcLength(contour, true);
          const approx = new cv.Mat();
          cv.approxPolyDP(contour, approx, 0.02 * peri, true);

          // Check if it's a quadrilateral (4 points)
          if (approx.rows === 4 && area > maxArea) {
            // Check aspect ratio (should be roughly document-like)
            const rect = cv.boundingRect(approx);
            const aspectRatio = Math.max(rect.width, rect.height) / Math.min(rect.width, rect.height);

            // Accept aspect ratios between 1:1 (square) and 2:1 (document)
            if (aspectRatio >= 1.0 && aspectRatio <= 2.5) {
              maxArea = area;
              if (bestContour) bestContour.delete();
              bestContour = approx;
            } else {
              approx.delete();
            }
          } else {
            approx.delete();
          }

          contour.delete();
        }

        // Clean up
        src.delete();
        gray.delete();
        blurred.delete();
        edges.delete();
        hierarchy.delete();
        contours.delete();

        if (bestContour) {
          // Extract the 4 corner points and normalize to 0-1 range
          const corners: Point[] = [];
          for (let i = 0; i < 4; i++) {
            const point = bestContour.data32S.slice(i * 2, i * 2 + 2);
            corners.push({
              x: point[0] / img.width,
              y: point[1] / img.height,
            });
          }

          bestContour.delete();

          // Order corners: TL, TR, BR, BL
          const ordered = orderCorners(corners);
          resolve(ordered);
        } else {
          resolve(null);
        }
      } catch (error) {
        console.error('Edge detection error:', error);
        resolve(null);
      }
    };

    img.onerror = () => {
      console.error('Failed to load image for edge detection');
      resolve(null);
    };

    img.src = imageData;
  });
}

/**
 * Order corners in the correct sequence: TL, TR, BR, BL
 */
function orderCorners(corners: Point[]): [Point, Point, Point, Point] {
  // Sort by y-coordinate to get top and bottom pairs
  const sorted = [...corners].sort((a, b) => a.y - b.y);

  // Top two points
  const top = sorted.slice(0, 2).sort((a, b) => a.x - b.x);
  // Bottom two points
  const bottom = sorted.slice(2, 4).sort((a, b) => a.x - b.x);

  return [
    top[0],    // TL
    top[1],    // TR
    bottom[1], // BR
    bottom[0], // BL
  ];
}

/**
 * Temporal filter to smooth jittery corner detection
 * Averages the last N frames to reduce jitter
 */
export class TemporalFilter {
  private history: [Point, Point, Point, Point][] = [];
  private maxHistory: number;

  constructor(maxHistory: number = 5) {
    this.maxHistory = maxHistory;
  }

  add(corners: [Point, Point, Point, Point]): [Point, Point, Point, Point] {
    this.history.push(corners);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    // Average all frames in history
    const averaged: [Point, Point, Point, Point] = [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ];

    for (const frame of this.history) {
      for (let i = 0; i < 4; i++) {
        averaged[i].x += frame[i].x;
        averaged[i].y += frame[i].y;
      }
    }

    for (let i = 0; i < 4; i++) {
      averaged[i].x /= this.history.length;
      averaged[i].y /= this.history.length;
    }

    return averaged;
  }

  clear() {
    this.history = [];
  }
}
