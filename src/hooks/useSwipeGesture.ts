import { useCallback, useRef } from 'react';

interface SwipeOptions {
  threshold?: number;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

export function useSwipeGesture({ threshold = 80, onSwipeLeft, onSwipeRight }: SwipeOptions) {
  const startX = useRef(0);
  const currentX = useRef(0);
  const isSwiping = useRef(false);
  const startY = useRef(0);
  const isHorizontal = useRef<boolean | null>(null);

  const handlers = {
    onTouchStart: useCallback((e: React.TouchEvent) => {
      startX.current = e.touches[0].clientX;
      startY.current = e.touches[0].clientY;
      currentX.current = 0;
      isSwiping.current = false;
      isHorizontal.current = null;
    }, []),

    onTouchMove: useCallback((e: React.TouchEvent) => {
      const diffX = e.touches[0].clientX - startX.current;
      const diffY = e.touches[0].clientY - startY.current;

      if (isHorizontal.current === null) {
        if (Math.abs(diffX) > 10 || Math.abs(diffY) > 10) {
          isHorizontal.current = Math.abs(diffX) > Math.abs(diffY);
        }
      }

      if (isHorizontal.current) {
        isSwiping.current = true;
        currentX.current = diffX;
      }
    }, []),

    onTouchEnd: useCallback(() => {
      if (isSwiping.current) {
        if (currentX.current < -threshold && onSwipeLeft) onSwipeLeft();
        else if (currentX.current > threshold && onSwipeRight) onSwipeRight();
      }
      isSwiping.current = false;
      currentX.current = 0;
      isHorizontal.current = null;
    }, [threshold, onSwipeLeft, onSwipeRight]),
  };

  return {
    swipeState: {
      isSwiping: isSwiping.current,
      offsetX: currentX.current,
    },
    handlers,
  };
}
