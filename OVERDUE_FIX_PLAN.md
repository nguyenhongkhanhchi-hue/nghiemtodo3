# 🔴 BẢN VÁ LỖI QUÁ HẠN (OVERDUE) - Kế hoạch sửa lỗi toàn diện

## 📋 TÓM TẮT CÁC LỖI PHÁT HIỆN

### 1. **Thiết kế sai cơ bản: OVERDUE vừa là Status vừa là Quadrant**
- ❌ `TaskStatus` có `'overdue'` 
- ❌ `EisenhowerQuadrant` có `'overdue'`
- 🔧 **Quyết định**: OVERDUE chỉ là **trạng thái ảo** (tasks có deadline < now)

### 2. **`markOverdue()` không tự động chạy**
- ❌ Không có timer/interval
- ❌ Không tự động khi khởi động app
- 🔧 **Fix**: Thêm auto-check mỗi 10 giây + check khi khởi động

### 3. **`calculateQuadrant()` trả về 'overdue' gây conflict**
- ❌ Tasks bị stuck ở quadrant 'overdue'
- 🔧 **Fix**: Loại bỏ 'overdue' khỏi EisenhowerQuadrant, chỉ dùng filter runtime

### 4. **Count overdue sai do dùng `task.status === 'overdue'`**
- ❌ BottomNav, TaskList đều dùng filter sai
- 🔧 **Fix**: Dùng function `isTaskOverdue()` thống nhất

### 5. **`restoreTask()` không update quadrant**
- ❌ Restore từ overdue không tự động chuyển về quadrant phù hợp
- 🔧 **Fix**: Auto-recalculate quadrant khi restore

### 6. **Không có visual indicator rõ ràng**
- ❌ Tab overdue mờ nhạt
- 🔧 **Fix**: Thêm animation, highlight, countdown

---

## 🔧 CHIẾN LƯỢC SỬA LỖI

### **OPTION 1: Giữ nguyên thiết kế hiện tại + Vá lỗi (Recommended)**
**Ưu điểm:**
- Ít breaking changes
- Không cần migration data
- Sửa nhanh

**Nhược điểm:**
- Vẫn giữ 'overdue' trong type definitions (confusing)

**Các bước:**
1. ✅ Giữ nguyên `type EisenhowerQuadrant = 'do_first' | 'schedule' | 'delegate' | 'eliminate' | 'overdue'`
2. ✅ Giữ nguyên `type TaskStatus = 'pending' | 'in_progress' | 'paused' | 'done' | 'overdue'`
3. 🔧 Loại bỏ logic tự động set `status = 'overdue'` và `quadrant = 'overdue'`
4. 🔧 Thêm helper function `isTaskOverdue(task)` dùng runtime check
5. 🔧 Thêm auto-check interval để UI cập nhật realtime
6. 🔧 Fix tất cả các chỗ dùng filter/count overdue

### **OPTION 2: Refactor toàn bộ - Loại bỏ 'overdue' khỏi types**
**Ưu điểm:**
- Clean architecture
- Không confusing
- Dễ maintain

**Nhược điểm:**
- ⚠️ Breaking changes lớn
- Cần migration dữ liệu cũ
- Tốn thời gian test

**Các bước:**
1. 🔥 Loại bỏ 'overdue' khỏi `EisenhowerQuadrant`
2. 🔥 Loại bỏ 'overdue' khỏi `TaskStatus`
3. 🔧 Thêm computed property `isOverdue` vào Task interface
4. 🔧 Migration: Chuyển tất cả tasks có `status/quadrant = 'overdue'` → `pending` + deadline < now
5. 🔧 Update toàn bộ UI components

---

## 🎯 QUYẾT ĐỊNH: CHỌN OPTION 1

**Lý do:**
- Ít rủi ro, ít breaking changes
- Có thể deploy ngay
- Database/localStorage không cần migration

---

## 📝 DANH SÁCH FILE CẦN SỬA

### 1. **`src/stores/index.ts`** (Quan trọng nhất)
```typescript
// ✅ Thêm auto-check overdue interval
useEffect(() => {
  const interval = setInterval(() => {
    useTaskStore.getState().checkAndMarkOverdue();
  }, 10000); // Mỗi 10 giây
  return () => clearInterval(interval);
}, []);

// ✅ Sửa initForUser() để check ngay khi load
initForUser: async (userId) => {
  // ... existing code ...
  set({ tasks: tasksFromDB, _userId: userId, timer: restoredTimer });
  get().checkAndMarkOverdue(); // ← Thêm dòng này
},

// ✅ Rename markOverdue() → checkAndMarkOverdue() + FIX LOGIC
checkAndMarkOverdue: () => {
  const userId = get()._userId;
  const tz = useSettingsStore.getState().timezone;
  const now = getNowInTimezone(tz).getTime();
  let changed = false;
  
  const updated = get().tasks.map(t => {
    // KHÔNG set status = 'overdue', chỉ để UI filter
    // KHÔNG set quadrant = 'overdue', giữ nguyên quadrant gốc
    
    // Logic duy nhất: auto-promote schedule → do_first khi còn < 24h
    if (t.quadrant === 'schedule' && t.deadline && (t.deadline - now) < 86400000 && (t.deadline - now) > 0) {
      changed = true;
      return { ...t, quadrant: 'do_first' as const };
    }
    return t;
  });
  
  if (changed) {
    saveToStorage(getUserKey('nw_tasks', userId), updated);
    set({ tasks: updated });
    if (userId && userId !== 'admin') saveTasksToDB(userId, updated);
  }
},

// ✅ Sửa restoreTask() để auto-recalculate quadrant
restoreTask: (id) => {
  const userId = get()._userId;
  const updated = get().tasks.map(t => {
    if (t.id !== id) return t;
    
    // Auto-recalculate quadrant khi restore
    const manualQuadrant = t.quadrant === 'delegate' || t.quadrant === 'eliminate' ? t.quadrant : undefined;
    const newQuadrant = calculateQuadrant(t.deadline, manualQuadrant);
    
    return {
      ...t,
      status: 'pending' as const,
      completedAt: undefined,
      quadrant: newQuadrant,
    };
  });
  saveToStorage(getUserKey('nw_tasks', userId), updated);
  set({ tasks: updated });
  if (userId && userId !== 'admin') saveTasksToDB(userId, updated);
},
```

### 2. **`src/lib/autoQuadrant.ts`**
```typescript
// ✅ FIX: KHÔNG trả về 'overdue' nữa
export function calculateQuadrant(
  deadline: number | undefined,
  manualQuadrant?: 'delegate' | 'eliminate'
): EisenhowerQuadrant {
  if (manualQuadrant === 'delegate') return 'delegate';
  if (manualQuadrant === 'eliminate') return 'eliminate';

  if (!deadline) return 'do_first';

  const now = Date.now();
  const timeUntilDeadline = deadline - now;

  // ❌ LOẠI BỎ:
  // if (timeUntilDeadline < 0) return 'overdue';
  
  // ✅ THAY BẰNG:
  if (timeUntilDeadline < 0) {
    // Nếu quá hạn, vẫn giữ ở do_first để có thể timer
    return 'do_first';
  } else if (timeUntilDeadline <= HOURS_24) {
    return 'do_first';
  } else {
    return 'schedule';
  }
}

// ✅ FIX: Loại bỏ function này (không cần nữa)
// export function canRestoreFromOverdue() { ... }

// ✅ THÊM: Helper function để check overdue
export function isTaskOverdue(task: { deadline?: number }): boolean {
  return !!(task.deadline && task.deadline < Date.now());
}
```

### 3. **`src/components/features/TaskList.tsx`**
```typescript
import { isTaskOverdue } from '@/lib/autoQuadrant';

// ✅ Sửa tất cả các chỗ dùng isTaskOverdue
const isTaskOverdue = (task: Task) => task.deadline && task.deadline < now;
// ↓ THAY BẰNG:
import { isTaskOverdue } from '@/lib/autoQuadrant';

// ✅ Sửa filter overdue tab
const tabTasks = useMemo(() => {
  if (activeTab === 'overdue') {
    return tasks.filter(t => 
      isTaskOverdue(t) && 
      t.status !== 'done' && // ← Loại bỏ tasks đã done
      t.quadrant !== 'eliminate' // ← Loại bỏ tasks trong thùng rác
    );
  }
  return tasks.filter(t => t.quadrant === activeTab);
}, [tasks, activeTab]);

// ✅ Sửa count overdue
const overdueCount = useMemo(() => {
  const overdueTasks = tasks.filter(t => 
    isTaskOverdue(t) && 
    t.status !== 'done' &&
    t.quadrant !== 'eliminate'
  );
  return {
    total: overdueTasks.length,
    pending: overdueTasks.filter(t => t.status === 'pending').length,
    paused: overdueTasks.filter(t => t.status === 'paused').length,
    // ❌ Loại bỏ done count trong overdue (không hợp lý)
  };
}, [tasks]);
```

### 4. **`src/components/layout/BottomNav.tsx`**
```typescript
import { isTaskOverdue } from '@/lib/autoQuadrant';

// ✅ Sửa count overdue
const overdueCount = useTaskStore(s => 
  s.tasks.filter(t => 
    isTaskOverdue(t) && 
    t.status !== 'done' &&
    t.quadrant !== 'eliminate'
  ).length
);
```

### 5. **`src/App.tsx`**
```typescript
// ✅ Thêm interval để auto-check overdue mỗi 10 giây
useEffect(() => {
  if (!user) return;
  
  // Check ngay khi mount
  useTaskStore.getState().checkAndMarkOverdue();
  
  // Auto-check mỗi 10 giây
  const interval = setInterval(() => {
    useTaskStore.getState().checkAndMarkOverdue();
  }, 10000);
  
  return () => clearInterval(interval);
}, [user]);
```

### 6. **`src/components/features/TaskViewModal.tsx`**
```typescript
import { isTaskOverdue } from '@/lib/autoQuadrant';

// ✅ Sử dụng function thống nhất
const isOverdue = isTaskOverdue(task);

// ✅ Hiển thị nút "Hoàn thành" cho overdue tasks
{isOverdue && task.status !== 'done' && (
  <button onClick={() => { completeTask(task.id); onClose(); }}
    className="...">
    <CheckCircle2 size={14} /> Hoàn thành
  </button>
)}
```

---

## 🎨 CẢI THIỆN UI/UX

### **1. Tab Overdue - Nổi bật hơn**
```typescript
// TaskList.tsx - Main tabs
<button onClick={() => setActiveTab('overdue')}
  className={`... ${activeTab === 'overdue' ? 'animate-pulse' : ''}`}
  style={activeTab === 'overdue' ? {
    backgroundColor: 'rgba(248,113,113,0.2)',
    color: '#F87171',
    border: '2px solid #F87171',
  } : {}}>
  <span className="text-lg">🔥</span>
  <span>Quá hạn</span>
  {overdueCount.total > 0 && (
    <span className="... animate-bounce">{overdueCount.total}</span>
  )}
</button>
```

### **2. Task Card - Visual countdown cho overdue**
```typescript
// TaskList.tsx - Task rendering
{isOverdue && (
  <div className="mt-1 flex items-center gap-1 px-2 py-1 rounded-lg bg-[rgba(248,113,113,0.15)] border border-[rgba(248,113,113,0.3)] animate-pulse">
    <AlertCircle size={12} className="text-[var(--error)]" />
    <span className="text-[10px] font-bold text-[var(--error)]">
      Quá hạn {formatOverdueTime(task.deadline!)}
    </span>
  </div>
)}

// Helper function
function formatOverdueTime(deadline: number): string {
  const diff = Date.now() - deadline;
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days} ngày`;
  if (hours > 0) return `${hours} giờ`;
  return `vừa xong`;
}
```

### **3. Notification - Auto-show khi có overdue mới**
```typescript
// App.tsx - Watch for new overdue tasks
const prevOverdueCount = useRef(0);

useEffect(() => {
  const count = tasks.filter(isTaskOverdue).length;
  if (count > prevOverdueCount.current && count > 0) {
    toast.error(`🔥 Bạn có ${count} việc quá hạn!`, {
      action: {
        label: 'Xem ngay',
        onClick: () => useSettingsStore.getState().setCurrentPage('tasks'),
      },
    });
  }
  prevOverdueCount.current = count;
}, [tasks]);
```

---

## ✅ CHECKLIST IMPLEMENTATION

- [ ] 1. Sửa `src/lib/autoQuadrant.ts` - Loại bỏ return 'overdue'
- [ ] 2. Sửa `src/stores/index.ts`:
  - [ ] Thêm `checkAndMarkOverdue()`
  - [ ] Sửa `initForUser()` để auto-check
  - [ ] Sửa `restoreTask()` để auto-recalculate
- [ ] 3. Sửa `src/components/features/TaskList.tsx`:
  - [ ] Import `isTaskOverdue` từ autoQuadrant
  - [ ] Sửa filter overdue tab
  - [ ] Sửa count overdue
  - [ ] Thêm visual countdown
- [ ] 4. Sửa `src/components/layout/BottomNav.tsx` - Sửa count
- [ ] 5. Sửa `src/App.tsx` - Thêm auto-check interval
- [ ] 6. Sửa `src/components/features/TaskViewModal.tsx` - Dùng isTaskOverdue()
- [ ] 7. Test toàn diện:
  - [ ] Tạo task với deadline quá hạn → Check hiển thị ở tab Overdue
  - [ ] Chỉnh deadline từ quá hạn → tương lai → Check auto-remove khỏi Overdue
  - [ ] Restore task từ Overdue → Check quadrant được tính lại
  - [ ] Timer với overdue task → Check có thể bấm giờ
  - [ ] Complete overdue task → Check nhận đúng XP (5 instead of 10)
  - [ ] Đếm số lượng overdue ở BottomNav → Check đúng realtime

---

## 🚀 KẾT QUẢ MONG ĐỢI

Sau khi fix:
- ✅ Overdue tasks tự động hiển thị ở tab "🔥 Quá hạn"
- ✅ Không có tasks bị stuck ở `status/quadrant = 'overdue'`
- ✅ Count overdue chính xác realtime
- ✅ Restore task auto-recalculate quadrant đúng
- ✅ UI/UX rõ ràng, nổi bật với animation + highlight
- ✅ Auto-check mỗi 10 giây + khi khởi động app
- ✅ Complete overdue task nhận đúng XP penalty

---

## 📊 TESTING SCENARIOS

### **Scenario 1: Task tự động chuyển sang Overdue**
1. Tạo task với deadline = now + 5 phút
2. Đợi 6 phút
3. ✅ Task xuất hiện ở tab "Quá hạn"
4. ✅ BottomNav hiển thị badge overdue count

### **Scenario 2: Chỉnh deadline để thoát Overdue**
1. Tạo task với deadline = yesterday
2. ✅ Task ở tab "Quá hạn"
3. Edit deadline → tomorrow
4. ✅ Task tự động biến mất khỏi tab "Quá hạn"
5. ✅ Task xuất hiện ở tab "Lên lịch"

### **Scenario 3: Restore task từ Overdue**
1. Task ở tab "Quá hạn" với `status = 'paused'`
2. Click "Restore"
3. ✅ Task chuyển về `status = 'pending'`
4. ✅ Quadrant được tính lại (do_first nếu deadline < 24h)

### **Scenario 4: Timer với Overdue task**
1. Task ở tab "Quá hạn", `status = 'pending'`
2. ✅ Nút "Play" hiển thị
3. Click Play
4. ✅ Timer chạy bình thường
5. ✅ Task chuyển sang `status = 'in_progress'`

### **Scenario 5: Complete Overdue task - XP penalty**
1. Task ở tab "Quá hạn"
2. Click "Hoàn thành"
3. ✅ Task chuyển sang `status = 'done'`
4. ✅ Nhận 5 XP (thay vì 10 XP)
5. ✅ Toast: "Hoàn thành việc quá hạn (+5 XP)"

---

## 🔍 CODE REVIEW CHECKLIST

Trước khi deploy, đảm bảo:
- [ ] Không có hardcoded `status === 'overdue'` hoặc `quadrant === 'overdue'`
- [ ] Tất cả filter/count dùng `isTaskOverdue()` function
- [ ] Auto-check interval hoạt động đúng
- [ ] Không có memory leak từ interval
- [ ] UI responsive với overdue count thay đổi
- [ ] Toast notification không spam
- [ ] Performance OK với 100+ tasks
