import { useEffect, useRef, useState } from 'react';

interface DimmingState {
  isDimmed: boolean;
  isLocked: boolean;
}

const INACTIVITY_TIMEOUT = 10000; // 10 giây

export function useScreenDimming() {
  const [state, setState] = useState<DimmingState>({ isDimmed: false, isLocked: false });
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  const dim = () => {
    setState({ isDimmed: true, isLocked: true });
    // Tạo overlay tối để giảm độ sáng màn hình xuống ~5%
    if (!overlayRef.current) {
      overlayRef.current = document.createElement('div');
      overlayRef.current.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.95);
        z-index: 9999;
        pointer-events: none;
        transition: opacity 0.3s;
      `;
      document.body.appendChild(overlayRef.current);
    }
    overlayRef.current.style.opacity = '1';
  };

  const undim = () => {
    setState({ isDimmed: false, isLocked: false });
    if (overlayRef.current) {
      overlayRef.current.style.opacity = '0';
      setTimeout(() => {
        if (overlayRef.current) {
          document.body.removeChild(overlayRef.current);
          overlayRef.current = null;
        }
      }, 300);
    }
  };

  const resetTimer = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(dim, INACTIVITY_TIMEOUT);
  };

  useEffect(() => {
    // Lắng nghe các sự kiện tương tác
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    
    const handleActivity = (e: Event) => {
      // Nếu đang lock, chỉ cho phép touchstart/touchmove (vuốt) để mở
      if (state.isLocked) {
        if (e.type === 'touchstart' || e.type === 'touchmove') {
          undim();
        }
        return;
      }
      
      // Nếu không lock, reset timer
      resetTimer();
    };

    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Thêm xử lý vuốt đặc biệt khi locked
    const handleTouchMove = (e: TouchEvent) => {
      if (state.isLocked) {
        undim();
      }
    };
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    // Start timer
    resetTimer();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      events.forEach(event => window.removeEventListener(event, handleActivity));
      window.removeEventListener('touchmove', handleTouchMove);
      if (overlayRef.current && document.body.contains(overlayRef.current)) {
        document.body.removeChild(overlayRef.current);
      }
    };
  }, [state.isLocked]);

  return state;
}
