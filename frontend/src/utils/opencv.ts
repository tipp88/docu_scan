// OpenCV.js utilities
// OpenCV.js is loaded via script tag in index.html for reliability

let cv: any = null;

/**
 * Get the loaded OpenCV.js instance
 * Returns null if not yet loaded
 * OpenCV is loaded via async script tag in index.html
 */
export function getOpenCV(): any {
  // Check module cache first
  if (cv) {
    return cv;
  }

  // Check if OpenCV is available in window (loaded via HTML script tag)
  if ((window as any).cv && (window as any).cv.Mat) {
    cv = (window as any).cv;
    return cv;
  }

  return null;
}

/**
 * Check if OpenCV is loaded and ready
 */
export function isOpenCVReady(): boolean {
  return getOpenCV() !== null;
}

/**
 * Convert ImageData to OpenCV Mat
 */
export function imageDataToMat(imageData: ImageData): any {
  if (!cv) throw new Error('OpenCV not loaded');

  const mat = cv.matFromImageData(imageData);
  return mat;
}

/**
 * Convert OpenCV Mat to ImageData
 */
export function matToImageData(mat: any): ImageData {
  if (!cv) throw new Error('OpenCV not loaded');

  const canvas = document.createElement('canvas');
  canvas.width = mat.cols;
  canvas.height = mat.rows;
  cv.imshow(canvas, mat);

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/**
 * Convert canvas to OpenCV Mat
 */
export function canvasToMat(canvas: HTMLCanvasElement): any {
  if (!cv) throw new Error('OpenCV not loaded');

  return cv.imread(canvas);
}

/**
 * Detect document edges using OpenCV
 * Returns 4 corner points or null if detection fails
 */
export interface DetectedCorners {
  topLeft: { x: number; y: number };
  topRight: { x: number; y: number };
  bottomRight: { x: number; y: number };
  bottomLeft: { x: number; y: number };
  confidence: number; // 0-1, higher is better
}

export function detectDocumentEdges(
  mat: any,
  minArea: number = 10000
): DetectedCorners | null {
  if (!cv) throw new Error('OpenCV not loaded');

  const gray = new cv.Mat();
  const blurred = new cv.Mat();
  const edges = new cv.Mat();
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();

  try {
    // Convert to grayscale
    cv.cvtColor(mat, gray, cv.COLOR_RGBA2GRAY);

    // Apply Gaussian blur
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);

    // Canny edge detection
    cv.Canny(blurred, edges, 50, 150);

    // Find contours
    cv.findContours(
      edges,
      contours,
      hierarchy,
      cv.RETR_LIST,
      cv.CHAIN_APPROX_SIMPLE
    );

    // Find the largest quadrilateral contour
    let maxArea = minArea;
    let bestContour: any = null;

    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i);
      const area = cv.contourArea(contour);

      if (area > maxArea) {
        const perimeter = cv.arcLength(contour, true);
        const approx = new cv.Mat();
        cv.approxPolyDP(contour, approx, 0.02 * perimeter, true);

        // Check if it's a quadrilateral
        if (approx.rows === 4) {
          const aspectRatio = getAspectRatio(approx);

          // Filter by aspect ratio (typical documents are ~1:1.4)
          if (aspectRatio >= 0.5 && aspectRatio <= 2.0) {
            maxArea = area;
            if (bestContour) bestContour.delete();
            bestContour = approx;
          } else {
            approx.delete();
          }
        } else {
          approx.delete();
        }
      }

      contour.delete();
    }

    if (!bestContour) {
      return null;
    }

    // Extract corner points
    const corners = extractCorners(bestContour);
    bestContour.delete();

    // Calculate confidence based on area ratio
    const imageArea = mat.rows * mat.cols;
    const confidence = Math.min(maxArea / (imageArea * 0.8), 1);

    return {
      ...corners,
      confidence,
    };
  } finally {
    // Clean up
    gray.delete();
    blurred.delete();
    edges.delete();
    contours.delete();
    hierarchy.delete();
  }
}

function getAspectRatio(contour: any): number {
  const rect = cv.minAreaRect(contour);
  const width = rect.size.width;
  const height = rect.size.height;
  return Math.min(width, height) / Math.max(width, height);
}

function extractCorners(contour: any): Omit<DetectedCorners, 'confidence'> {
  const points = [];
  for (let i = 0; i < contour.rows; i++) {
    points.push({
      x: contour.data32S[i * 2],
      y: contour.data32S[i * 2 + 1],
    });
  }

  // Order points: top-left, top-right, bottom-right, bottom-left
  const sorted = orderPoints(points);

  return {
    topLeft: sorted[0],
    topRight: sorted[1],
    bottomRight: sorted[2],
    bottomLeft: sorted[3],
  };
}

function orderPoints(points: Array<{ x: number; y: number }>) {
  // Sort by y-coordinate
  points.sort((a, b) => a.y - b.y);

  // Top two points
  const top = points.slice(0, 2).sort((a, b) => a.x - b.x);
  // Bottom two points
  const bottom = points.slice(2, 4).sort((a, b) => a.x - b.x);

  return [top[0], top[1], bottom[1], bottom[0]];
}
