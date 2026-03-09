import { useEffect, useRef } from 'react';
import { useTaskStore } from '@/stores';
import { X, Volume2 } from 'lucide-react';
import type { Reminder } from '@/types';
import { playReminderAlert, sendReminderNotification } from '@/lib/remindersManager';

interface ReminderAlertProps {
  reminder: Reminder;
  taskTitle: string;
  onAcknowledge: () => void;
}

export function ReminderAlert({ reminder, taskTitle, onAcknowledge }: ReminderAlertProps) {
  const alertIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const updateTask = useTaskStore(s => s.updateTask);
  const tasks = useTaskStore(s => s.tasks);

  useEffect(() => {
    // Phát thông báo lần đầu
    playReminderAlert(taskTitle, reminder.repeatCount);
    sendReminderNotification(taskTitle, reminder.repeatCount, reminder.taskId);

    // Phát lại mỗi 3 giây nếu người dùng chưa bấm OK
    alertIntervalRef.current = setInterval(() => {
      playReminderAlert(taskTitle, reminder.repeatCount);
    }, 3000);

    return () => {
      if (alertIntervalRef.current) {
        clearInterval(alertIntervalRef.current);
      }
      window.speechSynthesis.cancel();
    };
  }, [reminder.id]);

  const handleAcknowledge = () => {
    // Dừng liên tục phát chuông
    if (alertIntervalRef.current) {
      clearInterval(alertIntervalRef.current);
    }
    window.speechSynthesis.cancel();

    // Cập nhật reminder thành acknowledged
    const task = tasks.find(t => t.id === reminder.taskId);
    if (task && task.reminders) {
      const updatedReminders = task.reminders.map(r =>
        r.id === reminder.id ? { ...r, acknowledged: true } : r
      );
      updateTask(reminder.taskId, { reminders: updatedReminders });
    }

    onAcknowledge();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-[var(--bg-surface)] border-2 border-[var(--accent-primary)] rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-pulse">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="size-16 rounded-full bg-[var(--accent-primary)]/20 flex items-center justify-center animate-bounce">
              <Volume2 size={32} className="text-[var(--accent-primary)]" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
            🔔 NHẮC NHỞ
          </h2>

          <p className="text-lg font-semibold text-[var(--text-primary)] mb-3">
            {taskTitle}
          </p>

          <p className="text-sm text-[var(--text-muted)] mb-6">
            Lần nhắc nhở thứ {reminder.repeatCount}
          </p>

          <p className="text-xs text-[var(--text-muted)] mb-6 bg-[var(--bg-base)] rounded p-2">
            Bấm nút bên dưới để xác nhận đã hiểu nhắc nhở
          </p>

          <button
            onClick={handleAcknowledge}
            className="w-full px-6 py-3 bg-[var(--accent-primary)] text-[var(--bg-base)] font-bold rounded-lg hover:brightness-110 transition-all active:scale-95 text-lg"
          >
            ✓ Đã Hiểu Rồi
          </button>
        </div>
      </div>
    </div>
  );
}
