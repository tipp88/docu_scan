import { useRef, useCallback } from 'react';

interface UseLongPressOptions {
  onLongPress: () => void;
  onTap?: () => void;
  delay?: number;
}

export function useLongPress({ onLongPress, onTap, delay = 500 }: UseLongPressOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);
  const startPos = useRef<{ x: number; y: number } | null>(null);

  const start = useCallback((event: React.TouchEvent | React.MouseEvent) => {
    isLongPress.current = false;

    // Store starting position to detect movement
    if ('touches' in event) {
      startPos.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    } else {
      startPos.current = { x: event.clientX, y: event.clientY };
    }

    timerRef.current = setTimeout(() => {
      isLongPress.current = true;
      onLongPress();
    }, delay);
  }, [onLongPress, delay]);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    if (!isLongPress.current && onTap) {
      onTap();
    }
    startPos.current = null;
  }, [onTap]);

  const move = useCallback((event: React.TouchEvent | React.MouseEvent) => {
    if (!startPos.current) return;

    // Get current position
    let currentX: number, currentY: number;
    if ('touches' in event) {
      currentX = event.touches[0].clientX;
      currentY = event.touches[0].clientY;
    } else {
      currentX = event.clientX;
      currentY = event.clientY;
    }

    // Cancel if moved more than 10px (allows for slight finger movement)
    const dx = currentX - startPos.current.x;
    const dy = currentY - startPos.current.y;
    if (Math.sqrt(dx * dx + dy * dy) > 10) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      startPos.current = null;
    }
  }, []);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    startPos.current = null;
  }, []);

  return {
    onTouchStart: start,
    onTouchEnd: cancel,
    onTouchMove: move,
    onMouseDown: start,
    onMouseUp: cancel,
    onMouseLeave: clear,
  };
}
