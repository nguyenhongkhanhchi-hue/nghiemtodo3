import { useState, useRef, useCallback } from 'react';

interface DragItem {
  index: number;
}

export function useDragAndDrop(onReorder: (from: number, to: number) => void) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const dragStartY = useRef(0);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const onDragStart = useCallback((index: number, e: React.TouchEvent | React.MouseEvent) => {
    setDraggedIndex(index);
    if ('touches' in e) {
      dragStartY.current = e.touches[0].clientY;
    } else {
      dragStartY.current = e.clientY;
    }
  }, []);

  const onDragOver = useCallback((index: number) => {
    setOverIndex(index);
  }, []);

  const onDragEnd = useCallback(() => {
    if (draggedIndex !== null && overIndex !== null && draggedIndex !== overIndex) {
      onReorder(draggedIndex, overIndex);
    }
    setDraggedIndex(null);
    setOverIndex(null);
  }, [draggedIndex, overIndex, onReorder]);

  return {
    draggedIndex,
    overIndex,
    onDragStart,
    onDragOver,
    onDragEnd,
    itemRefs,
  };
}
