import { useEffect, useRef } from 'react';
import { useSettingsStore } from '@/stores';

const INACTIVITY_DELAY = 5000; // 5 seconds
const REDUCED_BRIGHTNESS = 5; // 5% brightness when dimmed
const NORMAL_BRIGHTNESS = 100;
const HOLD_DURATION = 3000; // 3 seconds to unlock

export function useAutoScreenControl() {
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const holdTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const screenBrightness = useSettingsStore(s => s.screenBrightness);
  const lockTouch = useSettingsStore(s => s.lockTouch);
  const setScreenBrightness = useSettingsStore(s => s.setScreenBrightness);
  const setLockTouch = useSettingsStore(s => s.setLockTouch);
  const isInactiveRef = useRef(false);

  const clearHoldTimer = () => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
  };

  const restoreScreen = () => {
    clearHoldTimer();
    setScreenBrightness(NORMAL_BRIGHTNESS);
    setLockTouch(false);
    isInactiveRef.current = false;
  };

  const resetInactivityTimer = () => {
    // Clear existing inactivity timer
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }

    // If was inactive, restore to normal
    if (isInactiveRef.current) {
      restoreScreen();
    }

    // Set new inactivity timeout
    inactivityTimeoutRef.current = setTimeout(() => {
      setScreenBrightness(REDUCED_BRIGHTNESS);
      setLockTouch(true);
      isInactiveRef.current = true;
    }, INACTIVITY_DELAY);
  };

  const handleTouchStart = () => {
    // If inactive (screen dimmed), require 3-second hold to unlock
    if (isInactiveRef.current && !holdTimeoutRef.current) {
      holdTimeoutRef.current = setTimeout(() => {
        restoreScreen();
      }, HOLD_DURATION);
    } else if (!isInactiveRef.current) {
      // Normal activity - reset inactivity timer
      resetInactivityTimer();
    }
  };

  const handleTouchEnd = () => {
    // If hold is in progress and screen is dimmed, don't clear - let user try again
    if (holdTimeoutRef.current && isInactiveRef.current) {
      clearHoldTimer();
    }
  };

  const handleOtherActivity = () => {
    // Non-touch activity (mouse, keyboard) - only work if not dimmed
    if (!isInactiveRef.current) {
      resetInactivityTimer();
    }
  };

  useEffect(() => {
    // Start initial timer
    resetInactivityTimer();

    // Add listeners for touch (special handling for hold detection)
    window.addEventListener('touchstart', handleTouchStart, true);
    window.addEventListener('touchend', handleTouchEnd, true);

    // Mouse/keyboard only reset timer if not dimmed
    window.addEventListener('mousedown', handleOtherActivity, true);
    window.addEventListener('click', handleOtherActivity, true);
    window.addEventListener('keydown', handleOtherActivity, true);

    return () => {
      // Cleanup
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
      }
      clearHoldTimer();

      window.removeEventListener('touchstart', handleTouchStart, true);
      window.removeEventListener('touchend', handleTouchEnd, true);
      window.removeEventListener('mousedown', handleOtherActivity, true);
      window.removeEventListener('click', handleOtherActivity, true);
      window.removeEventListener('keydown', handleOtherActivity, true);
    };
  }, [setScreenBrightness, setLockTouch]);
}
