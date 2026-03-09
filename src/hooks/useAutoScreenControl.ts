import { useEffect, useRef } from 'react';
import { useSettingsStore } from '@/stores';

const INACTIVITY_DELAY = 5000; // 5 seconds
const REDUCED_BRIGHTNESS = 20;
const NORMAL_BRIGHTNESS = 100;

export function useAutoScreenControl() {
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const screenBrightness = useSettingsStore(s => s.screenBrightness);
  const lockTouch = useSettingsStore(s => s.lockTouch);
  const setScreenBrightness = useSettingsStore(s => s.setScreenBrightness);
  const setLockTouch = useSettingsStore(s => s.setLockTouch);
  const isInactiveRef = useRef(false);

  const resetInactivityTimer = () => {
    // Clear existing timer
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }

    // If was inactive, restore to normal
    if (isInactiveRef.current) {
      setScreenBrightness(NORMAL_BRIGHTNESS);
      setLockTouch(false);
      isInactiveRef.current = false;
    }

    // Set new inactivity timeout
    inactivityTimeoutRef.current = setTimeout(() => {
      setScreenBrightness(REDUCED_BRIGHTNESS);
      setLockTouch(true);
      isInactiveRef.current = true;
    }, INACTIVITY_DELAY);
  };

  useEffect(() => {
    // Listen for user interactions
    const handleActivity = () => {
      resetInactivityTimer();
    };

    // Add listeners for various interactions
    window.addEventListener('touchstart', handleActivity, true);
    window.addEventListener('touchend', handleActivity, true);
    window.addEventListener('mousedown', handleActivity, true);
    window.addEventListener('click', handleActivity, true);
    window.addEventListener('keydown', handleActivity, true);

    // Start initial timer
    resetInactivityTimer();

    return () => {
      // Cleanup
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
      }
      window.removeEventListener('touchstart', handleActivity, true);
      window.removeEventListener('touchend', handleActivity, true);
      window.removeEventListener('mousedown', handleActivity, true);
      window.removeEventListener('click', handleActivity, true);
      window.removeEventListener('keydown', handleActivity, true);
    };
  }, [setScreenBrightness, setLockTouch]);
}
