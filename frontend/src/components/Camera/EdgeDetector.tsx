import { useRef, useEffect } from 'react';
import type { DetectedCorners } from '../../utils/opencv';

interface EdgeDetectorProps {
  corners: DetectedCorners | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isStable: boolean;
  stability: number;
}

/**
 * Calculate how object-cover positions the video within its container
 */
function getVideoCoverTransform(
  videoWidth: number,
  videoHeight: number,
  containerWidth: number,
  containerHeight: number
) {
  const videoAspect = videoWidth / videoHeight;
  const containerAspect = containerWidth / containerHeight;

  let scale: number;
  let offsetX = 0;
  let offsetY = 0;

  if (videoAspect > containerAspect) {
    // Video is wider - height fits, width is cropped
    scale = containerHeight / videoHeight;
    offsetX = (containerWidth - videoWidth * scale) / 2;
  } else {
    // Video is taller - width fits, height is cropped
    scale = containerWidth / videoWidth;
    offsetY = (containerHeight - videoHeight * scale) / 2;
  }

  return { scale, offsetX, offsetY };
}

export function EdgeDetector({
  corners,
  videoRef,
  isStable,
}: EdgeDetectorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;

    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get the displayed size of the video element
    const rect = video.getBoundingClientRect();
    const displayWidth = rect.width;
    const displayHeight = rect.height;

    // Set canvas to match displayed size
    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!corners) return;

    // Calculate transform to match object-cover behavior
    const { scale, offsetX, offsetY } = getVideoCoverTransform(
      video.videoWidth,
      video.videoHeight,
      displayWidth,
      displayHeight
    );

    // Transform video coordinates to canvas coordinates
    const transformPoint = (x: number, y: number) => ({
      x: x * scale + offsetX,
      y: y * scale + offsetY,
    });

    const tl = transformPoint(corners.topLeft.x, corners.topLeft.y);
    const tr = transformPoint(corners.topRight.x, corners.topRight.y);
    const br = transformPoint(corners.bottomRight.x, corners.bottomRight.y);
    const bl = transformPoint(corners.bottomLeft.x, corners.bottomLeft.y);

    // Color based on stability (simpler - just green or amber)
    const strokeColor = isStable ? 'rgba(251, 191, 36, 1)' : 'rgba(251, 191, 36, 0.7)';
    const fillColor = isStable ? 'rgba(251, 191, 36, 0.15)' : 'rgba(251, 191, 36, 0.08)';

    // Draw quadrilateral fill
    ctx.beginPath();
    ctx.moveTo(tl.x, tl.y);
    ctx.lineTo(tr.x, tr.y);
    ctx.lineTo(br.x, br.y);
    ctx.lineTo(bl.x, bl.y);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();

    // Draw border
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw corner markers
    const cornerSize = 12;
    const drawCorner = (p: { x: number; y: number }) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, cornerSize, 0, 2 * Math.PI);
      ctx.fillStyle = strokeColor;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
    };

    drawCorner(tl);
    drawCorner(tr);
    drawCorner(br);
    drawCorner(bl);

  }, [corners, videoRef, isStable]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 10 }}
    />
  );
}
