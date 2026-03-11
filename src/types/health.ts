// Health tracking types

export interface WaterEntry {
  id: string;
  amount: number; // ml
  timestamp: number;
  date: string; // YYYY-MM-DD
}

export interface WeightEntry {
  id: string;
  value: number; // kg
  timestamp: number;
  date: string; // YYYY-MM-DD
  note?: string;
}

export interface WaistEntry {
  id: string;
  value: number; // cm
  timestamp: number;
  date: string; // YYYY-MM-DD
  note?: string;
}

export interface HealthState {
  waterEntries: WaterEntry[];
  weightEntries: WeightEntry[];
  waistEntries: WaistEntry[];
  dailyWaterGoal: number; // ml, default 2000
  weightUnit: 'kg' | 'lbs';
}

export type HealthViewPeriod = 'day' | 'week' | 'month' | 'year';

export interface HealthGoals {
  targetWeight?: number;    // kg
  targetWaist?: number;     // cm
  height?: number;          // cm (for BMI)
}

export interface WaterReminderSettings {
  enabled: boolean;
  intervalMinutes: number;  // e.g. 30, 45, 60
  startHour: number;        // e.g. 7
  endHour: number;          // e.g. 22
}
