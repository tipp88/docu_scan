import { useState, useEffect, useRef, useCallback } from 'react';

export function useCamera() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasFlash, setHasFlash] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null); // Keep track of stream for cleanup

  const getConstraints = useCallback((): MediaStreamConstraints => {
    return {
      video: {
        facingMode: 'environment', // Use rear camera on mobile
        width: { ideal: 4096 },     // Request 4K resolution
        height: { ideal: 2160 },    // Request 4K resolution
        aspectRatio: { ideal: 16 / 9 },
      },
    };
  }, []);

  const startCamera = useCallback(async () => {
    // Don't start if already loading or have a stream
    if (isLoading || streamRef.current) {
      console.log('Camera already starting or active');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const constraints = getConstraints();
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

      streamRef.current = mediaStream;
      setStream(mediaStream);

      // Check if flash/torch is available
      const videoTrack = mediaStream.getVideoTracks()[0];
      const capabilities = videoTrack.getCapabilities() as any;

      if (capabilities.torch) {
        setHasFlash(true);
      }

      setIsLoading(false);
      console.log('Camera started successfully');
    } catch (err) {
      console.error('Camera access error:', err);
      let errorMessage = 'Failed to access camera';

      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          errorMessage = 'Camera permission denied. Please allow camera access in your browser settings.';
        } else if (err.name === 'NotFoundError') {
          errorMessage = 'No camera found on this device.';
        } else if (err.name === 'NotReadableError') {
          errorMessage = 'Camera is already in use by another application.';
        } else if (err.name === 'SecurityError') {
          errorMessage = 'Camera access requires HTTPS connection.';
        }
      }

      setError(errorMessage);
      setIsLoading(false);
    }
  }, [getConstraints, isLoading]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setStream(null);
      setFlashOn(false);
      console.log('Camera stopped');
    }
  }, []); // No dependencies needed since we use ref

  const toggleFlash = useCallback(async () => {
    if (!stream || !hasFlash) return;

    const videoTrack = stream.getVideoTracks()[0];
    const newFlashState = !flashOn;

    try {
      await videoTrack.applyConstraints({
        advanced: [{ torch: newFlashState } as any],
      });
      setFlashOn(newFlashState);
    } catch (err) {
      console.error('Failed to toggle flash:', err);
    }
  }, [stream, hasFlash, flashOn]);

  const captureImage = useCallback((): string | null => {
    if (!videoRef.current) return null;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Use maximum quality for initial capture (0.99 - best quality before diminishing returns)
    return canvas.toDataURL('image/jpeg', 0.99);
  }, []);

  // Attach stream to video element when it changes
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      // Cleanup: stop all tracks using ref (always has latest value)
      if (streamRef.current) {
        console.log('Cleaning up camera on unmount');
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, []); // Empty deps - only run on unmount

  return {
    videoRef,
    stream,
    error,
    isLoading,
    hasFlash,
    flashOn,
    startCamera,
    stopCamera,
    toggleFlash,
    captureImage,
  };
}
