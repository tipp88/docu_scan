import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { DocumentPage, EnhancementMode } from '../../types/document';
import { useLongPress } from '../../hooks/useLongPress';

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

  const longPressHandlers = useLongPress({
    onLongPress,
    onTap,
    delay: 500,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    animationDelay: `${index * 50}ms`,
  };

  // Combine handlers - use long press for interaction, but allow drag
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isDragDisabled) {
      listeners?.onPointerDown?.(e);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`page-thumbnail animate-slide-up ${isDragging ? 'dragging' : ''} ${isSelected ? 'selected' : ''}`}
    >
      <div
        className="relative aspect-[3/4]"
        {...longPressHandlers}
        onPointerDown={handlePointerDown}
      >
        <img
          src={page.processedImage}
          alt={`Page ${index + 1}`}
          className="w-full h-full object-cover pointer-events-none"
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
              onTouchStart={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
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
            onTouchStart={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            className="absolute bottom-3 right-3 z-20 p-2 rounded-lg bg-crimson-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-crimson-500"
          >
            <TrashIcon />
          </button>
        )}
      </div>
    </div>
  );
}
