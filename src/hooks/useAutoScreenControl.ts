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

  // Swipe unlock handler - exposed for overlay to use
  const handleSwipeUnlock = useCallback(() => {
    if (isInactiveRef.current) {
      restoreScreen();
      resetInactivityTimer();
    }
  }, [restoreScreen, resetInactivityTimer]);

  useEffect(() => {
    // Only apply on mobile/tablet
    if (!isMobile) return;

    const handleActivity = () => {
      if (!isInactiveRef.current) {
        resetInactivityTimer();
      }
    };

    // Start inactivity timer
    resetInactivityTimer();

    window.addEventListener('mousedown', handleActivity, true);
    window.addEventListener('keydown', handleActivity, true);
    window.addEventListener('touchstart', handleActivity);
    window.addEventListener('touchmove', handleActivity);

    return () => {
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
      }
      window.removeEventListener('mousedown', handleActivity, true);
      window.removeEventListener('keydown', handleActivity, true);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('touchmove', handleActivity);

      // Restore screen on unmount
      setScreenBrightnessRef.current(NORMAL_BRIGHTNESS);
      setLockTouchRef.current(false);
    };
  }, [isMobile, resetInactivityTimer, restoreScreen]);

  // Return swipe handler for overlay to use
  return { handleSwipeUnlock };
}
