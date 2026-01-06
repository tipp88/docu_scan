import { useRef, useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { DocumentPage, EnhancementMode } from '../../types/document';

interface SortablePageThumbnailProps {
  page: DocumentPage;
  index: number;
  selectionMode: boolean;
  isSelected: boolean;
  isDragDisabled: boolean;
  onTap: () => void;
  onLongPress: () => void;
  onEnhancementChange: (enhancement: EnhancementMode) => void;
  onDelete: () => void;
}

const TrashIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

export function SortablePageThumbnail({
  page,
  index,
  selectionMode,
  isSelected,
  isDragDisabled,
  onTap,
  onLongPress,
  onEnhancementChange,
  onDelete,
}: SortablePageThumbnailProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: page.id,
    disabled: isDragDisabled,
  });

  // Track interactions
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressTriggered = useRef(false);
  const hasDragged = useRef(false);
  const startPos = useRef<{ x: number; y: number } | null>(null);

  const clearTimer = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // Handle click for tap detection (works alongside drag)
  const handleClick = useCallback((e: React.MouseEvent) => {
    // Don't trigger tap if we just finished dragging or long-pressing
    if (hasDragged.current || isLongPressTriggered.current) {
      hasDragged.current = false;
      isLongPressTriggered.current = false;
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    onTap();
  }, [onTap]);

  // Track drag state
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    hasDragged.current = false;
    isLongPressTriggered.current = false;
    startPos.current = { x: e.clientX, y: e.clientY };

    // Start long press timer (only when not in selection mode)
    if (!selectionMode) {
      longPressTimer.current = setTimeout(() => {
        isLongPressTriggered.current = true;
        clearTimer();
        onLongPress();
      }, 500);
    }
  }, [selectionMode, onLongPress, clearTimer]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!startPos.current) return;

    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // If moved, cancel long press and mark as dragging
    if (distance > 5) {
      clearTimer();
      hasDragged.current = true;
    }
  }, [clearTimer]);

  const handlePointerUp = useCallback(() => {
    clearTimer();
    startPos.current = null;
  }, [clearTimer]);

  const handlePointerCancel = useCallback(() => {
    clearTimer();
    startPos.current = null;
    hasDragged.current = false;
    isLongPressTriggered.current = false;
  }, [clearTimer]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    animationDelay: `${index * 50}ms`,
  };

  // In selection mode: no drag listeners, just click handling
  // In normal mode: attach drag listeners from @dnd-kit
  const dragListeners = isDragDisabled ? {} : listeners;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...dragListeners}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerLeave={handlePointerCancel}
      className={`page-thumbnail animate-slide-up cursor-grab active:cursor-grabbing ${isDragging ? 'dragging' : ''} ${isSelected ? 'selected' : ''}`}
    >
      <div className="relative aspect-[3/4]">
        <img
          src={page.processedImage}
          alt={`Page ${index + 1}`}
          className="w-full h-full object-cover pointer-events-none select-none"
          style={{ transform: `rotate(${page.rotation}deg)` }}
          draggable={false}
        />
        <div className="page-number">{String(index + 1).padStart(2, '0')}</div>

        {/* Selection checkbox - shown in selection mode */}
        {selectionMode && (
          <div className={`selection-checkbox ${isSelected ? 'checked' : ''}`}>
            {isSelected && <CheckIcon />}
          </div>
        )}

        {/* Enhancement mode selector - shown on hover when not in selection mode */}
        {!selectionMode && (
          <div className="absolute top-3 right-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <select
              value={page.enhancement}
              onChange={(e) => {
                e.stopPropagation();
                onEnhancementChange(e.target.value as EnhancementMode);
              }}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              className="px-2 py-1 rounded-lg bg-carbon-950/90 backdrop-blur-sm text-xs font-semibold text-carbon-200 border border-carbon-700 cursor-pointer hover:bg-carbon-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
              title="Change enhancement mode"
            >
              <option value="color">Color</option>
              <option value="grayscale">Grayscale</option>
              <option value="bw">B&W</option>
              <option value="enhanced">Enhanced</option>
            </select>
          </div>
        )}

        {/* Delete button - shown on hover when not in selection mode */}
        {!selectionMode && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute bottom-3 right-3 z-20 p-2 rounded-lg bg-crimson-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-crimson-500"
          >
            <TrashIcon />
          </button>
        )}
      </div>
    </div>
  );
}
