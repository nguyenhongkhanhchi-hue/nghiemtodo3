import { create } from 'zustand';
import type { WaterEntry, WeightEntry, WaistEntry, HealthGoals, WaterReminderSettings } from '@/types/health';
import { supabase } from '@/lib/supabase';

const STORAGE_KEY_PREFIX = 'nw_health_';

export interface ExtendedHealthState {
  waterEntries: WaterEntry[];
  weightEntries: WeightEntry[];
  waistEntries: WaistEntry[];
  dailyWaterGoal: number;
  weightUnit: 'kg' | 'lbs';
  goals: HealthGoals;
  waterReminder: WaterReminderSettings;
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function getTodayStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

const DEFAULT_STATE: ExtendedHealthState = {
  waterEntries: [],
  weightEntries: [],
  waistEntries: [],
  dailyWaterGoal: 2000,
  weightUnit: 'kg',
  goals: {},
  waterReminder: { enabled: false, intervalMinutes: 60, startHour: 7, endHour: 22 },
};

function loadHealthLocal(userId: string): ExtendedHealthState {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (!parsed.goals) parsed.goals = {};
      if (!parsed.waterReminder) parsed.waterReminder = DEFAULT_STATE.waterReminder;
      return parsed;
    }
  } catch {}
  return { ...DEFAULT_STATE };
}

function saveHealthLocal(userId: string, state: ExtendedHealthState) {
  localStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(state));
}

// ── Cloud sync helpers ────────────────────────────────────────────────────────
async function loadHealthFromDB(userId: string): Promise<ExtendedHealthState | null> {
  try {
    const { data, error } = await supabase
      .from('health_data')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error || !data) return null;
    return {
      waterEntries: data.water_entries || [],
      weightEntries: data.weight_entries || [],
      waistEntries: data.waist_entries || [],
      dailyWaterGoal: data.daily_water_goal || 2000,
      weightUnit: data.weight_unit || 'kg',
      goals: data.goals || {},
      waterReminder: data.water_reminder || DEFAULT_STATE.waterReminder,
    };
  } catch {
    return null;
  }
}

async function saveHealthToDB(userId: string, state: ExtendedHealthState): Promise<void> {
  try {
    await supabase.from('health_data').upsert({
      user_id: userId,
      water_entries: state.waterEntries,
      weight_entries: state.weightEntries,
      waist_entries: state.waistEntries,
      daily_water_goal: state.dailyWaterGoal,
      weight_unit: state.weightUnit,
      goals: state.goals,
      water_reminder: state.waterReminder,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
  } catch (e) {
    console.error('[HealthStore] saveHealthToDB error:', e);
  }
}

let _saveTimer: ReturnType<typeof setTimeout> | null = null;
function debouncedSave(userId: string, state: ExtendedHealthState) {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    saveHealthLocal(userId, state);
    if (userId !== 'admin') saveHealthToDB(userId, state);
  }, 800);
}

interface HealthStore {
  state: ExtendedHealthState;
  _userId: string | undefined;
  isSyncing: boolean;
  lastSynced: number | null;
  initForUser: (userId: string) => Promise<void>;
  syncFromCloud: () => Promise<void>;
  addWater: (amount: number) => void;
  removeWater: (id: string) => void;
  resetTodayWater: () => void;
  setDailyWaterGoal: (goal: number) => void;
  addWeight: (value: number, note?: string) => void;
  removeWeight: (id: string) => void;
  addWaist: (value: number, note?: string) => void;
  removeWaist: (id: string) => void;
  setWeightUnit: (unit: 'kg' | 'lbs') => void;
  setGoals: (goals: HealthGoals) => void;
  setWaterReminder: (settings: WaterReminderSettings) => void;
}

export const useHealthStore = create<HealthStore>((set, get) => ({
  state: { ...DEFAULT_STATE },
  _userId: undefined,
  isSyncing: false,
  lastSynced: null,

  initForUser: async (userId) => {
    const local = loadHealthLocal(userId);
    set({ state: local, _userId: userId });

    if (userId === 'admin') return;

    set({ isSyncing: true });
    const cloud = await loadHealthFromDB(userId);
    set({ isSyncing: false });

    if (cloud) {
      // Merge: prefer cloud but keep any local entries that are newer
      const merged: ExtendedHealthState = {
        ...cloud,
        waterEntries: mergeEntries(local.waterEntries, cloud.waterEntries),
        weightEntries: mergeEntries(local.weightEntries, cloud.weightEntries),
        waistEntries: mergeEntries(local.waistEntries, cloud.waistEntries),
      };
      set({ state: merged, lastSynced: Date.now() });
      saveHealthLocal(userId, merged);
    }
  },

  syncFromCloud: async () => {
    const userId = get()._userId;
    if (!userId || userId === 'admin') return;
    set({ isSyncing: true });
    const cloud = await loadHealthFromDB(userId);
    set({ isSyncing: false });
    if (cloud) {
      const local = get().state;
      const merged: ExtendedHealthState = {
        ...cloud,
        waterEntries: mergeEntries(local.waterEntries, cloud.waterEntries),
        weightEntries: mergeEntries(local.weightEntries, cloud.weightEntries),
        waistEntries: mergeEntries(local.waistEntries, cloud.waistEntries),
      };
      set({ state: merged, lastSynced: Date.now() });
      saveHealthLocal(userId, merged);
    }
  },

  addWater: (amount) => {
    const userId = get()._userId;
    if (!userId) return;
    const entry: WaterEntry = { id: genId(), amount, timestamp: Date.now(), date: getTodayStr() };
    const updated = { ...get().state, waterEntries: [...get().state.waterEntries, entry] };
    set({ state: updated });
    debouncedSave(userId, updated);
  },

  removeWater: (id) => {
    const userId = get()._userId;
    if (!userId) return;
    const updated = { ...get().state, waterEntries: get().state.waterEntries.filter(e => e.id !== id) };
    set({ state: updated });
    debouncedSave(userId, updated);
  },

  resetTodayWater: () => {
    const userId = get()._userId;
    if (!userId) return;
    const today = getTodayStr();
    const updated = { ...get().state, waterEntries: get().state.waterEntries.filter(e => e.date !== today) };
    set({ state: updated });
    debouncedSave(userId, updated);
  },

  setDailyWaterGoal: (goal) => {
    const userId = get()._userId;
    if (!userId) return;
    const updated = { ...get().state, dailyWaterGoal: goal };
    set({ state: updated });
    debouncedSave(userId, updated);
  },

  addWeight: (value, note) => {
    const userId = get()._userId;
    if (!userId) return;
    const entry: WeightEntry = { id: genId(), value, timestamp: Date.now(), date: getTodayStr(), note };
    const updated = { ...get().state, weightEntries: [...get().state.weightEntries, entry] };
    set({ state: updated });
    debouncedSave(userId, updated);
  },

  removeWeight: (id) => {
    const userId = get()._userId;
    if (!userId) return;
    const updated = { ...get().state, weightEntries: get().state.weightEntries.filter(e => e.id !== id) };
    set({ state: updated });
    debouncedSave(userId, updated);
  },

  addWaist: (value, note) => {
    const userId = get()._userId;
    if (!userId) return;
    const entry: WaistEntry = { id: genId(), value, timestamp: Date.now(), date: getTodayStr(), note };
    const updated = { ...get().state, waistEntries: [...get().state.waistEntries, entry] };
    set({ state: updated });
    debouncedSave(userId, updated);
  },

  removeWaist: (id) => {
    const userId = get()._userId;
    if (!userId) return;
    const updated = { ...get().state, waistEntries: get().state.waistEntries.filter(e => e.id !== id) };
    set({ state: updated });
    debouncedSave(userId, updated);
  },

  setWeightUnit: (unit) => {
    const userId = get()._userId;
    if (!userId) return;
    const updated = { ...get().state, weightUnit: unit };
    set({ state: updated });
    debouncedSave(userId, updated);
  },

  setGoals: (goals) => {
    const userId = get()._userId;
    if (!userId) return;
    const updated = { ...get().state, goals };
    set({ state: updated });
    debouncedSave(userId, updated);
  },

  setWaterReminder: (waterReminder) => {
    const userId = get()._userId;
    if (!userId) return;
    const updated = { ...get().state, waterReminder };
    set({ state: updated });
    debouncedSave(userId, updated);
  },
}));

// ── Merge entries by id (deduplicate) ────────────────────────────────────────
function mergeEntries<T extends { id: string; timestamp: number }>(
  local: T[], cloud: T[]
): T[] {
  const map = new Map<string, T>();
  [...local, ...cloud].forEach(e => {
    const existing = map.get(e.id);
    if (!existing || e.timestamp > existing.timestamp) map.set(e.id, e);
  });
  return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
}
