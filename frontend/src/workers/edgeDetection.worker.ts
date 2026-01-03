/// <reference lib="webworker" />

// Edge Detection Worker
// Runs OpenCV.js edge detection in a Web Worker to avoid blocking the main thread

let cv: any = null;
let isInitialized = false;

interface EdgeDetectionRequest {
  type: 'init' | 'detect';
  imageData?: ImageData;
  minArea?: number;
}

interface EdgeDetectionResponse {
  type: 'init-complete' | 'detection-result' | 'error';
  corners?: {
    topLeft: { x: number; y: number };
    topRight: { x: number; y: number };
    bottomRight: { x: number; y: number };
    bottomLeft: { x: number; y: number };
    confidence: number;
  } | null;
  error?: string;
}

// Initialize OpenCV in the worker
async function initializeOpenCV(): Promise<void> {
  if (isInitialized) return;

  try {
    // Import OpenCV.js
    // Note: This assumes opencv.js is available via public URL
    importScripts('/opencv/opencv.js');

    // Wait for cv to be available
    await new Promise<void>((resolve, reject) => {
      const checkReady = setInterval(() => {
        if ((self as any).cv && (self as any).cv.Mat) {
          clearInterval(checkReady);
          cv = (self as any).cv;
          isInitialized = true;
          resolve();
        }
      }, 100);

      setTimeout(() => {
        clearInterval(checkReady);
        if (!isInitialized) {
          reject(new Error('OpenCV initialization timeout'));
        }
      }, 30000);
    });

    console.log('[Worker] OpenCV.js initialized');
  } catch (error) {
    console.error('[Worker] Failed to initialize OpenCV:', error);
    throw error;
  }
}

// Detect document edges
function detectEdges(
  imageData: ImageData,
  minArea: number = 10000
): EdgeDetectionResponse['corners'] {
  if (!cv || !isInitialized) {
    throw new Error('OpenCV not initialized');
  }

  const src = cv.matFromImageData(imageData);
  const gray = new cv.Mat();
  const blurred = new cv.Mat();
  const edges = new cv.Mat();
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();

  try {
    // Convert to grayscale
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

    // Apply Gaussian blur to reduce noise
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);

    // Canny edge detection
    cv.Canny(blurred, edges, 50, 150);

    // Morphological operations to close gaps
    const kernel = cv.Mat.ones(5, 5, cv.CV_8U);
    cv.morphologyEx(edges, edges, cv.MORPH_CLOSE, kernel);
    kernel.delete();

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
    const imageArea = src.rows * src.cols;
    const confidence = Math.min(maxArea / (imageArea * 0.8), 1);

    return {
      ...corners,
      confidence,
    };
  } finally {
    // Clean up
    src.delete();
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

function extractCorners(contour: any) {
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

// Message handler
self.onmessage = async (e: MessageEvent<EdgeDetectionRequest>) => {
  const { type, imageData, minArea } = e.data;

  try {
    if (type === 'init') {
      await initializeOpenCV();
      const response: EdgeDetectionResponse = { type: 'init-complete' };
      self.postMessage(response);
    } else if (type === 'detect') {
      if (!imageData) {
        throw new Error('No image data provided');
      }

      const corners = detectEdges(imageData, minArea);
      const response: EdgeDetectionResponse = {
        type: 'detection-result',
        corners,
      };
      self.postMessage(response);
    }
  } catch (error) {
    const response: EdgeDetectionResponse = {
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    self.postMessage(response);
  }
};

export {};
