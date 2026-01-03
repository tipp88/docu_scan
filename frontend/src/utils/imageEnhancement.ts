import { getOpenCV } from './opencv';
import type { EnhancementMode } from '../types/document';

/**
 * Apply image enhancement to a document scan
 * @param imageData - Input image as base64 string
 * @param mode - Enhancement mode
 * @returns Enhanced image as base64 string
 */
export async function enhanceImage(
  imageData: string,
  mode: EnhancementMode
): Promise<string> {
  // For color mode, no processing needed - just return original
  if (mode === 'color') {
    return imageData;
  }

  const cv = getOpenCV();
  if (!cv) {
    // If OpenCV not available, fall back to returning original image
    console.warn('OpenCV not available for enhancement, returning original image');
    return imageData;
  }

  return new Promise((resolve) => {
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
        let dst = new cv.Mat();

        switch (mode) {
          case 'grayscale':
            // Convert to grayscale
            cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY);
            // Convert back to RGBA for display
            cv.cvtColor(dst, dst, cv.COLOR_GRAY2RGBA);
            break;

          case 'bw':
            // Convert to black and white with adaptive threshold
            const gray = new cv.Mat();
            cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

            // Apply Gaussian blur to reduce noise
            cv.GaussianBlur(gray, gray, new cv.Size(5, 5), 0);

            // Apply adaptive threshold
            cv.adaptiveThreshold(
              gray,
              dst,
              255,
              cv.ADAPTIVE_THRESH_GAUSSIAN_C,
              cv.THRESH_BINARY,
              11,
              2
            );

            // Convert to RGBA
            cv.cvtColor(dst, dst, cv.COLOR_GRAY2RGBA);
            gray.delete();
            break;

          case 'enhanced':
            // Enhanced mode: grayscale + contrast normalization + sharpening
            const enhancedGray = new cv.Mat();
            cv.cvtColor(src, enhancedGray, cv.COLOR_RGBA2GRAY);

            // Normalize contrast
            cv.normalize(enhancedGray, enhancedGray, 0, 255, cv.NORM_MINMAX);

            // Apply sharpening
            const kernel = cv.matFromArray(3, 3, cv.CV_32F, [
              0, -1, 0,
              -1, 5, -1,
              0, -1, 0,
            ]);
            cv.filter2D(
              enhancedGray,
              dst,
              cv.CV_8U,
              kernel,
              new cv.Point(-1, -1),
              0,
              cv.BORDER_DEFAULT
            );

            // Convert to RGBA
            cv.cvtColor(dst, dst, cv.COLOR_GRAY2RGBA);
            enhancedGray.delete();
            kernel.delete();
            break;

          default:
            throw new Error(`Unknown enhancement mode: ${mode}`);
        }

        // Convert back to canvas
        const outputCanvas = document.createElement('canvas');
        cv.imshow(outputCanvas, dst);

        // Convert to base64 with maximum quality
        const result = outputCanvas.toDataURL('image/jpeg', 0.99);

        // Clean up
        src.delete();
        dst.delete();

        resolve(result);
      } catch (error) {
        console.error('Enhancement error:', error);
        resolve(imageData);
      }
    };

    img.onerror = () => {
      console.error('Failed to load image for enhancement');
      resolve(imageData);
    };

    img.src = imageData;
  });
}

/**
 * Auto-detect best enhancement mode for a document
 * Returns a recommended enhancement mode based on image characteristics
 */
export async function detectBestEnhancement(
  imageData: string
): Promise<EnhancementMode> {
  const cv = getOpenCV();
  if (!cv) {
    return 'enhanced'; // Default fallback
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve('enhanced');
          return;
        }

        ctx.drawImage(img, 0, 0);
        const src = cv.imread(canvas);
        const gray = new cv.Mat();

        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

        // Calculate mean and standard deviation
        const mean = new cv.Mat();
        const stddev = new cv.Mat();
        cv.meanStdDev(gray, mean, stddev);

        const meanValue = mean.data64F[0];
        const stddevValue = stddev.data64F[0];

        // Clean up
        src.delete();
        gray.delete();
        mean.delete();
        stddev.delete();

        // Decision logic:
        // - Low contrast (low stddev) → enhanced
        // - Very bright or dark → bw
        // - Medium contrast → grayscale
        if (stddevValue < 40) {
          resolve('enhanced'); // Low contrast, needs enhancement
        } else if (meanValue < 80 || meanValue > 180) {
          resolve('bw'); // Very bright or dark, B&W works well
        } else {
          resolve('grayscale'); // Medium contrast, grayscale is good
        }
      } catch (error) {
        resolve('enhanced'); // Default on error
      }
    };

    img.onerror = () => {
      resolve('enhanced'); // Default on error
    };

    img.src = imageData;
  });
}
