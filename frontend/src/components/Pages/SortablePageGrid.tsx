import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import type { DocumentPage, EnhancementMode } from '../../types/document';
import { SortablePageThumbnail } from './SortablePageThumbnail';

interface SortablePageGridProps {
  pages: DocumentPage[];
  selectionMode: boolean;
  selectedPageIds: Set<string>;
  onPageClick: (pageId: string) => void;
  onPageLongPress: (pageId: string) => void;
  onToggleSelection: (pageId: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onEnhancementChange: (pageId: string, enhancement: EnhancementMode) => Promise<void>;
  onDeletePage: (pageId: string) => void;
}

export function SortablePageGrid({
  pages,
  selectionMode,
  selectedPageIds,
  onPageClick,
  onPageLongPress,
  onToggleSelection,
  onReorder,
  onEnhancementChange,
  onDeletePage,
}: SortablePageGridProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  // Configure sensors for drag detection
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        // Small movement threshold to start drag
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        // Small delay and tolerance for touch
        delay: 100,
        tolerance: 5,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = pages.findIndex((p) => p.id === active.id);
      const newIndex = pages.findIndex((p) => p.id === over.id);
      onReorder(oldIndex, newIndex);
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const activePage = activeId ? pages.find(p => p.id === activeId) : null;
  const activeIndex = activeId ? pages.findIndex(p => p.id === activeId) : -1;

  const handleTap = (pageId: string) => {
    if (selectionMode) {
      onToggleSelection(pageId);
    } else {
      onPageClick(pageId);
    }
  };

  const handleLongPress = (pageId: string) => {
    if (!selectionMode) {
      onPageLongPress(pageId);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={pages.map(p => p.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {pages.map((page, index) => (
            <SortablePageThumbnail
              key={page.id}
              page={page}
              index={index}
              selectionMode={selectionMode}
              isSelected={selectedPageIds.has(page.id)}
              isDragDisabled={selectionMode}
              onTap={() => handleTap(page.id)}
              onLongPress={() => handleLongPress(page.id)}
              onEnhancementChange={(enhancement) => onEnhancementChange(page.id, enhancement)}
              onDelete={() => onDeletePage(page.id)}
            />
          ))}
        </div>
      </SortableContext>

      {/* Drag overlay - shows the page being dragged */}
      <DragOverlay adjustScale={false}>
        {activePage ? (
          <div className="page-thumbnail dragging-overlay">
            <div className="relative aspect-[3/4]">
              <img
                src={activePage.processedImage}
                alt={`Page ${activeIndex + 1}`}
                className="w-full h-full object-cover"
                style={{ transform: `rotate(${activePage.rotation}deg)` }}
              />
              <div className="page-number">{String(activeIndex + 1).padStart(2, '0')}</div>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
