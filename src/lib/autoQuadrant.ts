// Auto-calculate quadrant based on deadline
import type { EisenhowerQuadrant, Task } from '@/types';

const HOURS_24 = 24 * 60 * 60 * 1000;

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
  const timeUntilDeadline = deadline - now;

  // ⚠️ CRITICAL: Overdue tasks stay in their original quadrant (do_first/schedule)
  // Overdue status is determined by isTaskOverdue() runtime check
  if (timeUntilDeadline < 0) {
    // Quá hạn → giữ ở LÀM NGAY để có thể bấm giờ
    return 'do_first';
  } else if (timeUntilDeadline <= HOURS_24) {
    // Within 24 hours
    return 'do_first';
  } else {
    // More than 24 hours
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
