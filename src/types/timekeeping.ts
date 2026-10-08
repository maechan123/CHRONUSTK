export type EmploymentStatus = 'Regular' | 'Probationary' | 'Contractual' | 'Casual' | 'Part-time';

export type ScheduleType = 'Fixed' | 'Shifting' | 'Flexible' | 'Compressed';

export type DayType =
  | 'regular'
  | 'legal_holiday'
  | 'special_holiday'
  | 'cancelled_off_regular'
  | 'cancelled_off_holiday'
  | 'day_off';

export type LeaveType = 'none' | 'vl' | 'sl' | 'unpaid';

export type AdjustmentType = 'OT' | 'UT' | 'Late' | 'NDF' | 'Day';
export type AdjustmentAction = 'payment' | 'deduct';

export interface Adjustment {
  id: string;
  type: AdjustmentType;
  action: AdjustmentAction;
  durationSeconds: number; // For OT, UT, Late, NDF
  daysValue?: number; // For 'Day' adjustment (e.g. 1 day, 0.5 day)
  remarks: string;
  createdAt: string;
}

export interface Employee {
  id: string;
  employeeNumber: string;
  name: string;
  bank: string;
  deployment: string;
  employmentStatus: EmploymentStatus;
  scheduleType: ScheduleType;
  dutyHours: number; // e.g. 8
  department: string;
  position: string;
  defaultShiftIn: string; // HH:mm e.g. "08:00"
  defaultShiftOut: string; // HH:mm e.g. "17:00"
  restDays?: number[]; // [0] = Sunday, [6] = Saturday
  email?: string;
  phone?: string;
}

export interface TimekeepingDayRecord {
  id: string;
  employeeId: string;
  employeeNumber: string;
  date: string; // YYYY-MM-DD
  dayOfWeek: string; // Mon, Tue, etc.
  
  // Scheduled Shift
  scheduleIn: string; // HH:mm or "" if day off
  scheduleOut: string; // HH:mm or "" if day off
  isDayOff: boolean;
  dayType: DayType;
  leaveType: LeaveType;

  // Punches
  time1In: string; // HH:mm:ss or HH:mm
  time1Out: string; // HH:mm:ss or HH:mm
  time2In: string; // HH:mm:ss or HH:mm
  time2Out: string; // HH:mm:ss or HH:mm
  otIn: string; // HH:mm:ss or HH:mm
  otOut: string; // HH:mm:ss or HH:mm

  // Adjustments & Remarks
  adjustments: Adjustment[];
  remarks: string;

  // Computed Values (in seconds)
  regularSeconds: number;
  lateSeconds: number;
  utSeconds: number;
  otSeconds: number;
  approvedOtSeconds?: number;
  isOtApproved?: boolean;
  ndfSeconds: number;

  // Flags
  isPresent: boolean;
  isAbsent: boolean;
  isLate: boolean;
  isUndertime: boolean;
  isNoIn: boolean;
  isNoOut: boolean;

  // Management Special Day Announcement (e.g. Saturday 5-6h paid as whole 8h)
  isFullDayCredit?: boolean;
  fullDayCreditHours?: number; // e.g. 8
  fullDayCreditReason?: string;
}

export interface FortnightPeriod {
  id: string;
  label: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

export interface BiometricLogEntry {
  employeeNumber: string;
  timestamp: string; // YYYY-MM-DD HH:mm:ss
  date: string; // YYYY-MM-DD
  time: string; // HH:mm:ss
  state?: string; // 0=in, 1=out, etc.
  rawLine: string;
}

export interface BiometricImportResult {
  totalLines: number;
  validPunches: number;
  matchedPunches: number;
  unmatchedPunches: number;
  unmatchedEmployeeNumbers: string[];
  affectedEmployees: string[];
  affectedDates: string[];
  previewRecords: TimekeepingDayRecord[];
  problemDaysCount: number;
}

export interface TimekeepingSettings {
  lateGracePeriodMinutes: number; // default 15
  ndfStartHour: number; // default 22 (10:00 PM)
  ndfEndHour: number; // default 6 (06:00 AM)
  defaultDutyHours: number; // default 8
  companyName: string;
}
