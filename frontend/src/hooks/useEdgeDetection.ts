import { useState, useEffect, useRef, useCallback } from 'react';
import { TemporalFilter, FrameRateLimiter } from '../utils/temporalFilter';
import { getOpenCV, loadOpenCV, detectDocumentEdges, type DetectedCorners } from '../utils/opencv';

interface EdgeDetectionOptions {
  enabled?: boolean;
  targetFps?: number;
  minArea?: number;
  historySize?: number;
}

export function useEdgeDetection(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  options: EdgeDetectionOptions = {}
) {
  const {
    enabled = true,
    targetFps = 5, // Reduced to 5 FPS for better performance
    minArea = 10000,
    historySize = 5,
  } = options;

  const [corners, setCorners] = useState<DetectedCorners | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const temporalFilterRef = useRef<TemporalFilter | null>(null);
  const frameRateLimiterRef = useRef<FrameRateLimiter | null>(null);
  const rafIdRef = useRef<number | null>(null);

  // Initialize OpenCV and filters
  useEffect(() => {
    // Don't initialize if not enabled
    if (!enabled) {
      return;
    }

    // Create temporal filter
    temporalFilterRef.current = new TemporalFilter(historySize);

    // Create frame rate limiter
    frameRateLimiterRef.current = new FrameRateLimiter(targetFps);

    // Load OpenCV with timeout
    const initOpenCV = async () => {
      try {
        const cv = getOpenCV();
        if (cv) {
          // Already loaded
          setIsInitialized(true);
          setError(null);
          console.log('Edge detection ready (OpenCV already loaded)');
          return;
        }

        console.log('Loading OpenCV for edge detection...');

        // Race between loading OpenCV and timeout
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('OpenCV load timeout')), 10000);
        });

        try {
          await Promise.race([loadOpenCV(), timeoutPromise]);
          setIsInitialized(true);
          setError(null);
          console.log('Edge detection ready');
        } catch (err) {
          throw err;
        }
      } catch (err) {
        console.warn('Failed to load OpenCV for edge detection (non-critical):', err);
        setError('Edge detection unavailable');
        setIsInitialized(false);
        // Camera will still work without edge detection
      }
    };

    initOpenCV();

    return () => {
      if (rafIdRef.current !== null) {
        console.log('Cleaning up edge detection on unmount');
        window.clearInterval(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [enabled, historySize, targetFps]);

  // Process a single frame
  const processFrame = useCallback(() => {
    if (!videoRef.current || !isInitialized || isProcessing) {
      return;
    }

    const video = videoRef.current;

    // Check if video is ready
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      return;
    }

    // Capture frame
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Detect edges
    setIsProcessing(true);

    try {
      const cv = getOpenCV();
      if (cv) {
        const mat = cv.imread(canvas);
        const detectedCorners = detectDocumentEdges(mat, minArea);
        mat.delete();

        // Apply temporal filtering
        const smoothedCorners = temporalFilterRef.current?.update(
          detectedCorners
        ) || detectedCorners;
        setCorners(smoothedCorners);
      }
    } catch (err) {
      console.warn('Edge detection error:', err);
    } finally {
      setIsProcessing(false);
    }
  }, [videoRef, isInitialized, isProcessing, minArea]);

  // Start/stop detection using setInterval (more controlled than RAF)
  const startDetection = useCallback(() => {
    // Clear any existing interval
    if (rafIdRef.current !== null) {
      window.clearInterval(rafIdRef.current);
      rafIdRef.current = null;
    }

    temporalFilterRef.current?.reset();
    setCorners(null);

    // Run at fixed FPS using setInterval (more predictable than RAF)
    const fps = targetFps || 5; // Default to 5 FPS for safety
    const intervalMs = 1000 / fps;

    console.log(`Starting edge detection at ${fps} FPS (${intervalMs}ms interval)`);
    rafIdRef.current = window.setInterval(processFrame, intervalMs);
  }, [processFrame, targetFps]);

  const stopDetection = useCallback(() => {
    if (rafIdRef.current !== null) {
      console.log('Stopping edge detection');
      window.clearInterval(rafIdRef.current);
      rafIdRef.current = null;
    }
    temporalFilterRef.current?.reset();
    setCorners(null);
    setIsProcessing(false);
  }, []);

  // Get stability info
  const isStable = temporalFilterRef.current?.isStable() || false;
  const stability = temporalFilterRef.current?.getStability() || 0;

  return {
    corners,
    isInitialized,
    error,
    isProcessing,
    isStable,
    stability,
    startDetection,
    stopDetection,
  };
}
