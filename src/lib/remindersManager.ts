import type { Task, Reminder } from '@/types';
import { speakNotification } from './notifications';
import { playWarningSound } from './soundEffects';

// Tạo reminder từ task settings
export function createReminders(task: Task): Reminder[] {
  if (!task.reminderSettings?.enabled || !task.deadline) {
    return [];
  }

  const { minutesBefore, repeatTimes, repeatInterval } = task.reminderSettings;
  const reminders: Reminder[] = [];
  
  const triggerTime = task.deadline - minutesBefore * 60 * 1000;
  
  for (let i = 0; i < repeatTimes; i++) {
    reminders.push({
      id: `${task.id}_reminder_${i}`,
      taskId: task.id,
      triggerTime: triggerTime + i * repeatInterval * 1000,
      repeatCount: i + 1,
      repeatInterval: repeatInterval * 1000,
      acknowledged: false,
      createdAt: Date.now(),
    });
  }
  
  return reminders;
}

// Kiểm tra xem reminder nào đã tới giờ trigger
export function getTriggeredReminders(tasks: Task[], now: number = Date.now()): Reminder[] {
  const triggered: Reminder[] = [];
  
  tasks.forEach(task => {
    if (!task.reminders) return;
    
    task.reminders.forEach(reminder => {
      if (!reminder.acknowledged && reminder.triggerTime <= now) {
        triggered.push(reminder);
      }
    });
  });
  
  return triggered;
}

// Phát thông báo reminder (chuông + giọng nói + notification)
export async function playReminderAlert(taskTitle: string, repeatCount: number): Promise<void> {
  try {
    // Phát chuông
    playWarningSound();
    
    // Phát giọng nói
    speakNotification(
      `Nhắc nhở. Việc ${taskTitle}. Lần ${repeatCount}.`
    );
  } catch (err) {
    console.warn('Error playing reminder alert:', err);
  }
}

// Phát thông báo đẩy cho reminder
export function sendReminderNotification(taskTitle: string, repeatCount: number, taskId: string): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  
  try {
    new Notification(`🔔 Nhắc nhở: ${taskTitle}`, {
      body: `Lần ${repeatCount} nhắc nhở`,
      tag: `reminder-${taskId}`,
      requireInteraction: true,
    } as NotificationOptions & { vibrate?: number[] });
  } catch (err) {
    console.warn('Error sending reminder notification:', err);
  }
}
