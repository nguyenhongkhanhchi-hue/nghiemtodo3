import { useEffect, useRef, useCallback } from 'react';
import { useSettingsStore } from '@/stores';
import { useIsMobile } from '@/hooks/use-mobile';

const INACTIVITY_DELAY = 5000; // 5 seconds
const REDUCED_BRIGHTNESS = 5;  // 5% brightness when dimmed
const NORMAL_BRIGHTNESS = 100;
const SWIPE_THRESHOLD = 80;    // Minimum swipe distance in pixels

export function useAutoScreenControl() {
  const isMobile = useIsMobile();
  const inactivityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const isInactiveRef = useRef(false);

  // Stable refs to store callbacks to avoid stale closure in event listeners
  const setScreenBrightness = useSettingsStore(s => s.setScreenBrightness);
  const setLockTouch = useSettingsStore(s => s.setLockTouch);

  const setScreenBrightnessRef = useRef(setScreenBrightness);
  const setLockTouchRef = useRef(setLockTouch);
  setScreenBrightnessRef.current = setScreenBrightness;
  setLockTouchRef.current = setLockTouch;

  const restoreScreen = useCallback(() => {
    setScreenBrightnessRef.current(NORMAL_BRIGHTNESS);
    setLockTouchRef.current(false);
    isInactiveRef.current = false;
  }, []);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }

    if (isInactiveRef.current) {
      restoreScreen();
    }

    inactivityTimeoutRef.current = setTimeout(() => {
      setScreenBrightnessRef.current(REDUCED_BRIGHTNESS);
      setLockTouchRef.current(true);
      isInactiveRef.current = true;
    }, INACTIVITY_DELAY);
  }, [restoreScreen]);

  useEffect(() => {
    // Only apply on mobile/tablet
    if (!isMobile) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (!isInactiveRef.current) {
        // Screen is active — reset timer on any touch
        resetInactivityTimer();
        return;
      }
      // Screen is dimmed/locked — record start position for swipe unlock
      const touch = e.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
      // Prevent propagation so locked UI doesn't receive the touch
      e.stopPropagation();
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isInactiveRef.current) {
        // Prevent scrolling while locked
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isInactiveRef.current) return;

      e.stopPropagation();

      if (!touchStartRef.current) return;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      if (distance >= SWIPE_THRESHOLD) {
        restoreScreen();
        resetInactivityTimer();
      }

      touchStartRef.current = null;
    };

    const handleActivity = () => {
      if (!isInactiveRef.current) {
        resetInactivityTimer();
      }
    };

    // Start inactivity timer
    resetInactivityTimer();

    window.addEventListener('touchstart', handleTouchStart, { capture: true, passive: false });
    window.addEventListener('touchmove', handleTouchMove, { capture: true, passive: false });
    window.addEventListener('touchend', handleTouchEnd, { capture: true, passive: false });
    window.addEventListener('mousedown', handleActivity, true);
    window.addEventListener('keydown', handleActivity, true);

    return () => {
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
      }
      window.removeEventListener('touchstart', handleTouchStart, true);
      window.removeEventListener('touchmove', handleTouchMove, true);
      window.removeEventListener('touchend', handleTouchEnd, true);
      window.removeEventListener('mousedown', handleActivity, true);
      window.removeEventListener('keydown', handleActivity, true);

      // Restore screen on unmount
      setScreenBrightnessRef.current(NORMAL_BRIGHTNESS);
      setLockTouchRef.current(false);
    };
  }, [isMobile, resetInactivityTimer, restoreScreen]);
}
