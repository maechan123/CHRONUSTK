import {
  DayType,
  LeaveType,
  Adjustment,
  TimekeepingDayRecord,
  TimekeepingSettings,
} from '../types/timekeeping';

/**
 * Format total seconds to H:MM:SS
 * e.g., 28800 -> "8:00:00", 930 -> "0:15:30", 0 -> "0:00:00"
 */
export function formatDurationHms(totalSeconds: number): string {
  if (isNaN(totalSeconds) || totalSeconds <= 0) {
    return '0:00:00';
  }
  const isNegative = totalSeconds < 0;
  const absSeconds = Math.round(Math.abs(totalSeconds));

  const hours = Math.floor(absSeconds / 3600);
  const minutes = Math.floor((absSeconds % 3600) / 60);
  const seconds = absSeconds % 60;

  const mm = minutes.toString().padStart(2, '0');
  const ss = seconds.toString().padStart(2, '0');

  return `${isNegative ? '-' : ''}${hours}:${mm}:${ss}`;
}

/**
 * Format total seconds to decimal hours rounded to 2 decimals
 */
export function secondsToDecimalHours(seconds: number): number {
  if (!seconds || seconds <= 0) return 0;
  return Math.round((seconds / 3600) * 100) / 100;
}

/**
 * Parse time string "HH:mm" or "HH:mm:ss" to seconds from midnight
 * Returns null if invalid or empty
 */
export function parseTimeToSeconds(timeStr?: string): number | null {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const trimmed = timeStr.trim();
  if (!trimmed) return null;

  const parts = trimmed.split(':');
  if (parts.length < 2) return null;

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const seconds = parts.length > 2 ? parseInt(parts[2], 10) : 0;

  if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) return null;
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Calculate the overlap in seconds between a worked interval [workStart, workEnd]
 * and the Night Differential window (22:00 to 06:00).
 * Handles shifts crossing midnight cleanly.
 */
export function calculateNdfSeconds(
  startSec: number,
  endSec: number,
  ndfStartHour = 22,
  ndfEndHour = 6
): number {
  if (endSec <= startSec) {
    // If endSec is less than startSec, assume overnight shift (+ 24 hours)
    endSec += 86400;
  }

  const ndfStart1 = ndfStartHour * 3600; // 22:00 on day 1 (79200)
  const ndfEnd1 = 86400 + ndfEndHour * 3600; // 06:00 on day 2 (86400 + 21600 = 108000)

  // Also check morning 00:00 to 06:00 on day 1 if shift started before 06:00
  let ndfTotal = 0;

  // Window 1: Day 1 early morning [0, ndfEndHour * 3600]
  const earlyMorningEnd = ndfEndHour * 3600;
  const earlyOverlapStart = Math.max(startSec, 0);
  const earlyOverlapEnd = Math.min(endSec, earlyMorningEnd);
  if (earlyOverlapEnd > earlyOverlapStart) {
    ndfTotal += earlyOverlapEnd - earlyOverlapStart;
  }

  // Window 2: Day 1 night to Day 2 morning [ndfStart1, ndfEnd1]
  const nightOverlapStart = Math.max(startSec, ndfStart1);
  const nightOverlapEnd = Math.min(endSec, ndfEnd1);
  if (nightOverlapEnd > nightOverlapStart) {
    ndfTotal += nightOverlapEnd - nightOverlapStart;
  }

  // Window 3: If shift extends even further past 24h into Day 2 night (rare, but mathematically sound)
  const day2NightStart = 86400 + ndfStartHour * 3600;
  const day2NightEnd = 86400 * 2 + ndfEndHour * 3600;
  const day2OverlapStart = Math.max(startSec, day2NightStart);
  const day2OverlapEnd = Math.min(endSec, day2NightEnd);
  if (day2OverlapEnd > day2OverlapStart) {
    ndfTotal += day2OverlapEnd - day2OverlapStart;
  }

  return Math.max(0, ndfTotal);
}

/**
 * Recompute all durations, flags, and adjustments for a day record
 */
export function recalculateDayRecord(
  record: Partial<TimekeepingDayRecord>,
  settings: TimekeepingSettings,
  dutyHours = 8
): TimekeepingDayRecord {
  const isDayOff = record.isDayOff || record.dayType === 'day_off';
  const leaveType = record.leaveType || 'none';
  const dayType = record.dayType || (isDayOff ? 'day_off' : 'regular');

  const schedInSec = parseTimeToSeconds(record.scheduleIn);
  const schedOutSec = parseTimeToSeconds(record.scheduleOut);

  // Time punches
  // We allow either Time 1 (In/Out) + Time 2 (In/Out) or simple Time 1 In and Time 2 Out
  const t1InSec = parseTimeToSeconds(record.time1In);
  const t1OutSec = parseTimeToSeconds(record.time1Out);
  const t2InSec = parseTimeToSeconds(record.time2In);
  const t2OutSec = parseTimeToSeconds(record.time2Out);

  const otInSec = parseTimeToSeconds(record.otIn);
  const otOutSec = parseTimeToSeconds(record.otOut);

  // Determine effective first punch in and last punch out
  let effectiveFirstInSec: number | null = null;
  let effectiveLastOutSec: number | null = null;

  // Normal pairing: Time 1 In is start. If Time 2 Out is present, that's final out;
  // else if Time 1 Out is present, that's final out; else if Time 2 In is present (e.g. shift out mistakenly logged in time 2)
  if (t1InSec !== null) effectiveFirstInSec = t1InSec;
  else if (t2InSec !== null) effectiveFirstInSec = t2InSec;

  if (t2OutSec !== null) effectiveLastOutSec = t2OutSec;
  else if (t1OutSec !== null) effectiveLastOutSec = t1OutSec;
  else if (t2InSec !== null && t1InSec !== null && t2InSec > t1InSec) {
    effectiveLastOutSec = t2InSec;
  }

  // Attendance detection
  const hasPunches =
    t1InSec !== null || t1OutSec !== null || t2InSec !== null || t2OutSec !== null;
  const isPresent = hasPunches && leaveType === 'none';
  const isAbsent = !isDayOff && !hasPunches && leaveType === 'none';

  let lateSeconds = 0;
  let utSeconds = 0;
  let regularSeconds = 0;
  let otSeconds = 0;
  let ndfSeconds = 0;

  let isLate = false;
  let isUndertime = false;
  let isNoIn = false;
  let isNoOut = false;

  // Late calculation
  const gracePeriodSec = settings.lateGracePeriodMinutes * 60;
  if (!isDayOff && schedInSec !== null && isPresent) {
    if (effectiveFirstInSec === null) {
      isNoIn = true;
    } else {
      const diffIn = effectiveFirstInSec - schedInSec;
      if (diffIn > gracePeriodSec) {
        // Punched in after grace period
        // Standard rule: full lateness from schedule
        lateSeconds = diffIn;
        isLate = true;
      }
    }
  }

  // Undertime calculation (waived if Management Full Day Credit is announced)
  if (!isDayOff && schedOutSec !== null && isPresent && !record.isFullDayCredit) {
    if (effectiveLastOutSec === null) {
      isNoOut = true;
    } else {
      let effectiveSchedOut = schedOutSec;
      if (schedInSec !== null && schedOutSec < schedInSec) {
        // Overnight schedule
        effectiveSchedOut += 86400;
      }

      let actualOut = effectiveLastOutSec;
      if (effectiveFirstInSec !== null && actualOut < effectiveFirstInSec) {
        // Overnight punch
        actualOut += 86400;
      }

      const diffOut = effectiveSchedOut - actualOut;
      if (diffOut > 60) {
        // Left more than 1 minute early
        utSeconds = diffOut;
        isUndertime = true;
      }
    }
  }

  // Check missing punches when one exists
  if (isPresent) {
    if (effectiveFirstInSec !== null && effectiveLastOutSec === null) {
      isNoOut = true;
    } else if (effectiveFirstInSec === null && effectiveLastOutSec !== null) {
      isNoIn = true;
    }
  }

  // Regular hours & NDF calculation
  if (isPresent && effectiveFirstInSec !== null && effectiveLastOutSec !== null) {
    let rawWorkedSec = 0;

    // If 4 punches exist: (t1Out - t1In) + (t2Out - t2In)
    if (t1InSec !== null && t1OutSec !== null && t2InSec !== null && t2OutSec !== null) {
      const seg1 = Math.max(0, (t1OutSec < t1InSec ? t1OutSec + 86400 : t1OutSec) - t1InSec);
      const seg2 = Math.max(0, (t2OutSec < t2InSec ? t2OutSec + 86400 : t2OutSec) - t2InSec);
      rawWorkedSec = seg1 + seg2;

      // NDF for both segments
      ndfSeconds += calculateNdfSeconds(
        t1InSec,
        t1OutSec < t1InSec ? t1OutSec + 86400 : t1OutSec,
        settings.ndfStartHour,
        settings.ndfEndHour
      );
      ndfSeconds += calculateNdfSeconds(
        t2InSec,
        t2OutSec < t2InSec ? t2OutSec + 86400 : t2OutSec,
        settings.ndfStartHour,
        settings.ndfEndHour
      );
    } else {
      // 2 punches (Time In, Time Out)
      let end = effectiveLastOutSec;
      if (end < effectiveFirstInSec) {
        end += 86400; // overnight
      }
      const totalSpan = end - effectiveFirstInSec;
      // Subtract standard 1-hour lunch break if total span >= 5 hours
      if (totalSpan >= 5 * 3600) {
        rawWorkedSec = Math.max(0, totalSpan - 3600);
      } else {
        rawWorkedSec = totalSpan;
      }

      ndfSeconds += calculateNdfSeconds(
        effectiveFirstInSec,
        end,
        settings.ndfStartHour,
        settings.ndfEndHour
      );
    }

    const creditDutyHours = record.fullDayCreditHours || dutyHours || 8;
    const creditDutySec = creditDutyHours * 3600;
    const dutyHoursSec = dutyHours * 3600;

    if (record.isFullDayCredit) {
      // Management announcement (e.g. Saturday 5-6 hours paid as whole 8 hours / full day duty)
      // Boost regular hours to full credit duty (e.g. 8h) and waive undertime
      if (rawWorkedSec >= creditDutySec) {
        regularSeconds = creditDutySec;
        otSeconds += rawWorkedSec - creditDutySec;
      } else {
        regularSeconds = creditDutySec; // Credited full 8 hours
      }
      utSeconds = 0;
      isUndertime = false;
    } else if (rawWorkedSec > dutyHoursSec) {
      regularSeconds = dutyHoursSec;
      // Auto OT for hours worked beyond duty if not on day off
      otSeconds += rawWorkedSec - dutyHoursSec;
    } else {
      regularSeconds = rawWorkedSec;
    }
  }

  // Explicit OT punches calculation
  if (otInSec !== null && otOutSec !== null) {
    let otEnd = otOutSec;
    if (otEnd < otInSec) {
      otEnd += 86400;
    }
    const explicitOtSpan = Math.max(0, otEnd - otInSec);
    otSeconds += explicitOtSpan;

    // NDF during explicit OT stretch
    ndfSeconds += calculateNdfSeconds(
      otInSec,
      otEnd,
      settings.ndfStartHour,
      settings.ndfEndHour
    );
  }

  // Incorporate adjustments (Payment increases, Deduct decreases)
  const adjustments = record.adjustments || [];
  let adjustedOtNet = 0;
  for (const adj of adjustments) {
    const mult = adj.action === 'payment' ? 1 : -1;
    if (adj.type === 'OT') {
      otSeconds = Math.max(0, otSeconds + mult * adj.durationSeconds);
      adjustedOtNet += mult * adj.durationSeconds;
    } else if (adj.type === 'Late') {
      lateSeconds = Math.max(0, lateSeconds + mult * adj.durationSeconds);
    } else if (adj.type === 'UT') {
      utSeconds = Math.max(0, utSeconds + mult * adj.durationSeconds);
    } else if (adj.type === 'NDF') {
      ndfSeconds = Math.max(0, ndfSeconds + mult * adj.durationSeconds);
    }
  }

  // Determine approved OT: only approved or adjusted OT applies to payable totals
  const punchOtSpan = Math.max(0, otSeconds - Math.max(0, adjustedOtNet));
  const isOtApproved =
    record.isOtApproved ??
    (adjustedOtNet > 0 || (record.remarks && /approved|memo|authorized|covered|closing|teardown/i.test(record.remarks)));
  const approvedOtSeconds = Math.max(0, (isOtApproved ? punchOtSpan : 0) + adjustedOtNet);

  return {
    id: record.id || `day-${record.employeeId}-${record.date}`,
    employeeId: record.employeeId || '',
    employeeNumber: record.employeeNumber || '',
    date: record.date || '',
    dayOfWeek: record.dayOfWeek || getDayOfWeek(record.date || ''),
    scheduleIn: isDayOff ? '' : (record.scheduleIn ?? ''),
    scheduleOut: isDayOff ? '' : (record.scheduleOut ?? ''),
    isDayOff: !!isDayOff,
    dayType: dayType,
    leaveType: leaveType,
    time1In: record.time1In || '',
    time1Out: record.time1Out || '',
    time2In: record.time2In || '',
    time2Out: record.time2Out || '',
    otIn: record.otIn || '',
    otOut: record.otOut || '',
    adjustments: adjustments,
    remarks: record.remarks || '',
    regularSeconds: Math.round(regularSeconds),
    lateSeconds: Math.round(lateSeconds),
    utSeconds: Math.round(utSeconds),
    otSeconds: Math.round(otSeconds),
    approvedOtSeconds: Math.round(approvedOtSeconds),
    isOtApproved: !!isOtApproved,
    ndfSeconds: Math.round(ndfSeconds),
    isPresent: isPresent,
    isAbsent: isAbsent,
    isLate: isLate,
    isUndertime: isUndertime,
    isNoIn: isNoIn,
    isNoOut: isNoOut,
    isFullDayCredit: !!record.isFullDayCredit,
    fullDayCreditHours: record.fullDayCreditHours ?? 8,
    fullDayCreditReason: record.fullDayCreditReason || '',
  };
}

export function getDayOfWeek(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[d.getDay()] || '';
}

/**
 * Generate all dates in a fortnight or arbitrary date range
 */
export function generateDateRange(startDateStr: string, endDateStr: string): string[] {
  const dates: string[] = [];
  const curr = new Date(startDateStr + 'T00:00:00');
  const end = new Date(endDateStr + 'T00:00:00');

  while (curr <= end) {
    const yyyy = curr.getFullYear();
    const mm = String(curr.getMonth() + 1).padStart(2, '0');
    const dd = String(curr.getDate()).padStart(2, '0');
    dates.push(`${yyyy}-${mm}-${dd}`);
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
}

/**
 * Common fortnight preset helpers
 */
export function getFortnightPresets(): { label: string; startDate: string; endDate: string }[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed

  // Current month 1-15
  const mStr = String(month + 1).padStart(2, '0');
  const cur1to15Start = `${year}-${mStr}-01`;
  const cur1to15End = `${year}-${mStr}-15`;

  // Current month 16 to end of month
  const lastDayCurMonth = new Date(year, month + 1, 0).getDate();
  const cur16toEndStart = `${year}-${mStr}-16`;
  const cur16toEndEnd = `${year}-${mStr}-${String(lastDayCurMonth).padStart(2, '0')}`;

  // Previous month 16 to end of month
  const prevMonthDate = new Date(year, month, 0);
  const pYear = prevMonthDate.getFullYear();
  const pMonth = prevMonthDate.getMonth();
  const pmStr = String(pMonth + 1).padStart(2, '0');
  const lastDayPrevMonth = prevMonthDate.getDate();
  const prev16toEndStart = `${pYear}-${pmStr}-16`;
  const prev16toEndEnd = `${pYear}-${pmStr}-${String(lastDayPrevMonth).padStart(2, '0')}`;

  // Full current month
  const fullMonthStart = `${year}-${mStr}-01`;
  const fullMonthEnd = `${year}-${mStr}-${String(lastDayCurMonth).padStart(2, '0')}`;

  return [
    { label: `${getMonthName(month)} 1–15, ${year}`, startDate: cur1to15Start, endDate: cur1to15End },
    { label: `${getMonthName(month)} 16–${lastDayCurMonth}, ${year}`, startDate: cur16toEndStart, endDate: cur16toEndEnd },
    { label: `${getMonthName(pMonth)} 16–${lastDayPrevMonth}, ${pYear} (Previous Fortnight)`, startDate: prev16toEndStart, endDate: prev16toEndEnd },
    { label: `${getMonthName(month)} Full Month, ${year}`, startDate: fullMonthStart, endDate: fullMonthEnd },
  ];
}

function getMonthName(mIndex: number): string {
  const names = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return names[mIndex] || '';
}
