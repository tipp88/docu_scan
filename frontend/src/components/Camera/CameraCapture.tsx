import { useEffect, useState, useRef } from 'react';
import { useCamera } from '../../hooks/useCamera';
import { useEdgeDetection } from '../../hooks/useEdgeDetection';
import { EdgeDetector } from './EdgeDetector';
import type { DetectedCorners } from '../../utils/opencv';

interface CameraCaptureProps {
  onCapture: (imageData: string, detectedCorners?: DetectedCorners | null) => void;
  onError?: (error: string) => void;
}

// Flash icon
const FlashIcon = ({ on }: { on: boolean }) => (
  <svg
    className={`w-6 h-6 transition-colors duration-200 ${on ? 'text-amber-400' : 'text-carbon-100'}`}
    fill={on ? 'currentColor' : 'none'}
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={on ? 0 : 2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

export function CameraCapture({ onCapture, onError }: CameraCaptureProps) {
  const {
    videoRef,
    stream,
    error,
    isLoading,
    hasFlash,
    flashOn,
    startCamera,
    toggleFlash,
    captureImage,
  } = useCamera();

  // Edge detection state - delayed start to let camera stabilize
  const [enableEdgeDetection, setEnableEdgeDetection] = useState(false);

  // Store detected corners in ref to avoid re-render loops
  const detectedCornersRef = useRef<DetectedCorners | null>(null);

  // Edge detection hook
  const {
    corners,
    isInitialized: edgeDetectionReady,
    isStable,
    stability,
    startDetection,
    stopDetection,
  } = useEdgeDetection(videoRef, {
    enabled: enableEdgeDetection,
    targetFps: 5,
    minArea: 10000,
    historySize: 5,
  });

  // Start camera on mount
  useEffect(() => {
    startCamera();
  }, []);

  // Handle camera errors
  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  // Delay edge detection start by 2 seconds after camera stream is ready
  useEffect(() => {
    if (stream && !enableEdgeDetection) {
      const timer = setTimeout(() => {
        setEnableEdgeDetection(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [stream, enableEdgeDetection]);

  // Start/stop edge detection based on conditions
  useEffect(() => {
    if (enableEdgeDetection && edgeDetectionReady && stream) {
      startDetection();
      return () => stopDetection();
    }
  }, [enableEdgeDetection, edgeDetectionReady, stream, startDetection, stopDetection]);

  // Store corners in ref (avoids re-render loops in parent)
  useEffect(() => {
    detectedCornersRef.current = corners;
  }, [corners]);

  const handleCapture = () => {
    const imageData = captureImage();
    if (imageData) {
      // Pass detected corners to parent for initial corner adjustment
      onCapture(imageData, detectedCornersRef.current);
    }
  };

  return (
    <div className="relative w-full h-full bg-carbon-950">
      {/* Video Preview */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />

      {/* Vignette overlay for depth */}
      <div className="absolute inset-0 pointer-events-none bg-radial-fade opacity-40" />

      {/* Scanning frame overlay */}
      <div className="camera-frame corner-tr corner-bl" />

      {/* Scan line animation - only show when no edge detection */}
      {stream && !error && !isLoading && !corners && (
        <div className="scan-line" />
      )}

      {/* Edge Detection Overlay */}
      {stream && edgeDetectionReady && corners && (
        <EdgeDetector
          corners={corners}
          videoRef={videoRef}
          isStable={isStable}
          stability={stability}
        />
      )}

      {/* Edge Detection Status Badges */}
      {stream && !error && !isLoading && enableEdgeDetection && !edgeDetectionReady && (
        <div className="absolute top-4 left-4 z-20 px-3 py-1.5 rounded-lg bg-carbon-800/90 backdrop-blur-sm border border-carbon-700">
          <span className="text-xs font-medium text-amber-400">Initializing edge detection...</span>
        </div>
      )}
      {stream && !error && !isLoading && edgeDetectionReady && !corners && (
        <div className="absolute top-4 left-4 z-20 px-3 py-1.5 rounded-lg bg-carbon-800/90 backdrop-blur-sm border border-carbon-700">
          <span className="text-xs font-medium text-carbon-400">Searching for document...</span>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-carbon-950/90 backdrop-blur-sm animate-fade-in">
          <div className="spinner spinner-lg mb-6" />
          <p className="text-carbon-300 font-medium">Initializing camera...</p>
          <p className="text-carbon-500 text-sm mt-1">Allow camera access when prompted</p>
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-carbon-950/90 backdrop-blur-sm p-6 animate-fade-in">
          <div className="card card-elevated p-8 max-w-sm text-center">
            {/* Error icon */}
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-crimson-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-crimson-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="font-display text-xl text-carbon-100 mb-2">Camera Error</h3>
            <p className="text-carbon-400 text-sm mb-6 leading-relaxed">{error}</p>
            <button
              onClick={startCamera}
              className="btn btn-primary w-full"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Try Again</span>
            </button>
          </div>
        </div>
      )}

      {/* Controls Overlay */}
      {stream && !error && (
        <div className="absolute inset-x-0 bottom-0 safe-bottom">
          {/* Gradient fade for controls */}
          <div className="absolute inset-0 bg-gradient-to-t from-carbon-950 via-carbon-950/80 to-transparent pointer-events-none" />

          <div className="relative px-6 pb-8 pt-16">
            <div className="flex items-center justify-center gap-8">
              {/* Flash Toggle */}
              <div className="w-14 flex justify-center">
                {hasFlash && (
                  <button
                    onClick={toggleFlash}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
                      flashOn
                        ? 'bg-amber-400/20 border-2 border-amber-400 shadow-glow-amber'
                        : 'bg-carbon-800/80 border border-carbon-700 hover:bg-carbon-700'
                    }`}
                    aria-label={flashOn ? 'Turn off flash' : 'Turn on flash'}
                  >
                    <FlashIcon on={flashOn} />
                  </button>
                )}
              </div>

              {/* Capture Button */}
              <button
                onClick={handleCapture}
                className="capture-btn group"
                aria-label="Capture photo"
              >
                {/* Pulse ring on hover */}
                <div className="absolute inset-0 rounded-full border-2 border-amber-400/0 group-hover:border-amber-400/50 transition-all duration-300 scale-100 group-hover:scale-110" />
              </button>

              {/* Placeholder for symmetry */}
              <div className="w-14" />
            </div>

            {/* Hint text */}
            <p className="text-center text-carbon-500 text-xs mt-6 tracking-wide uppercase">
              Position document within frame
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
