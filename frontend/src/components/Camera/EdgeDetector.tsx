import { useRef, useEffect } from 'react';
import type { DetectedCorners } from '../../utils/opencv';

interface EdgeDetectorProps {
  corners: DetectedCorners | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isStable: boolean;
  stability: number;
}

export function EdgeDetector({
  corners,
  videoRef,
  isStable,
  stability,
}: EdgeDetectorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;

    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Match canvas size to video
    if (
      canvas.width !== video.videoWidth ||
      canvas.height !== video.videoHeight
    ) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!corners) return;

    // Determine color based on confidence and stability
    const confidence = corners.confidence;
    let strokeColor: string;
    let fillColor: string;

    if (isStable && confidence > 0.7) {
      // High confidence and stable - green
      strokeColor = 'rgba(0, 255, 0, 0.8)';
      fillColor = 'rgba(0, 255, 0, 0.1)';
    } else if (confidence > 0.5) {
      // Medium confidence - yellow
      strokeColor = 'rgba(255, 255, 0, 0.8)';
      fillColor = 'rgba(255, 255, 0, 0.1)';
    } else {
      // Low confidence - red
      strokeColor = 'rgba(255, 100, 0, 0.8)';
      fillColor = 'rgba(255, 100, 0, 0.1)';
    }

    // Draw quadrilateral
    ctx.beginPath();
    ctx.moveTo(corners.topLeft.x, corners.topLeft.y);
    ctx.lineTo(corners.topRight.x, corners.topRight.y);
    ctx.lineTo(corners.bottomRight.x, corners.bottomRight.y);
    ctx.lineTo(corners.bottomLeft.x, corners.bottomLeft.y);
    ctx.closePath();

    // Fill
    ctx.fillStyle = fillColor;
    ctx.fill();

    // Stroke
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw corner circles
    const drawCorner = (x: number, y: number) => {
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, 2 * Math.PI);
      ctx.fillStyle = strokeColor;
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();
    };

    drawCorner(corners.topLeft.x, corners.topLeft.y);
    drawCorner(corners.topRight.x, corners.topRight.y);
    drawCorner(corners.bottomRight.x, corners.bottomRight.y);
    drawCorner(corners.bottomLeft.x, corners.bottomLeft.y);

    // Draw confidence indicator
    const indicatorText = `${Math.round(confidence * 100)}%`;
    const indicatorX = 20;
    const indicatorY = 40;

    ctx.font = 'bold 24px sans-serif';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(indicatorX - 10, indicatorY - 30, 100, 40);

    ctx.fillStyle = strokeColor;
    ctx.fillText(indicatorText, indicatorX, indicatorY);

    // Draw stability indicator
    if (isStable) {
      const stableX = indicatorX;
      const stableY = indicatorY + 40;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(stableX - 10, stableY - 30, 120, 40);

      ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('STABLE', stableX, stableY);
    }
  }, [corners, videoRef, isStable, stability]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 10 }}
    />
  );
}
