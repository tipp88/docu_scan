import { useEffect, useState } from 'react';
import { useCamera } from '../../hooks/useCamera';
import { useEdgeDetection } from '../../hooks/useEdgeDetection';
import { EdgeDetector } from './EdgeDetector';

interface CameraCaptureProps {
  onCapture: (imageData: string) => void;
  onError?: (error: string) => void;
}

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

  // Edge detection - enabled only after camera is ready
  const [enableEdgeDetection, setEnableEdgeDetection] = useState(false);

  const {
    corners,
    isInitialized: edgeDetectionReady,
    error: edgeDetectionError,
    isStable,
    stability,
    startDetection,
    stopDetection,
  } = useEdgeDetection(videoRef, {
    enabled: enableEdgeDetection,
    targetFps: 5, // Low FPS to avoid performance issues
  });

  // Start camera once on mount
  useEffect(() => {
    console.log('Starting camera...');
    startCamera();
    // Cleanup handled in useCamera hook
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Enable edge detection ONLY after camera stream is ready
  useEffect(() => {
    if (stream && !enableEdgeDetection) {
      console.log('Camera stream ready, will enable edge detection in 2 seconds...');
      const timer = setTimeout(() => {
        console.log('Enabling edge detection now');
        setEnableEdgeDetection(true);
      }, 2000); // Wait 2 seconds to ensure video is stable

      return () => clearTimeout(timer);
    }
  }, [stream, enableEdgeDetection]);

  // Start edge detection when initialized
  useEffect(() => {
    if (enableEdgeDetection && edgeDetectionReady && stream) {
      console.log('Edge detection ready, starting detection loop');
      startDetection();

      return () => {
        console.log('Stopping edge detection (cleanup)');
        stopDetection();
      };
    }
  }, [enableEdgeDetection, edgeDetectionReady, stream, startDetection, stopDetection]);

  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
    if (edgeDetectionError) {
      console.error('Edge detection error:', edgeDetectionError);
    }
  }, [error, edgeDetectionError, onError]);

  const handleCapture = () => {
    console.log('Capture button clicked!');
    const imageData = captureImage();
    console.log('Image data captured:', imageData ? 'Success' : 'Failed');
    if (imageData) {
      console.log('Calling onCapture with image data');
      onCapture(imageData);
    } else {
      console.error('Failed to capture image - no data returned');
    }
  };

  return (
    <div className="relative w-full h-full bg-black">
      {/* Video Preview */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />

      {/* Edge Detection Overlay */}
      {stream && edgeDetectionReady && corners && (
        <EdgeDetector
          corners={corners}
          videoRef={videoRef}
          isStable={isStable}
          stability={stability}
        />
      )}

      {/* Loading Overlay - only for camera initialization */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p>Initializing camera...</p>
          </div>
        </div>
      )}

      {/* Edge Detection Status Badge */}
      {stream && enableEdgeDetection && !edgeDetectionReady && !isLoading && (
        <div className="absolute top-2 left-2 bg-blue-500 text-white px-3 py-1 rounded text-sm">
          Loading edge detection...
        </div>
      )}

      {/* Edge Detection Error Badge */}
      {stream && edgeDetectionError && !isLoading && (
        <div className="absolute top-2 left-2 bg-orange-500 text-white px-3 py-1 rounded text-sm">
          Manual mode (edge detection unavailable)
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 p-4">
          <div className="bg-red-500 text-white p-6 rounded-lg max-w-md">
            <h3 className="font-bold text-lg mb-2">Camera Error</h3>
            <p className="mb-4">{error}</p>
            <button
              onClick={startCamera}
              className="bg-white text-red-500 px-4 py-2 rounded font-medium"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Controls Overlay */}
      {stream && !error && (
        <div className="absolute inset-x-0 bottom-0 pb-8">
          <div className="flex items-center justify-center gap-8">
            {/* Flash Toggle */}
            {hasFlash && (
              <button
                onClick={toggleFlash}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                  flashOn ? 'bg-yellow-500' : 'bg-white bg-opacity-30'
                }`}
                aria-label="Toggle flash"
              >
                <svg
                  className={`w-6 h-6 ${flashOn ? 'text-white' : 'text-white'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </button>
            )}

            {/* Capture Button */}
            <button
              onClick={handleCapture}
              className="w-20 h-20 rounded-full bg-white border-4 border-gray-300 hover:bg-gray-100 transition-all active:scale-95"
              aria-label="Capture photo"
            >
              <div className="w-full h-full rounded-full bg-white border-2 border-gray-800"></div>
            </button>

            {/* Placeholder for symmetry */}
            <div className="w-12 h-12"></div>
          </div>
        </div>
      )}
    </div>
  );
}
