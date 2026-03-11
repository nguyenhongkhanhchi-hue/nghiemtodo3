import type { Task } from '@/types';

// Export tasks to iCalendar format (.ics)
export function exportToICS(tasks: Task[]): string {
  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//NghiemWork//NONSGML v1.0//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:NghiemWork Tasks',
    'X-WR-TIMEZONE:Asia/Ho_Chi_Minh',
  ];

  tasks.forEach(task => {
    if (!task.deadline) return;
    
    const deadline = new Date(task.deadline);
    const dtStamp = new Date(task.createdAt);
    
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    icsLines.push('BEGIN:VEVENT');
    icsLines.push(`UID:${task.id}@nghiemwork.app`);
    icsLines.push(`DTSTAMP:${formatDate(dtStamp)}`);
    icsLines.push(`DTSTART:${formatDate(deadline)}`);
    icsLines.push(`SUMMARY:${task.title.replace(/,/g, '\\,')}`);
    
    if (task.notes) {
      icsLines.push(`DESCRIPTION:${task.notes.replace(/\n/g, '\\n').replace(/,/g, '\\,')}`);
    }
    
    if (task.status === 'done') {
      icsLines.push('STATUS:COMPLETED');
      if (task.completedAt) {
        icsLines.push(`COMPLETED:${formatDate(new Date(task.completedAt))}`);
      }
    } else if (task.status === 'in_progress') {
      icsLines.push('STATUS:IN-PROCESS');
    } else {
      icsLines.push('STATUS:NEEDS-ACTION');
    }
    
    // Priority based on quadrant
    const priority = task.quadrant === 'do_first' ? '1' : 
                    task.quadrant === 'schedule' ? '5' : '9';
    icsLines.push(`PRIORITY:${priority}`);
    
    icsLines.push('END:VEVENT');
  });

  icsLines.push('END:VCALENDAR');
  return icsLines.join('\r\n');
}

// Download ICS file
export function downloadICS(tasks: Task[], filename = 'nghiemwork-tasks.ics'): void {
  const icsContent = exportToICS(tasks);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Share individual task
export function shareTask(task: Task): string {
  const lines = ['📋 NGHIEMWORK TASK', ''];
  lines.push(`📌 ${task.title}`);
  
  if (task.deadline) {
    lines.push(`⏰ Hạn: ${new Date(task.deadline).toLocaleString('vi-VN')}`);
  }
  
  if (task.notes) {
    lines.push(`📝 ${task.notes}`);
  }
  
  if (task.finance) {
    const sign = task.finance.type === 'income' ? '+' : '-';
    lines.push(`💰 ${sign}${task.finance.amount.toLocaleString('vi-VN')}đ`);
  }
  
  lines.push('', '--- NghiemWork ---');
  return lines.join('\n');
}
