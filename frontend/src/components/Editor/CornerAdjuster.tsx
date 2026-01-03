import { useEffect, useRef, useState } from 'react';
import type { Point } from '../../types/document';

interface CornerAdjusterProps {
  imageData: string;
  initialCorners?: [Point, Point, Point, Point];
  onCornersChange: (corners: [Point, Point, Point, Point]) => void;
}

// Design tokens for the corner adjuster
const COLORS = {
  // Amber accent from the design system
  accent: '#fbbf24',
  accentLight: '#fcd34d',
  accentGlow: 'rgba(251, 191, 36, 0.4)',
  // Dark carbon colors
  dark: '#0c0c0c',
  darkTranslucent: 'rgba(12, 12, 12, 0.8)',
  // Light text
  light: '#f7f7f7',
  lightMuted: 'rgba(247, 247, 247, 0.6)',
};

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
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      const displayScale = Math.min(
        containerWidth / img.width,
        containerHeight / img.height
      );

      const resolutionMultiplier = Math.min(2, 1 / displayScale);

      canvas.width = Math.min(img.width, containerWidth * resolutionMultiplier);
      canvas.height = Math.min(img.height, containerHeight * resolutionMultiplier);

      const displayWidth = img.width * displayScale;
      const displayHeight = img.height * displayScale;
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;

      // Draw image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Apply subtle vignette overlay for depth
      const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) * 0.7
      );
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(1, 'rgba(0,0,0,0.3)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw corners and lines
      drawCorners(ctx, canvas.width, canvas.height);
    };
    img.src = imageData;
  }, [imageData, corners, draggingIndex, hoveredIndex]);

  const drawCorners = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const scale = Math.max(1, Math.min(width, height) / 500);

    // Draw semi-transparent overlay outside the selection
    ctx.fillStyle = 'rgba(12, 12, 12, 0.5)';
    ctx.beginPath();
    ctx.rect(0, 0, width, height);

    // Create clipping path for the selected area
    ctx.moveTo(corners[0].x * width, corners[0].y * height);
    corners.forEach((corner, index) => {
      if (index > 0) {
        ctx.lineTo(corner.x * width, corner.y * height);
      }
    });
    ctx.closePath();
    ctx.fill('evenodd');

    // Draw the selection border with glow effect
    ctx.shadowColor = COLORS.accentGlow;
    ctx.shadowBlur = 20 * scale;
    ctx.strokeStyle = COLORS.accent;
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

    // Reset shadow for corners
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Draw dashed grid lines inside the selection for precision
    ctx.setLineDash([8 * scale, 8 * scale]);
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.15)';
    ctx.lineWidth = 1 * scale;

    // Vertical center line
    const topMidX = (corners[0].x + corners[1].x) / 2 * width;
    const topMidY = (corners[0].y + corners[1].y) / 2 * height;
    const bottomMidX = (corners[3].x + corners[2].x) / 2 * width;
    const bottomMidY = (corners[3].y + corners[2].y) / 2 * height;
    ctx.beginPath();
    ctx.moveTo(topMidX, topMidY);
    ctx.lineTo(bottomMidX, bottomMidY);
    ctx.stroke();

    // Horizontal center line
    const leftMidX = (corners[0].x + corners[3].x) / 2 * width;
    const leftMidY = (corners[0].y + corners[3].y) / 2 * height;
    const rightMidX = (corners[1].x + corners[2].x) / 2 * width;
    const rightMidY = (corners[1].y + corners[2].y) / 2 * height;
    ctx.beginPath();
    ctx.moveTo(leftMidX, leftMidY);
    ctx.lineTo(rightMidX, rightMidY);
    ctx.stroke();

    ctx.setLineDash([]);

    // Draw corner handles
    const labels = ['1', '2', '3', '4'];

    corners.forEach((corner, index) => {
      const x = corner.x * width;
      const y = corner.y * height;
      const isActive = draggingIndex === index;
      const isHovered = hoveredIndex === index;

      const outerRadius = (isActive ? 28 : isHovered ? 26 : 22) * scale;
      const innerRadius = (isActive ? 24 : isHovered ? 22 : 18) * scale;

      // Glow effect for active/hovered handles
      if (isActive || isHovered) {
        ctx.shadowColor = COLORS.accentGlow;
        ctx.shadowBlur = 25 * scale;
      }

      // Outer ring (white)
      ctx.fillStyle = COLORS.light;
      ctx.beginPath();
      ctx.arc(x, y, outerRadius, 0, Math.PI * 2);
      ctx.fill();

      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      // Inner circle (amber accent)
      ctx.fillStyle = isActive ? COLORS.accentLight : COLORS.accent;
      ctx.beginPath();
      ctx.arc(x, y, innerRadius, 0, Math.PI * 2);
      ctx.fill();

      // Label number
      ctx.fillStyle = COLORS.dark;
      ctx.font = `bold ${14 * scale}px 'Syne', system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(labels[index], x, y);
    });
  };

  const getClosestCorner = (x: number, y: number, threshold: number): number | null => {
    let closestIndex = null;
    let closestDistance = Infinity;

    corners.forEach((corner, index) => {
      const dx = corner.x - x;
      const dy = corner.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < closestDistance && distance < threshold) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    return closestIndex;
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = (touch.clientX - rect.left) / (rect.right - rect.left);
    const y = (touch.clientY - rect.top) / (rect.bottom - rect.top);

    const closestIndex = getClosestCorner(x, y, 0.2);
    if (closestIndex !== null) {
      setDraggingIndex(closestIndex);
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

    const closestIndex = getClosestCorner(x, y, 0.1);
    if (closestIndex !== null) {
      setDraggingIndex(closestIndex);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    // Update hovered state
    const hovered = getClosestCorner(x, y, 0.1);
    setHoveredIndex(hovered);

    // Handle dragging
    if (draggingIndex === null) return;

    const clampedX = Math.max(0, Math.min(1, x));
    const clampedY = Math.max(0, Math.min(1, y));

    const newCorners: [Point, Point, Point, Point] = [...corners] as [Point, Point, Point, Point];
    newCorners[draggingIndex] = { x: clampedX, y: clampedY };
    setCorners(newCorners);
    onCornersChange(newCorners);
  };

  const handleMouseUp = () => {
    setDraggingIndex(null);
  };

  const handleMouseLeave = () => {
    setDraggingIndex(null);
    setHoveredIndex(null);
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex items-center justify-center"
    >
      <canvas
        ref={canvasRef}
        className="max-w-full max-h-full rounded-xl shadow-2xl shadow-black/50"
        style={{
          touchAction: 'none',
          cursor: hoveredIndex !== null ? 'grab' : 'default',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      />
    </div>
  );
}
