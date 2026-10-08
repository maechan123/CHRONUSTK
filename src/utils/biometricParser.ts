import {
  Employee,
  BiometricLogEntry,
  BiometricImportResult,
  TimekeepingDayRecord,
  TimekeepingSettings,
} from '../types/timekeeping';
import { recalculateDayRecord, getDayOfWeek } from './timeCalculations';

/**
 * Parses raw biometric .dat or .txt content
 */
export function parseBiometricText(
  rawText: string,
  employees: Employee[],
  settings: TimekeepingSettings,
  existingRecordsMap: Map<string, TimekeepingDayRecord> = new Map(),
  syncWithEmployeeProfile = true
): BiometricImportResult {
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  const totalLines = lines.length;

  const validEntries: BiometricLogEntry[] = [];
  const unmatchedNumbersSet = new Set<string>();

  // Map employee lookup by both clean number, uppercase, trimmed, and prefixed
  const employeeMap = new Map<string, Employee>();
  for (const emp of employees) {
    const rawNum = emp.employeeNumber.trim();
    employeeMap.set(rawNum, emp);
    employeeMap.set(rawNum.toLowerCase(), emp);
    // Also without letters if numeric (e.g., EMP-1001 -> 1001)
    const numericPart = rawNum.replace(/\D/g, '');
    if (numericPart) {
      employeeMap.set(numericPart, emp);
    }
  }

  // Regex patterns for various biometric devices (ZKSoftware, Anviz, Granding, Suprema, Realand, etc.)
  // Format 1: 1001\t2026-10-01 07:58:12\t1\t0...
  // Format 2: 1001 2026-10-01 07:58:12 ...
  // Format 3: 1001,2026-10-01 07:58:12,...
  // Format 4: 1001,2026/10/01,07:58:12
  const dateRegex = /\b(\d{4}[-/]\d{1,2}[-/]\d{1,2})\b/;
  const timeRegex = /\b(\d{1,2}:\d{2}(?::\d{2})?)\b/;

  for (const line of lines) {
    // Ignore header lines if present
    if (
      line.toLowerCase().includes('user') ||
      line.toLowerCase().includes('timestamp') ||
      line.toLowerCase().includes('badgenumber') ||
      line.toLowerCase().includes('employee')
    ) {
      continue;
    }

    // Try splitting by tab, comma, or spaces
    let tokens = line.split(/[\t,]+/);
    if (tokens.length <= 1) {
      // Split by whitespace
      tokens = line.split(/\s+/);
    }

    if (tokens.length < 2) continue;

    // First token is usually employee number or badge ID
    let rawEmpNo = tokens[0].trim();
    if (!rawEmpNo) continue;

    // Find date and time in the line
    const dateMatch = line.match(dateRegex);
    const timeMatch = line.match(timeRegex);

    if (!dateMatch || !timeMatch) continue;

    // Standardize date to YYYY-MM-DD
    const dateRaw = dateMatch[1].replace(/\//g, '-');
    const dateParts = dateRaw.split('-');
    const formattedDate = `${dateParts[0]}-${dateParts[1].padStart(2, '0')}-${dateParts[2].padStart(2, '0')}`;

    // Standardize time to HH:mm:ss
    let timeRaw = timeMatch[1];
    if (timeRaw.split(':').length === 2) {
      timeRaw += ':00';
    }
    const [h, m, s] = timeRaw.split(':');
    const formattedTime = `${h.padStart(2, '0')}:${m.padStart(2, '0')}:${s.padStart(2, '0')}`;

    validEntries.push({
      employeeNumber: rawEmpNo,
      timestamp: `${formattedDate} ${formattedTime}`,
      date: formattedDate,
      time: formattedTime,
      rawLine: line,
    });
  }

  // Filter entries to only roster-matched employees
  let matchedPunches = 0;
  let unmatchedPunches = 0;
  const matchedEntriesByEmpAndDate = new Map<string, BiometricLogEntry[]>();

  for (const entry of validEntries) {
    const rawNo = entry.employeeNumber;
    const numericPart = rawNo.replace(/\D/g, '');
    const emp = employeeMap.get(rawNo) || employeeMap.get(rawNo.toLowerCase()) || (numericPart ? employeeMap.get(numericPart) : undefined);

    if (!emp) {
      unmatchedPunches++;
      unmatchedNumbersSet.add(rawNo);
      continue;
    }

    matchedPunches++;
    // Group key: employeeId:YYYY-MM-DD
    const key = `${emp.id}:${entry.date}`;
    const group = matchedEntriesByEmpAndDate.get(key) || [];
    group.push(entry);
    matchedEntriesByEmpAndDate.set(key, group);
  }

  // Construct day records using first-in / last-out
  const affectedEmployeesSet = new Set<string>();
  const affectedDatesSet = new Set<string>();
  const previewRecords: TimekeepingDayRecord[] = [];
  let problemDaysCount = 0;

  matchedEntriesByEmpAndDate.forEach((entries, key) => {
    const [employeeId, dateStr] = key.split(':');
    const emp = employees.find((e) => e.id === employeeId);
    if (!emp) return;

    affectedEmployeesSet.add(emp.name);
    affectedDatesSet.add(dateStr);

    // Sort chronologically
    entries.sort((a, b) => a.time.localeCompare(b.time));

    // Deduplicate punches within 60 seconds (accidental double tap)
    const filteredPunches: string[] = [];
    for (const item of entries) {
      if (filteredPunches.length === 0) {
        filteredPunches.push(item.time);
      } else {
        const lastPunch = filteredPunches[filteredPunches.length - 1];
        if (getPunchDifferenceInSeconds(lastPunch, item.time) > 60) {
          filteredPunches.push(item.time);
        }
      }
    }

    let t1In = '';
    let t1Out = '';
    let t2In = '';
    let t2Out = '';
    let otIn = '';
    let otOut = '';

    if (filteredPunches.length === 1) {
      const punch = filteredPunches[0];
      const punchHour = parseInt(punch.split(':')[0], 10);
      // First-in / last-out inference for single punch
      if (punchHour < 13) {
        t1In = punch;
      } else {
        t2Out = punch;
      }
    } else if (filteredPunches.length === 2) {
      // First-in, last-out
      t1In = filteredPunches[0];
      t2Out = filteredPunches[1];
    } else if (filteredPunches.length === 3) {
      t1In = filteredPunches[0];
      t1Out = filteredPunches[1];
      t2Out = filteredPunches[2];
    } else if (filteredPunches.length === 4) {
      t1In = filteredPunches[0];
      t1Out = filteredPunches[1];
      t2In = filteredPunches[2];
      t2Out = filteredPunches[3];
    } else {
      // 5 or more punches
      t1In = filteredPunches[0];
      t1Out = filteredPunches[1];
      t2In = filteredPunches[2];
      t2Out = filteredPunches[3];
      // Remaining punches are treated as OT In/Out
      otIn = filteredPunches[4];
      otOut = filteredPunches[filteredPunches.length - 1];
    }

    // Check if existing record had custom adjustments, dayType or remarks
    const recordKey = `day-${emp.id}-${dateStr}`;
    const existing = existingRecordsMap.get(recordKey);

    // Is it a rest day for this employee?
    const dateObj = new Date(dateStr + 'T00:00:00');
    const dayOfWeekIndex = dateObj.getDay();
    const isRestDay = emp.restDays ? emp.restDays.includes(dayOfWeekIndex) : dayOfWeekIndex === 0;

    let schedIn = isRestDay ? '' : emp.defaultShiftIn;
    let schedOut = isRestDay ? '' : emp.defaultShiftOut;
    let isDayOff = isRestDay;

    // Only keep previous schedule if syncWithEmployeeProfile is false AND existing had an explicit schedule
    if (!syncWithEmployeeProfile && existing) {
      schedIn = existing.scheduleIn;
      schedOut = existing.scheduleOut;
      isDayOff = existing.isDayOff;
    }

    const baseRecord: Partial<TimekeepingDayRecord> = {
      id: recordKey,
      employeeId: emp.id,
      employeeNumber: emp.employeeNumber,
      date: dateStr,
      dayOfWeek: getDayOfWeek(dateStr),
      scheduleIn: schedIn,
      scheduleOut: schedOut,
      isDayOff: isDayOff,
      dayType: isDayOff ? 'day_off' : existing?.dayType === 'day_off' ? 'regular' : existing?.dayType || 'regular',
      leaveType: existing?.leaveType || 'none',
      time1In: t1In,
      time1Out: t1Out,
      time2In: t2In,
      time2Out: t2Out,
      otIn: otIn,
      otOut: otOut,
      adjustments: existing?.adjustments || [],
      remarks: existing?.remarks || 'Biometric import',
      isFullDayCredit: existing?.isFullDayCredit,
      fullDayCreditHours: existing?.fullDayCreditHours,
      fullDayCreditReason: existing?.fullDayCreditReason,
    };

    const recalculated = recalculateDayRecord(baseRecord, settings, emp.dutyHours);
    if (recalculated.isAbsent || recalculated.isLate || recalculated.isUndertime || recalculated.isNoIn || recalculated.isNoOut) {
      problemDaysCount++;
    }
    previewRecords.push(recalculated);
  });

  return {
    totalLines,
    validPunches: validEntries.length,
    matchedPunches,
    unmatchedPunches,
    unmatchedEmployeeNumbers: Array.from(unmatchedNumbersSet),
    affectedEmployees: Array.from(affectedEmployeesSet),
    affectedDates: Array.from(affectedDatesSet).sort(),
    previewRecords,
    problemDaysCount,
  };
}

function getPunchDifferenceInSeconds(timeA: string, timeB: string): number {
  const partsA = timeA.split(':').map((p) => parseInt(p, 10));
  const partsB = timeB.split(':').map((p) => parseInt(p, 10));
  const secA = partsA[0] * 3600 + partsA[1] * 60 + (partsA[2] || 0);
  const secB = partsB[0] * 3600 + partsB[1] * 60 + (partsB[2] || 0);
  return Math.abs(secB - secA);
}
