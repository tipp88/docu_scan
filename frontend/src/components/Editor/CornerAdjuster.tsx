import { useEffect, useRef, useState } from 'react';
import type { Point } from '../../types/document';

interface CornerAdjusterProps {
  imageData: string;
  initialCorners?: [Point, Point, Point, Point];
  onCornersChange: (corners: [Point, Point, Point, Point]) => void;
}

export function CornerAdjuster({ imageData, initialCorners, onCornersChange }: CornerAdjusterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [corners, setCorners] = useState<[Point, Point, Point, Point]>(
    initialCorners || [
      { x: 0.1, y: 0.1 },
      { x: 0.9, y: 0.1 },
      { x: 0.9, y: 0.9 },
      { x: 0.1, y: 0.9 },
    ]
  );
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      // Use HIGH RESOLUTION canvas (up to 2x container size or original image size)
      // This maintains quality while being scaled down via CSS
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      // Calculate display scale
      const displayScale = Math.min(
        containerWidth / img.width,
        containerHeight / img.height
      );

      // Use 2x resolution for retina displays, but cap at original image size
      const resolutionMultiplier = Math.min(2, 1 / displayScale);

      // Canvas internal resolution - HIGH quality
      canvas.width = Math.min(img.width, containerWidth * resolutionMultiplier);
      canvas.height = Math.min(img.height, containerHeight * resolutionMultiplier);

      // CSS display size - fits container
      const displayWidth = img.width * displayScale;
      const displayHeight = img.height * displayScale;
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;

      // Draw image at FULL canvas resolution
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Draw corners and lines at high resolution
      drawCorners(ctx, canvas.width, canvas.height);
    };
    img.src = imageData;
  }, [imageData, corners]);

  const drawCorners = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Scale line width and handle sizes based on canvas resolution
    const scale = Math.max(1, Math.min(width, height) / 500);

    // Draw lines connecting corners
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 3 * scale;
    ctx.beginPath();
    corners.forEach((corner, index) => {
      const x = corner.x * width;
      const y = corner.y * height;
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.closePath();
    ctx.stroke();

    // Draw corner handles
    corners.forEach((corner, index) => {
      const x = corner.x * width;
      const y = corner.y * height;

      const outerRadius = 24 * scale;
      const innerRadius = 20 * scale;

      // Outer circle (white border)
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, outerRadius, 0, Math.PI * 2);
      ctx.fill();

      // Inner circle (blue)
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.arc(x, y, innerRadius, 0, Math.PI * 2);
      ctx.fill();

      // Label
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${14 * scale}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const labels = ['TL', 'TR', 'BR', 'BL'];
      ctx.fillText(labels[index], x, y);
    });
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];

    // Calculate normalized position (0-1)
    const x = (touch.clientX - rect.left) / (rect.right - rect.left);
    const y = (touch.clientY - rect.top) / (rect.bottom - rect.top);

    console.log('[TOUCH] Start at:', x.toFixed(3), y.toFixed(3));

    // Find closest corner - use larger threshold for mobile
    let closestIndex = 0;
    let closestDistance = Infinity;

    corners.forEach((corner, index) => {
      const dx = corner.x - x;
      const dy = corner.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    // More generous threshold for mobile touch (20% of screen)
    if (closestDistance < 0.2) {
      setDraggingIndex(closestIndex);
      console.log('[TOUCH] Grabbed corner', closestIndex, 'at distance', closestDistance.toFixed(3));
    } else {
      console.log('[TOUCH] No corner close enough, closest was', closestDistance.toFixed(3));
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (draggingIndex === null) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (touch.clientY - rect.top) / rect.height));

    const newCorners: [Point, Point, Point, Point] = [...corners] as [Point, Point, Point, Point];
    newCorners[draggingIndex] = { x, y };
    setCorners(newCorners);
    onCornersChange(newCorners);
  };

  const handleTouchEnd = () => {
    setDraggingIndex(null);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    // Find closest corner
    let closestIndex = 0;
    let closestDistance = Infinity;

    corners.forEach((corner, index) => {
      const dx = corner.x - x;
      const dy = corner.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < closestDistance && distance < 0.1) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    if (closestDistance < 0.1) {
      setDraggingIndex(closestIndex);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (draggingIndex === null) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    const newCorners: [Point, Point, Point, Point] = [...corners] as [Point, Point, Point, Point];
    newCorners[draggingIndex] = { x, y };
    setCorners(newCorners);
    onCornersChange(newCorners);
  };

  const handleMouseUp = () => {
    setDraggingIndex(null);
  };

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center">
      <canvas
        ref={canvasRef}
        className="max-w-full max-h-full"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ touchAction: 'none' }}
      />
    </div>
  );
}
