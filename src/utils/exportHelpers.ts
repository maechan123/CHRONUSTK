import * as XLSX from 'xlsx';
import { Employee, TimekeepingDayRecord } from '../types/timekeeping';
import { formatDurationHms } from './timeCalculations';

export interface EmployeeSummaryRow {
  employee: Employee;
  // Identity Block
  employeeNumber: string;
  name: string;
  bank: string;
  deployment: string;
  department: string;
  position: string;
  employmentStatus: string;
  scheduleType: string;
  dutyHours: number;

  // Attendance metrics
  daysPresent: number;
  daysAbsent: number;
  daysRestDay: number;
  daysLeaveVL: number;
  daysLeaveSL: number;
  daysLeaveUnpaid: number;

  // Durations (in seconds)
  regularSeconds: number;
  lateSeconds: number;
  utSeconds: number;
  otSeconds: number; // Raw total overtime
  approvedOtSeconds: number; // Only approved / adjusted OT applied
  ndfSeconds: number; // Night differential 10PM-6AM

  // Total Hours to be Paid = (Regular Hrs + Approved/Adjust OT - Late Hrs)
  totalHoursToBePaidSeconds: number;

  // Holiday Block
  legalHolidayWorkedSeconds: number;
  legalHolidayUnworkedDays: number;
  specialHolidayWorkedSeconds: number;
  specialHolidayUnworkedDays: number;

  // Cancelled-off Block
  cancelledOffRegularSeconds: number;
  cancelledOffHolidaySeconds: number;

  // Adjustment Block
  adjustedOtSeconds: number;
  adjustedLateSeconds: number;
  adjustedUtSeconds: number;
  adjustedNdfSeconds: number;
  daysAdjustment: number;
}

export function computeEmployeeSummaryRows(
  employees: Employee[],
  records: TimekeepingDayRecord[],
  startDate: string,
  endDate: string
): EmployeeSummaryRow[] {
  // Filter records within date range
  const filteredRecords = records.filter(
    (r) => r.date >= startDate && r.date <= endDate
  );

  return employees.map((emp) => {
    const empRecords = filteredRecords.filter((r) => r.employeeId === emp.id);

    let daysPresent = 0;
    let daysAbsent = 0;
    let daysRestDay = 0;
    let daysLeaveVL = 0;
    let daysLeaveSL = 0;
    let daysLeaveUnpaid = 0;

    let regularSeconds = 0;
    let lateSeconds = 0;
    let utSeconds = 0;
    let otSeconds = 0;
    let approvedOtSeconds = 0;
    let ndfSeconds = 0;

    let legalHolidayWorkedSeconds = 0;
    let legalHolidayUnworkedDays = 0;
    let specialHolidayWorkedSeconds = 0;
    let specialHolidayUnworkedDays = 0;

    let cancelledOffRegularSeconds = 0;
    let cancelledOffHolidaySeconds = 0;

    let adjustedOtSeconds = 0;
    let adjustedLateSeconds = 0;
    let adjustedUtSeconds = 0;
    let adjustedNdfSeconds = 0;
    let daysAdjustment = 0;

    for (const r of empRecords) {
      if (r.isPresent) daysPresent++;
      else if (r.isAbsent) daysAbsent++;

      if (r.isDayOff || r.dayType === 'day_off') daysRestDay++;

      if (r.leaveType === 'vl') daysLeaveVL++;
      else if (r.leaveType === 'sl') daysLeaveSL++;
      else if (r.leaveType === 'unpaid') daysLeaveUnpaid++;

      regularSeconds += r.regularSeconds || 0;
      lateSeconds += r.lateSeconds || 0;
      utSeconds += r.utSeconds || 0;
      otSeconds += r.otSeconds || 0;
      approvedOtSeconds += r.approvedOtSeconds !== undefined ? r.approvedOtSeconds : (r.isOtApproved ? r.otSeconds : 0);
      ndfSeconds += r.ndfSeconds || 0;

      // Holiday blocks
      if (r.dayType === 'legal_holiday') {
        if (r.isPresent && r.regularSeconds > 0) {
          legalHolidayWorkedSeconds += r.regularSeconds;
        } else {
          legalHolidayUnworkedDays += 1;
        }
      } else if (r.dayType === 'special_holiday') {
        if (r.isPresent && r.regularSeconds > 0) {
          specialHolidayWorkedSeconds += r.regularSeconds;
        } else {
          specialHolidayUnworkedDays += 1;
        }
      }

      // Cancelled-off variants
      if (r.dayType === 'cancelled_off_regular') {
        cancelledOffRegularSeconds += r.regularSeconds || 0;
      } else if (r.dayType === 'cancelled_off_holiday') {
        cancelledOffHolidaySeconds += r.regularSeconds || 0;
      }

      // Tally adjustments
      for (const adj of r.adjustments || []) {
        const mult = adj.action === 'payment' ? 1 : -1;
        if (adj.type === 'OT') adjustedOtSeconds += mult * adj.durationSeconds;
        else if (adj.type === 'Late') adjustedLateSeconds += mult * adj.durationSeconds;
        else if (adj.type === 'UT') adjustedUtSeconds += mult * adj.durationSeconds;
        else if (adj.type === 'NDF') adjustedNdfSeconds += mult * adj.durationSeconds;
        else if (adj.type === 'Day') daysAdjustment += mult * (adj.daysValue || 1);
      }
    }

    // TOTAL HOURS TO BE PAID = (REGULAR HRS + APPROVED/ADJUST OT - LATE HRS)
    const totalHoursToBePaidSeconds = Math.max(
      0,
      regularSeconds + approvedOtSeconds - lateSeconds
    );

    return {
      employee: emp,
      employeeNumber: emp.employeeNumber,
      name: emp.name,
      bank: emp.bank,
      deployment: emp.deployment,
      department: emp.department,
      position: emp.position,
      employmentStatus: emp.employmentStatus,
      scheduleType: emp.scheduleType,
      dutyHours: emp.dutyHours,

      daysPresent,
      daysAbsent,
      daysRestDay,
      daysLeaveVL,
      daysLeaveSL,
      daysLeaveUnpaid,

      regularSeconds,
      lateSeconds,
      utSeconds,
      otSeconds,
      approvedOtSeconds,
      ndfSeconds,
      totalHoursToBePaidSeconds,

      legalHolidayWorkedSeconds,
      legalHolidayUnworkedDays,
      specialHolidayWorkedSeconds,
      specialHolidayUnworkedDays,

      cancelledOffRegularSeconds,
      cancelledOffHolidaySeconds,

      adjustedOtSeconds,
      adjustedLateSeconds,
      adjustedUtSeconds,
      adjustedNdfSeconds,
      daysAdjustment,
    };
  });
}

/**
 * Export consolidated payroll ledger to .xlsx file
 */
export function exportToExcel(
  summaryRows: EmployeeSummaryRow[],
  periodLabel: string,
  companyName = 'KAIROS - Unified Timekeeping System'
): void {
  // Construct spreadsheet data array
  const data = summaryRows.map((row) => ({
    'Emp No': row.employeeNumber,
    'Employee Name': row.name,
    'Department': row.department,
    'Position': row.position,
    'Bank': row.bank,
    'Deployment': row.deployment,
    'Status': row.employmentStatus,
    'Duty Hrs': row.dutyHours,
    // Attendance Counts
    'Days Present': row.daysPresent,
    'Days Absent': row.daysAbsent,
    'Rest Days': row.daysRestDay,
    'VL Days': row.daysLeaveVL,
    'SL Days': row.daysLeaveSL,
    'Unpaid Days': row.daysLeaveUnpaid,
    // Timekeeping (H:MM:SS)
    'Regular Hrs': formatDurationHms(row.regularSeconds),
    'Late Hrs': formatDurationHms(row.lateSeconds),
    'Undertime (UT)': formatDurationHms(row.utSeconds),
    'Approved/Adjust OT': formatDurationHms(row.approvedOtSeconds),
    'NDF (10PM-6AM)': formatDurationHms(row.ndfSeconds),
    'TOTAL HOURS TO BE PAID': formatDurationHms(row.totalHoursToBePaidSeconds),
    'Total Paid (Decimal Hrs)': Math.round((row.totalHoursToBePaidSeconds / 3600) * 100) / 100,
    // Holiday Block
    'Legal Hol Worked (H:MM:SS)': formatDurationHms(row.legalHolidayWorkedSeconds),
    'Legal Hol Unworked (Days)': row.legalHolidayUnworkedDays,
    'Special Hol Worked (H:MM:SS)': formatDurationHms(row.specialHolidayWorkedSeconds),
    'Special Hol Unworked (Days)': row.specialHolidayUnworkedDays,
    // Cancelled Off Block
    'Cancelled Off Reg (H:MM:SS)': formatDurationHms(row.cancelledOffRegularSeconds),
    'Cancelled Off Hol (H:MM:SS)': formatDurationHms(row.cancelledOffHolidaySeconds),
    // Adjustment Block
    'Adj OT (H:MM:SS)': formatDurationHms(row.adjustedOtSeconds),
    'Adj Late (H:MM:SS)': formatDurationHms(row.adjustedLateSeconds),
    'Adj UT (H:MM:SS)': formatDurationHms(row.adjustedUtSeconds),
    'Adj NDF (H:MM:SS)': formatDurationHms(row.adjustedNdfSeconds),
    'Days Adj (+/-)': row.daysAdjustment,
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);

  // Set column widths
  const colWidths = [
    { wch: 10 }, // Emp No
    { wch: 24 }, // Name
    { wch: 18 }, // Dept
    { wch: 20 }, // Position
    { wch: 14 }, // Bank
    { wch: 18 }, // Deployment
    { wch: 12 }, // Status
    { wch: 9 },  // Duty Hrs
    { wch: 13 }, // Days Present
    { wch: 12 }, // Days Absent
    { wch: 10 }, // Rest Days
    { wch: 9 },  // VL
    { wch: 9 },  // SL
    { wch: 11 }, // Unpaid
    { wch: 14 }, // Regular
    { wch: 14 }, // Late
    { wch: 14 }, // UT
    { wch: 18 }, // Approved/Adjust OT
    { wch: 15 }, // NDF
    { wch: 22 }, // TOTAL HOURS TO BE PAID
    { wch: 22 }, // Total Paid Decimal
    { wch: 18 }, // Legal Hol Worked
    { wch: 16 }, // Legal Hol Unworked
    { wch: 18 }, // Special Hol Worked
    { wch: 16 }, // Special Hol Unworked
    { wch: 18 }, // Cancelled Off Reg
    { wch: 18 }, // Cancelled Off Hol
    { wch: 14 }, // Adj OT
    { wch: 14 }, // Adj Late
    { wch: 14 }, // Adj UT
    { wch: 14 }, // Adj NDF
    { wch: 12 }, // Days Adj
  ];
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Consolidated Payroll');

  // Trigger download
  const cleanPeriod = periodLabel.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${companyName}_Payroll_Summary_${cleanPeriod}.xlsx`;
  XLSX.writeFile(workbook, filename);
}
