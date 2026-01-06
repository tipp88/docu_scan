import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
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
  // Configure sensors for drag detection
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        // Require movement before drag starts (prevents conflict with tap)
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        // Delay to allow long-press to trigger first
        delay: 200,
        tolerance: 5,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = pages.findIndex((p) => p.id === active.id);
      const newIndex = pages.findIndex((p) => p.id === over.id);
      onReorder(oldIndex, newIndex);
    }
  };

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
      onDragEnd={handleDragEnd}
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
    </DndContext>
  );
}
