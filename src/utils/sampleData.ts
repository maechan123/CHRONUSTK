import { Employee, TimekeepingDayRecord, TimekeepingSettings } from '../types/timekeeping';
import { recalculateDayRecord, getDayOfWeek } from './timeCalculations';

export const DEFAULT_SETTINGS: TimekeepingSettings = {
  lateGracePeriodMinutes: 15,
  ndfStartHour: 22,
  ndfEndHour: 6,
  defaultDutyHours: 8,
  companyName: 'Selah Hotels & Resorts',
};

export const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: 'emp-1001',
    employeeNumber: '1001',
    name: 'Maria Elena Santos',
    bank: 'BDO Unibank',
    deployment: 'Selah Garden Hotel',
    employmentStatus: 'Regular',
    scheduleType: 'Shifting',
    dutyHours: 8,
    department: 'Front Office',
    position: 'Front Desk Officer',
    defaultShiftIn: '06:00',
    defaultShiftOut: '15:00',
    restDays: [0], // Sunday
    email: 'm.santos@selahhotels.com',
  },
  {
    id: 'emp-1002',
    employeeNumber: '1002',
    name: 'Juan Miguel Dela Cruz',
    bank: 'BPI',
    deployment: 'Selah Garden Hotel',
    employmentStatus: 'Regular',
    scheduleType: 'Shifting',
    dutyHours: 8,
    department: 'Front Office',
    position: 'Night Auditor',
    defaultShiftIn: '22:00',
    defaultShiftOut: '07:00',
    restDays: [1], // Monday
    email: 'j.delacruz@selahhotels.com',
  },
  {
    id: 'emp-1003',
    employeeNumber: '1003',
    name: 'Angela Nicole Ramos',
    bank: 'Landbank',
    deployment: 'Selah Pods Pasay',
    employmentStatus: 'Regular',
    scheduleType: 'Fixed',
    dutyHours: 8,
    department: 'Housekeeping',
    position: 'Housekeeping Supervisor',
    defaultShiftIn: '08:00',
    defaultShiftOut: '17:00',
    restDays: [0, 6], // Sun, Sat
    email: 'a.ramos@selahhotels.com',
  },
  {
    id: 'emp-1004',
    employeeNumber: '1004',
    name: 'Roberto Carlos Garcia',
    bank: 'Metrobank',
    deployment: 'Selah Pods Pasay',
    employmentStatus: 'Probationary',
    scheduleType: 'Shifting',
    dutyHours: 8,
    department: 'Housekeeping',
    position: 'Room Attendant',
    defaultShiftIn: '08:00',
    defaultShiftOut: '17:00',
    restDays: [2], // Tuesday
    email: 'r.garcia@selahhotels.com',
  },
  {
    id: 'emp-1005',
    employeeNumber: '1005',
    name: 'Chef Michael Tan',
    bank: 'UnionBank',
    deployment: 'Selah Garden Hotel',
    employmentStatus: 'Regular',
    scheduleType: 'Fixed',
    dutyHours: 8,
    department: 'Food & Beverage',
    position: 'Head Chef',
    defaultShiftIn: '06:00',
    defaultShiftOut: '15:00',
    restDays: [0],
    email: 'm.tan@selahhotels.com',
  },
  {
    id: 'emp-1006',
    employeeNumber: '1006',
    name: 'Patricia May Reyes',
    bank: 'BDO Unibank',
    deployment: 'Selah Lofts',
    employmentStatus: 'Contractual',
    scheduleType: 'Shifting',
    dutyHours: 8,
    department: 'Food & Beverage',
    position: 'F&B Service Crew',
    defaultShiftIn: '14:00',
    defaultShiftOut: '23:00',
    restDays: [3], // Wednesday
    email: 'p.reyes@selahhotels.com',
  },
  {
    id: 'emp-1007',
    employeeNumber: '1007',
    name: 'Eduardo Lim',
    bank: 'Security Bank',
    deployment: 'Selah Garden Hotel',
    employmentStatus: 'Regular',
    scheduleType: 'Fixed',
    dutyHours: 8,
    department: 'Engineering',
    position: 'Chief Engineer',
    defaultShiftIn: '08:00',
    defaultShiftOut: '17:00',
    restDays: [0, 6],
    email: 'e.lim@selahhotels.com',
  },
  {
    id: 'emp-1008',
    employeeNumber: '1008',
    name: 'Karen Sophia Flores',
    bank: 'BPI',
    deployment: 'Head Office',
    employmentStatus: 'Regular',
    scheduleType: 'Fixed',
    dutyHours: 8,
    department: 'Admin & HR',
    position: 'HR & Payroll Specialist',
    defaultShiftIn: '08:30',
    defaultShiftOut: '17:30',
    restDays: [0, 6],
    email: 'k.flores@selahhotels.com',
  },
  {
    id: 'emp-1009',
    employeeNumber: '1009',
    name: 'Mark Vincent Castro',
    bank: 'UnionBank',
    deployment: 'Head Office',
    employmentStatus: 'Regular',
    scheduleType: 'Flexible',
    dutyHours: 8,
    department: 'IT & Systems',
    position: 'Systems Administrator',
    defaultShiftIn: '09:00',
    defaultShiftOut: '18:00',
    restDays: [0, 6],
    email: 'm.castro@selahhotels.com',
  },
  {
    id: 'emp-1010',
    employeeNumber: '1010',
    name: 'Crisanto Bautista',
    bank: 'Landbank',
    deployment: 'Selah Garden Hotel',
    employmentStatus: 'Regular',
    scheduleType: 'Shifting',
    dutyHours: 8,
    department: 'Security',
    position: 'Security Officer-in-Charge',
    defaultShiftIn: '18:00',
    defaultShiftOut: '06:00',
    restDays: [4], // Thursday
    email: 'c.bautista@selahhotels.com',
  },
];

/**
 * Generate seed fortnight records for the first 15 days of current month
 */
export function generateSeedFortnightRecords(
  employees: Employee[],
  settings: TimekeepingSettings
): TimekeepingDayRecord[] {
  const records: TimekeepingDayRecord[] = [];
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  // Dates 01 to 15
  for (let d = 1; d <= 15; d++) {
    const dayStr = String(d).padStart(2, '0');
    const dateStr = `${year}-${month}-${dayStr}`;
    const dayOfWeek = getDayOfWeek(dateStr);
    const dateObj = new Date(dateStr + 'T00:00:00');
    const dayOfWeekIndex = dateObj.getDay();

    // Day 9 is designated as a Legal Holiday (e.g. National Day / Feast)
    const isHoliday = d === 9;

    for (const emp of employees) {
      const isRestDay = emp.restDays ? emp.restDays.includes(dayOfWeekIndex) : dayOfWeekIndex === 0;

      let schedIn = emp.defaultShiftIn;
      let schedOut = emp.defaultShiftOut;

      let t1In = '';
      let t1Out = '';
      let t2In = '';
      let t2Out = '';
      let otIn = '';
      let otOut = '';

      let dayType: any = isRestDay ? 'day_off' : isHoliday ? 'legal_holiday' : 'regular';
      let leaveType: any = 'none';
      let remarks = '';
      const adjustments: any[] = [];

      if (isRestDay) {
        schedIn = '';
        schedOut = '';
        // Angela Ramos worked on rest day on Day 5 (Cancelled Off)
        if (emp.employeeNumber === '1003' && d === 5) {
          dayType = 'cancelled_off_regular';
          schedIn = '08:00';
          schedOut = '17:00';
          t1In = '07:55:00';
          t1Out = '12:00:00';
          t2In = '13:00:00';
          t2Out = '17:05:00';
          remarks = 'Approved Rest Day duty per GM request';
        }
      } else {
        // Working day
        // Special scenario variations for realistic testing:
        if (emp.employeeNumber === '1001') {
          // Maria Elena Santos (06:00 - 15:00)
          if (d === 2) {
            // Late punch (06:22:15 - over 15 min grace period)
            t1In = '06:22:15';
            t1Out = '12:00:00';
            t2In = '13:00:00';
            t2Out = '15:00:00';
            remarks = 'Late: Traffic along EDSA';
          } else if (d === 4) {
            // Overtime 2 hours (15:00 to 17:00)
            t1In = '05:56:00';
            t1Out = '12:00:00';
            t2In = '13:00:00';
            t2Out = '17:00:00';
            otIn = '15:00:00';
            otOut = '17:00:00';
            remarks = 'Covered VIP Banquet group check-in';
          } else if (d === 7) {
            // Undertime (left at 14:15 instead of 15:00)
            t1In = '05:58:00';
            t1Out = '12:00:00';
            t2In = '13:00:00';
            t2Out = '14:15:00';
            remarks = 'Left early - dental appointment';
          } else if (d === 8) {
            // Sample: NO IN PUNCH (missed morning tap in, only tapped afternoon out)
            t1In = '';
            t1Out = '12:00:00';
            t2In = '13:00:00';
            t2Out = '15:00:00';
            remarks = 'NO IN: Missed morning biometrics tap in - pending supervisor verification';
          } else if (d === 11) {
            // Sample: NO OUT PUNCH (tapped in at 05:54, forgot shift out)
            t1In = '05:54:00';
            t1Out = '';
            t2In = '';
            t2Out = '';
            remarks = 'NO OUT: Forgot evening biometrics tap during system transfer';
          } else if (d === 13) {
            // Sick Leave
            leaveType = 'sl';
            remarks = 'Flu - MedCert submitted';
          } else {
            // Normal shift
            t1In = '05:52:00';
            t1Out = '12:00:00';
            t2In = '13:00:00';
            t2Out = '15:02:00';
          }
        } else if (emp.employeeNumber === '1004') {
          // Roberto Carlos Garcia (Housekeeping - Room Attendant)
          // Sample: Occasional missing biometric punch
          if (d === 3) {
            // NO IN
            t1In = '';
            t1Out = '12:00:00';
            t2In = '13:00:00';
            t2Out = '17:00:00';
            remarks = 'NO IN: Room attendant missed morning bio log';
          } else if (d === 6) {
            // NO OUT
            t1In = '08:00:00';
            t1Out = '12:00:00';
            t2In = '13:00:00';
            t2Out = '';
            remarks = 'NO OUT: Missed afternoon shift out bio log';
          } else if (d === 14) {
            t1In = '08:00:00';
            t1Out = '12:00:00';
            t2In = '13:00:00';
            t2Out = '16:00:00';
            remarks = 'Undertime: Emergency family matter';
          } else {
            t1In = '07:58:00';
            t1Out = '12:00:00';
            t2In = '13:00:00';
            t2Out = '17:01:00';
          }
        } else if (emp.employeeNumber === '1007') {
          // Eduardo Lim (Maintenance Technician)
          // Sample: Frequently does NOT use bio (roving repairs / field duties) - Habitual Missing Bio
          if (d === 2) {
            // NO IN
            t1In = '';
            t1Out = '12:00:00';
            t2In = '13:00:00';
            t2Out = '17:00:00';
            remarks = 'NO IN: Dispatched directly to chiller plant repair';
          } else if (d === 5) {
            // NO OUT
            t1In = '08:00:00';
            t1Out = '12:00:00';
            t2In = '';
            t2Out = '';
            remarks = 'NO OUT: Emergency generator servicing past shift';
          } else if (d === 8) {
            // NO IN
            t1In = '';
            t1Out = '12:00:00';
            t2In = '13:00:00';
            t2Out = '17:00:00';
            remarks = 'NO IN: Roving maintenance duty without tap in';
          } else if (d === 12) {
            // NO OUT
            t1In = '08:05:00';
            t1Out = '';
            t2In = '';
            t2Out = '';
            remarks = 'NO OUT: Forgot shift out log';
          } else {
            t1In = '08:00:00';
            t1Out = '12:00:00';
            t2In = '13:00:00';
            t2Out = '17:00:00';
          }
        } else if (emp.employeeNumber === '1010') {
          // Crisanto Bautista (Security)
          if (d === 8) {
            // NO OUT
            t1In = '18:00:00';
            t1Out = '';
            t2In = '';
            t2Out = '';
            remarks = 'NO OUT: Shift turnover completed without bio log';
          } else {
            t1In = '17:55:00';
            t1Out = '00:00:00';
            t2In = '01:00:00';
            t2Out = '06:00:00';
          }
        } else if (emp.employeeNumber === '1002') {
          // Juan Miguel Dela Cruz (Night Auditor 22:00 - 07:00) - Strong NDF
          t1In = '21:55:00';
          t1Out = '02:00:00';
          t2In = '03:00:00';
          t2Out = '07:02:00';
          if (d === 6) {
            // Late: 22:25:00
            t1In = '22:25:00';
            remarks = 'Late arrival due to heavy rain';
          }
          if (d === 10) {
            // OT until 09:00:00 (2 hours OT)
            t2Out = '09:00:00';
            otIn = '07:00:00';
            otOut = '09:00:00';
            remarks = 'Monthly night audit ledger closing';
          }
        } else if (emp.employeeNumber === '1006') {
          // Patricia Reyes (14:00 - 23:00) - 1 hr NDF (22:00-23:00)
          t1In = '13:50:00';
          t1Out = '18:00:00';
          t2In = '19:00:00';
          t2Out = '23:05:00';
          if (d === 3) {
            // Overtime until 01:00 (2 hrs OT + 2 hrs extra NDF)
            t2Out = '01:00:00';
            otIn = '23:00:00';
            otOut = '01:00:00';
            remarks = 'Banquet event teardown';
          }
        } else if (emp.employeeNumber === '1008') {
          // Karen Flores (HR) - 08:30 - 17:30
          t1In = '08:24:00';
          t1Out = '12:00:00';
          t2In = '13:00:00';
          t2Out = '17:35:00';
          if (d === 8) {
            // Vacation Leave
            leaveType = 'vl';
            remarks = 'Pre-approved annual leave';
          }
          if (d === 12) {
            // Manual adjustment: 1 hr OT payment for payroll rush
            adjustments.push({
              id: `adj-1008-${dateStr}-1`,
              type: 'OT',
              action: 'payment',
              durationSeconds: 3600,
              remarks: 'HR Memo #88 - 15th payroll cutoff preparation',
              createdAt: new Date().toISOString(),
            });
          }
        } else {
          // Default normal day for other employees
          t1In = `${emp.defaultShiftIn}:00`;
          t1Out = '12:00:00';
          t2In = '13:00:00';
          t2Out = `${emp.defaultShiftOut}:00`;

          if (d === 14 && emp.employeeNumber === '1004') {
            // Roberto Garcia undertime
            t2Out = '16:00:00';
            remarks = 'Emergency family matter';
          }
        }
      }

      const rec = recalculateDayRecord(
        {
          id: `day-${emp.id}-${dateStr}`,
          employeeId: emp.id,
          employeeNumber: emp.employeeNumber,
          date: dateStr,
          dayOfWeek,
          scheduleIn: schedIn,
          scheduleOut: schedOut,
          isDayOff: isRestDay,
          dayType,
          leaveType,
          time1In: t1In,
          time1Out: t1Out,
          time2In: t2In,
          time2Out: t2Out,
          otIn,
          otOut,
          adjustments,
          remarks,
        },
        settings,
        emp.dutyHours
      );

      records.push(rec);
    }
  }

  return records;
}

/**
 * Sample biometric raw .dat / .txt file text for testing the import tool
 */
export const SAMPLE_BIOMETRIC_FILE_CONTENT = `1001\t2026-10-16 05:54:10\t1\t0\t1\t0
1001\t2026-10-16 12:01:25\t1\t0\t1\t0
1001\t2026-10-16 13:02:10\t1\t0\t1\t0
1001\t2026-10-16 15:05:42\t1\t0\t1\t0
1001\t2026-10-17 06:25:30\t1\t0\t1\t0
1001\t2026-10-17 15:02:11\t1\t0\t1\t0
1002\t2026-10-16 21:55:00\t1\t0\t1\t0
1002\t2026-10-16 07:05:12\t1\t0\t1\t0
1002\t2026-10-17 22:20:15\t1\t0\t1\t0
1002\t2026-10-17 07:01:00\t1\t0\t1\t0
1003\t2026-10-16 07:56:44\t1\t0\t1\t0
1003\t2026-10-16 17:03:22\t1\t0\t1\t0
1003\t2026-10-17 07:58:10\t1\t0\t1\t0
1003\t2026-10-17 16:30:15\t1\t0\t1\t0
1004\t2026-10-16 07:52:19\t1\t0\t1\t0
1004\t2026-10-16 17:01:05\t1\t0\t1\t0
1004\t2026-10-17 08:35:10\t1\t0\t1\t0
1005\t2026-10-16 05:48:12\t1\t0\t1\t0
1005\t2026-10-16 15:08:44\t1\t0\t1\t0
1005\t2026-10-17 05:50:00\t1\t0\t1\t0
1005\t2026-10-17 17:30:00\t1\t0\t1\t0
1006\t2026-10-16 13:55:20\t1\t0\t1\t0
1006\t2026-10-16 23:04:10\t1\t0\t1\t0
1007\t2026-10-16 07:50:00\t1\t0\t1\t0
1007\t2026-10-16 17:02:11\t1\t0\t1\t0
1008\t2026-10-16 08:22:45\t1\t0\t1\t0
1008\t2026-10-16 17:35:20\t1\t0\t1\t0
1009\t2026-10-16 08:58:10\t1\t0\t1\t0
1009\t2026-10-16 18:05:00\t1\t0\t1\t0
1010\t2026-10-16 17:55:00\t1\t0\t1\t0
1010\t2026-10-16 06:05:00\t1\t0\t1\t0
9999\t2026-10-16 08:00:00\t1\t0\t1\t0
8888\t2026-10-16 17:00:00\t1\t0\t1\t0`;
