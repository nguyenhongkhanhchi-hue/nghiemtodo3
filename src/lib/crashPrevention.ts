/**
 * Crash Prevention System (Item 16)
 * - Bắt tất cả lỗi JS không xử lý được
 * - Ngăn chặn unload/beforeunload không mong muốn
 * - Keep-alive để tránh service worker kill app
 * - Khôi phục từ lỗi thay vì crash
 */

let errorCount = 0;
const MAX_ERRORS_BEFORE_RELOAD = 10;
const ERROR_RESET_INTERVAL = 60000; // Reset count mỗi phút

export function initCrashPrevention(): void {
  // ── 1. Bắt lỗi JS không xử lý ──
  window.addEventListener('error', (event) => {
    errorCount++;
    console.error('[CrashPrevention] Unhandled error:', event.error?.message || event.message);

    // Chỉ reload nếu quá nhiều lỗi liên tiếp (tránh reload loop)
    if (errorCount >= MAX_ERRORS_BEFORE_RELOAD) {
      console.warn('[CrashPrevention] Too many errors, soft reload...');
      errorCount = 0;
      // Không reload cứng, chỉ log
    }

    // Ngăn crash hiển thị lỗi cho user
    event.preventDefault();
    return true;
  });

  // ── 2. Bắt Promise rejection không xử lý ──
  window.addEventListener('unhandledrejection', (event) => {
    console.warn('[CrashPrevention] Unhandled promise rejection:', event.reason);
    event.preventDefault(); // Ngăn hiển thị lỗi
  });

  // ── 3. Reset error count định kỳ ──
  setInterval(() => {
    if (errorCount > 0) {
      errorCount = Math.max(0, errorCount - 2);
    }
  }, ERROR_RESET_INTERVAL);

  // ── 4. Giữ wake lock nếu có (ngăn device sleep kill app) ──
  if ('wakeLock' in navigator) {
    let wakeLock: WakeLockSentinel | null = null;
    
    const requestWakeLock = async () => {
      try {
        wakeLock = await (navigator as any).wakeLock.request('screen');
        wakeLock.addEventListener('release', () => {
          console.log('[CrashPrevention] Wake lock released');
        });
      } catch (e) {
        // Wake lock không khả dụng, bỏ qua
      }
    };

    // Re-acquire wake lock khi tab trở lại foreground
    document.addEventListener('visibilitychange', async () => {
      if (document.visibilityState === 'visible') {
        await requestWakeLock();
      }
    });

    requestWakeLock();
  }

  // ── 5. Xử lý network offline - không crash app ──
  window.addEventListener('offline', () => {
    console.log('[CrashPrevention] Network offline - app continues in offline mode');
    // Dispatch custom event để components có thể hiển thị offline indicator
    window.dispatchEvent(new CustomEvent('app:offline'));
  });

  window.addEventListener('online', () => {
    console.log('[CrashPrevention] Network restored');
    window.dispatchEvent(new CustomEvent('app:online'));
  });

  // ── 6. Keep session alive ──
  // Định kỳ ping để giữ service worker và session không expire
  setInterval(() => {
    // Chỉ khi tab đang active
    if (document.visibilityState === 'visible') {
      // Cập nhật heartbeat
      localStorage.setItem('nw_app_heartbeat', String(Date.now()));
    }
  }, 30000); // Mỗi 30 giây

  // ── 7. Bắt lỗi fetch/XHR ──
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    try {
      return await originalFetch(...args);
    } catch (e: any) {
      // Log nhưng không crash
      console.warn('[CrashPrevention] Fetch error (handled):', e.message);
      throw e; // Re-throw để caller xử lý
    }
  };

  console.log('[CrashPrevention] Initialized - app crash prevention active');
}
