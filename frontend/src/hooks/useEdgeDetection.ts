import { useState, useEffect, useRef, useCallback } from 'react';
import { TemporalFilter, FrameRateLimiter } from '../utils/temporalFilter';
import type { DetectedCorners } from '../utils/opencv';

interface EdgeDetectionOptions {
  targetFps?: number;
  minArea?: number;
  historySize?: number;
}

export function useEdgeDetection(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  options: EdgeDetectionOptions = {}
) {
  const {
    targetFps = 8,
    minArea = 10000,
    historySize = 5,
  } = options;

  const [corners, setCorners] = useState<DetectedCorners | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const workerRef = useRef<Worker | null>(null);
  const temporalFilterRef = useRef<TemporalFilter | null>(null);
  const frameRateLimiterRef = useRef<FrameRateLimiter | null>(null);
  const rafIdRef = useRef<number | null>(null);

  // Initialize worker and filters
  useEffect(() => {
    // Create temporal filter
    temporalFilterRef.current = new TemporalFilter(historySize);

    // Create frame rate limiter
    frameRateLimiterRef.current = new FrameRateLimiter(targetFps);

    // Create Web Worker with error handling
    let initTimeout: number | undefined;

    try {
      workerRef.current = new Worker(
        new URL('../workers/edgeDetection.worker.ts', import.meta.url),
        { type: 'module' }
      );

      // Set a timeout for initialization (30 seconds)
      initTimeout = window.setTimeout(() => {
        if (!isInitialized) {
          console.warn('Edge detection initialization timeout - disabling feature');
          setError('Edge detection unavailable (timeout)');
          setIsInitialized(false);
          if (workerRef.current) {
            workerRef.current.terminate();
            workerRef.current = null;
          }
        }
      }, 30000);

      workerRef.current.onmessage = (e) => {
        const { type, corners: detectedCorners, error: workerError } = e.data;

        if (type === 'init-complete') {
          clearTimeout(initTimeout);
          setIsInitialized(true);
          setError(null);
          console.log('Edge detection worker initialized successfully');
        } else if (type === 'detection-result') {
          // Apply temporal filtering
          const smoothedCorners = temporalFilterRef.current?.update(
            detectedCorners
          ) || detectedCorners;
          setCorners(smoothedCorners);
          setIsProcessing(false);
        } else if (type === 'error') {
          console.warn('Edge detection error:', workerError);
          setError(workerError || 'Detection error');
          setIsProcessing(false);
        }
      };

      workerRef.current.onerror = (err) => {
        clearTimeout(initTimeout);
        console.warn('Edge detection worker error (non-critical):', err);
        setError('Edge detection unavailable');
        setIsInitialized(false);
        // Don't crash - edge detection is optional
      };

      // Initialize the worker
      workerRef.current.postMessage({ type: 'init' });
    } catch (err) {
      clearTimeout(initTimeout);
      console.warn('Failed to create edge detection worker (non-critical):', err);
      setError('Edge detection unavailable');
      // Camera will still work without edge detection
    }

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, [historySize, targetFps]);

  // Process video frames
  const processFrame = useCallback(() => {
    if (!videoRef.current || !isInitialized || !workerRef.current) {
      rafIdRef.current = requestAnimationFrame(processFrame);
      return;
    }

    const video = videoRef.current;

    // Check if video is ready
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafIdRef.current = requestAnimationFrame(processFrame);
      return;
    }

    // Check frame rate limiter
    if (!frameRateLimiterRef.current?.shouldProcess()) {
      rafIdRef.current = requestAnimationFrame(processFrame);
      return;
    }

    // Skip if already processing
    if (isProcessing) {
      rafIdRef.current = requestAnimationFrame(processFrame);
      return;
    }

    // Capture frame
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      rafIdRef.current = requestAnimationFrame(processFrame);
      return;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Send to worker
    setIsProcessing(true);
    workerRef.current.postMessage({
      type: 'detect',
      imageData,
      minArea,
    });

    rafIdRef.current = requestAnimationFrame(processFrame);
  }, [videoRef, isInitialized, isProcessing, minArea]);

  // Start/stop detection
  const startDetection = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }
    temporalFilterRef.current?.reset();
    setCorners(null);
    rafIdRef.current = requestAnimationFrame(processFrame);
  }, [processFrame]);

  const stopDetection = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    temporalFilterRef.current?.reset();
    setCorners(null);
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
