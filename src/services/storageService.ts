import {
  Employee,
  TimekeepingDayRecord,
  TimekeepingSettings,
} from '../types/timekeeping';
import {
  INITIAL_EMPLOYEES,
  DEFAULT_SETTINGS,
  generateSeedFortnightRecords,
} from '../utils/sampleData';
import { recalculateDayRecord } from '../utils/timeCalculations';

const STORAGE_KEYS = {
  EMPLOYEES: 'chronos_employees_v1',
  RECORDS: 'chronos_records_v1',
  SETTINGS: 'chronos_settings_v1',
};

export function loadSettings(): TimekeepingSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error('Failed to load settings', e);
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: TimekeepingSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings', e);
  }
}

export function loadEmployees(): Employee[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load employees', e);
  }
  // Fallback to initial seed
  saveEmployees(INITIAL_EMPLOYEES);
  return INITIAL_EMPLOYEES;
}

export function saveEmployees(employees: Employee[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
  } catch (e) {
    console.error('Failed to save employees', e);
  }
}

export function loadRecords(
  employees: Employee[],
  settings: TimekeepingSettings
): TimekeepingDayRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RECORDS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load records', e);
  }
  // Generate default fortnight seed
  const seeds = generateSeedFortnightRecords(employees, settings);
  saveRecords(seeds);
  return seeds;
}

export function saveRecords(records: TimekeepingDayRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
  } catch (e) {
    console.error('Failed to save records', e);
  }
}

export function resetToSampleData(): {
  employees: Employee[];
  records: TimekeepingDayRecord[];
  settings: TimekeepingSettings;
} {
  saveEmployees(INITIAL_EMPLOYEES);
  saveSettings(DEFAULT_SETTINGS);
  const records = generateSeedFortnightRecords(INITIAL_EMPLOYEES, DEFAULT_SETTINGS);
  saveRecords(records);
  return {
    employees: INITIAL_EMPLOYEES,
    records,
    settings: DEFAULT_SETTINGS,
  };
}

/**
 * Suggest next employee number based on highest numeric value on file
 */
export function getNextSuggestedEmployeeNumber(employees: Employee[]): string {
  if (!employees || employees.length === 0) return '1001';

  let maxNum = 0;
  for (const emp of employees) {
    const cleanNum = emp.employeeNumber.replace(/\D/g, '');
    const val = parseInt(cleanNum, 10);
    if (!isNaN(val) && val > maxNum) {
      maxNum = val;
    }
  }

  if (maxNum === 0) return '1001';
  return String(maxNum + 1);
}

/**
 * Apply schedule across a date range for an employee
 */
export function applyScheduleRange(
  employee: Employee,
  dates: string[],
  scheduleIn: string,
  scheduleOut: string,
  isDayOff: boolean,
  existingRecords: TimekeepingDayRecord[],
  settings: TimekeepingSettings
): TimekeepingDayRecord[] {
  const recordsMap = new Map<string, TimekeepingDayRecord>();
  for (const r of existingRecords) {
    recordsMap.set(r.id, r);
  }

  for (const dateStr of dates) {
    const id = `day-${employee.id}-${dateStr}`;
    const existing = recordsMap.get(id);

    const base: Partial<TimekeepingDayRecord> = {
      id,
      employeeId: employee.id,
      employeeNumber: employee.employeeNumber,
      date: dateStr,
      scheduleIn: isDayOff ? '' : scheduleIn,
      scheduleOut: isDayOff ? '' : scheduleOut,
      isDayOff,
      dayType: isDayOff ? 'day_off' : existing?.dayType === 'day_off' ? 'regular' : existing?.dayType || 'regular',
      leaveType: existing?.leaveType || 'none',
      time1In: existing?.time1In || '',
      time1Out: existing?.time1Out || '',
      time2In: existing?.time2In || '',
      time2Out: existing?.time2Out || '',
      otIn: existing?.otIn || '',
      otOut: existing?.otOut || '',
      adjustments: existing?.adjustments || [],
      remarks: existing?.remarks || '',
      isFullDayCredit: existing?.isFullDayCredit,
      fullDayCreditHours: existing?.fullDayCreditHours,
      fullDayCreditReason: existing?.fullDayCreditReason,
    };

    const recomputed = recalculateDayRecord(base, settings, employee.dutyHours);
    recordsMap.set(id, recomputed);
  }

  return Array.from(recordsMap.values());
}

/**
 * Apply Management Full Day Credit Announcement (e.g. Saturday 5-6h paid as 8h)
 * across specified dates for all or selected employees.
 */
export function applyManagementDayAnnouncement(
  targetDates: string[],
  employees: Employee[],
  existingRecords: TimekeepingDayRecord[],
  settings: TimekeepingSettings,
  creditHours = 8,
  reason = 'Management Announcement: Full Day Duty Credit (Paid 8 Hours)',
  targetEmployeeId?: string // undefined = all employees
): TimekeepingDayRecord[] {
  const recordsMap = new Map<string, TimekeepingDayRecord>();
  for (const r of existingRecords) {
    recordsMap.set(r.id, r);
  }

  const targetEmps = targetEmployeeId
    ? employees.filter((e) => e.id === targetEmployeeId)
    : employees;

  for (const emp of targetEmps) {
    for (const dateStr of targetDates) {
      const id = `day-${emp.id}-${dateStr}`;
      const existing = recordsMap.get(id);

      const base: Partial<TimekeepingDayRecord> = existing
        ? {
            ...existing,
            isFullDayCredit: true,
            fullDayCreditHours: creditHours,
            fullDayCreditReason: reason,
            remarks: existing.remarks
              ? `${existing.remarks} | ${reason}`
              : reason,
          }
        : {
            id,
            employeeId: emp.id,
            employeeNumber: emp.employeeNumber,
            date: dateStr,
            scheduleIn: emp.defaultShiftIn,
            scheduleOut: emp.defaultShiftOut,
            isDayOff: false,
            dayType: 'regular',
            leaveType: 'none',
            time1In: '',
            time1Out: '',
            time2In: '',
            time2Out: '',
            otIn: '',
            otOut: '',
            adjustments: [],
            isFullDayCredit: true,
            fullDayCreditHours: creditHours,
            fullDayCreditReason: reason,
            remarks: reason,
          };

      const recomputed = recalculateDayRecord(base, settings, emp.dutyHours);
      recordsMap.set(id, recomputed);
    }
  }

  return Array.from(recordsMap.values());
}

/**
 * Synchronize all ledger records for an employee to match their current profile
 * (Schedule Type, Shift In/Out, Duty Hours, and Rest Days).
 */
export function syncEmployeeLedgerRecords(
  employee: Employee,
  existingRecords: TimekeepingDayRecord[],
  settings: TimekeepingSettings
): TimekeepingDayRecord[] {
  return existingRecords.map((r) => {
    if (r.employeeId !== employee.id) {
      return r;
    }

    const dateObj = new Date(r.date + 'T00:00:00');
    const dayOfWeekIndex = dateObj.getDay();
    const isRestDay = employee.restDays
      ? employee.restDays.includes(dayOfWeekIndex)
      : dayOfWeekIndex === 0;

    const updatedBase: Partial<TimekeepingDayRecord> = {
      ...r,
      scheduleIn: isRestDay ? '' : employee.defaultShiftIn,
      scheduleOut: isRestDay ? '' : employee.defaultShiftOut,
      isDayOff: isRestDay,
      dayType: isRestDay
        ? 'day_off'
        : r.dayType === 'day_off'
        ? 'regular'
        : r.dayType,
    };

    return recalculateDayRecord(updatedBase, settings, employee.dutyHours);
  });
}
