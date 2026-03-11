/**
 * Auto Backup System
 * - Backup tất cả dữ liệu người dùng vào file JSON khi đăng nhập
 * - Tự động backup mỗi 3 giờ
 * - Hỗ trợ restore từ file backup
 */

const BACKUP_INTERVAL_MS = 3 * 60 * 60 * 1000; // 3 giờ
const LAST_BACKUP_KEY = 'nw_last_backup_time';

function getAllUserData(userId: string): Record<string, unknown> {
  const data: Record<string, unknown> = {
    exportedAt: new Date().toISOString(),
    exportedAtTs: Date.now(),
    userId,
    version: 2,
  };

  const keys = [
    `nw_tasks_${userId}`,
    `nw_chat_${userId}`,
    `nw_gamification_${userId}`,
    `nw_templates_${userId}`,
    `nw_topics_${userId}`,
    `nw_health_${userId}`,
    `nw_notifications_${userId}`,
    // settings chung
    'nw_settings',
    'nw_fontscale',
    'nw_tick',
    'nw_voice',
    'nw_timezone',
    'nw_notifications',
    'nw_voicesettings',
    'nw_theme',
    'nw_finance_cats',
    'nw_cost_items',
  ];

  keys.forEach(key => {
    const val = localStorage.getItem(key);
    if (val) {
      try {
        data[key] = JSON.parse(val);
      } catch {
        data[key] = val;
      }
    }
  });

  return data;
}

function downloadBackupFile(userId: string): void {
  try {
    const data = getAllUserData(userId);
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `NghiemWork_backup_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    localStorage.setItem(LAST_BACKUP_KEY, String(Date.now()));
    console.log('[AutoBackup] Backup file downloaded successfully');
  } catch (e) {
    console.error('[AutoBackup] Failed to download backup:', e);
  }
}

function saveBackupToLocalCache(userId: string): void {
  try {
    const data = getAllUserData(userId);
    const json = JSON.stringify(data);
    // Lưu vào localStorage như cache backup (giới hạn 5MB)
    if (json.length < 4 * 1024 * 1024) {
      localStorage.setItem(`nw_backup_cache_${userId}`, json);
      localStorage.setItem(LAST_BACKUP_KEY, String(Date.now()));
      console.log('[AutoBackup] Backup cached to localStorage at', new Date().toISOString());
    }
  } catch (e) {
    console.warn('[AutoBackup] Could not save backup cache:', e);
  }
}

export function restoreFromBackupFile(file: File): Promise<{ success: boolean; message: string; keysRestored: number }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (!data.version || !data.userId) {
          resolve({ success: false, message: 'File backup không hợp lệ', keysRestored: 0 });
          return;
        }
        let count = 0;
        Object.entries(data).forEach(([key, value]) => {
          if (key.startsWith('nw_') && key !== LAST_BACKUP_KEY) {
            localStorage.setItem(key, JSON.stringify(value));
            count++;
          }
        });
        resolve({ success: true, message: `Khôi phục thành công ${count} mục dữ liệu`, keysRestored: count });
      } catch {
        resolve({ success: false, message: 'Lỗi đọc file backup', keysRestored: 0 });
      }
    };
    reader.onerror = () => resolve({ success: false, message: 'Lỗi đọc file', keysRestored: 0 });
    reader.readAsText(file);
  });
}

export function getLastBackupTime(): Date | null {
  const ts = localStorage.getItem(LAST_BACKUP_KEY);
  if (!ts) return null;
  return new Date(parseInt(ts));
}

export function getBackupCacheData(userId: string): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(`nw_backup_cache_${userId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

let backupTimer: ReturnType<typeof setInterval> | null = null;

export function startAutoBackup(userId: string): () => void {
  // Dừng backup cũ nếu có
  if (backupTimer) {
    clearInterval(backupTimer);
    backupTimer = null;
  }

  // Backup ngay khi đăng nhập (save to cache, không download file tự động)
  setTimeout(() => {
    saveBackupToLocalCache(userId);
  }, 5000); // Delay 5s sau khi login để đảm bảo data đã load

  // Backup định kỳ mỗi 3 giờ (save to cache)
  backupTimer = setInterval(() => {
    saveBackupToLocalCache(userId);
    console.log('[AutoBackup] Periodic backup completed');
  }, BACKUP_INTERVAL_MS);

  return () => {
    if (backupTimer) {
      clearInterval(backupTimer);
      backupTimer = null;
    }
  };
}

export function manualBackup(userId: string): void {
  downloadBackupFile(userId);
}

export function restoreFromCache(userId: string): boolean {
  try {
    const cached = localStorage.getItem(`nw_backup_cache_${userId}`);
    if (!cached) return false;
    const data = JSON.parse(cached);
    Object.entries(data).forEach(([key, value]) => {
      if (key.startsWith('nw_') && key !== LAST_BACKUP_KEY) {
        localStorage.setItem(key, JSON.stringify(value));
      }
    });
    return true;
  } catch {
    return false;
  }
}
