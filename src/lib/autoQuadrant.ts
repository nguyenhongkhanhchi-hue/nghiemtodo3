// Auto-calculate quadrant based on deadline
import type { EisenhowerQuadrant, Task } from '@/types';

// Get end of today (23:59:59.999)
function getEndOfToday(): number {
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  return now.getTime();
}

// Get end of tomorrow (23:59:59.999 tomorrow)
function getEndOfTomorrow(): number {
  const now = new Date();
  now.setDate(now.getDate() + 1);
  now.setHours(23, 59, 59, 999);
  return now.getTime();
}

/**
 * Calculate quadrant based on deadline
 * IMPORTANT: NEVER returns 'overdue' - that's a runtime filter state
 */
export function calculateQuadrant(
  deadline: number | undefined,
  manualQuadrant?: 'delegate' | 'eliminate'
): Exclude<EisenhowerQuadrant, 'overdue'> {
  // Manual quadrants take priority
  if (manualQuadrant === 'delegate') return 'delegate';
  if (manualQuadrant === 'eliminate') return 'eliminate';

  // Auto-calculate based on deadline
  if (!deadline) return 'do_first'; // Default to do_first if no deadline

  const now = Date.now();
  const endOfToday = getEndOfToday();
  const endOfTomorrow = getEndOfTomorrow();

  // Overdue = deadline has passed
  if (deadline < now) {
    // Quá hạn → giữ ở HÔM NAY để có thể bấm giờ
    return 'do_first';
  } else if (deadline <= endOfToday) {
    // Within today → HÔM NAY
    return 'do_first';
  } else if (deadline <= endOfTomorrow) {
    // Tomorrow → LÊN LỊCH (Ngày mai)
    return 'schedule';
  } else {
    // After tomorrow → LÊN LỊCH
    return 'schedule';
  }
}

/**
 * Runtime check if task is overdue
 * This is the ONLY way to determine overdue status
 */
export function isTaskOverdue(task: { deadline?: number; status?: string; quadrant?: string }): boolean {
  // Overdue = có deadline + deadline < now + chưa done + không trong thùng rác
  return !!(
    task.deadline && 
    task.deadline < Date.now() &&
    task.status !== 'done' &&
    task.quadrant !== 'eliminate'
  );
}
