import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  AlertCircle,
  Plus,
  Clock,
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  FileEdit,
  Sliders,
  ChevronDown,
  X,
  User,
  RefreshCw,
} from 'lucide-react';
import {
  Employee,
  TimekeepingDayRecord,
  TimekeepingSettings,
  Adjustment,
} from '../../types/timekeeping';
import {
  formatDurationHms,
  getFortnightPresets,
  generateDateRange,
  getDayOfWeek,
  recalculateDayRecord,
} from '../../utils/timeCalculations';
import { DayEditModal } from './DayEditModal';
import { AdjustmentModal } from './AdjustmentModal';
import { ManagementAnnouncementModal } from './ManagementAnnouncementModal';

interface TimekeepingLedgerProps {
  employees: Employee[];
  records: TimekeepingDayRecord[];
  settings: TimekeepingSettings;
  onUpdateRecord: (record: TimekeepingDayRecord) => void;
  onBatchUpdateRecords?: (records: TimekeepingDayRecord[]) => void;
  onSyncEmployeeLedger?: (employee: Employee) => void;
}

export const TimekeepingLedger: React.FC<TimekeepingLedgerProps> = ({
  employees,
  records,
  settings,
  onUpdateRecord,
  onBatchUpdateRecords,
  onSyncEmployeeLedger,
}) => {
  // Fortnight presets
  const presets = useMemo(() => getFortnightPresets(), []);
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0);

  // Active date range
  const [startDate, setStartDate] = useState(presets[0]?.startDate || '2026-10-01');
  const [endDate, setEndDate] = useState(presets[0]?.endDate || '2026-10-15');

  // Active employee selector
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(
    employees[0]?.id || ''
  );

  // Search input state for typing employee name
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchDropdownRef = useRef<HTMLDivElement>(null);

  // Management announcement modal state
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Modal states
  const [dayToEdit, setDayToEdit] = useState<TimekeepingDayRecord | null>(null);
  const [isDayEditOpen, setIsDayEditOpen] = useState(false);

  const [dayForAdjustment, setDayForAdjustment] = useState<TimekeepingDayRecord | null>(null);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [syncToast, setSyncToast] = useState(false);

  // Currently selected employee object
  const currentEmployee = useMemo(() => {
    return employees.find((e) => e.id === selectedEmployeeId) || employees[0] || null;
  }, [employees, selectedEmployeeId]);

  // Filtered employees for typing search
  const searchedEmployees = useMemo(() => {
    if (!employeeSearch.trim()) return employees;
    const q = employeeSearch.toLowerCase().trim();
    return employees.filter(
      (emp) =>
        emp.name.toLowerCase().includes(q) ||
        emp.employeeNumber.toLowerCase().includes(q) ||
        emp.department.toLowerCase().includes(q) ||
        emp.position.toLowerCase().includes(q)
    );
  }, [employees, employeeSearch]);

  // Index for prev/next buttons
  const currentEmpIndex = useMemo(() => {
    return employees.findIndex((e) => e.id === currentEmployee?.id);
  }, [employees, currentEmployee]);

  const handlePrevEmployee = () => {
    if (currentEmpIndex > 0) {
      setSelectedEmployeeId(employees[currentEmpIndex - 1].id);
    }
  };

  const handleNextEmployee = () => {
    if (currentEmpIndex < employees.length - 1) {
      setSelectedEmployeeId(employees[currentEmpIndex + 1].id);
    }
  };

  const handleSelectPreset = (idx: number) => {
    setSelectedPresetIndex(idx);
    const p = presets[idx];
    if (p) {
      setStartDate(p.startDate);
      setEndDate(p.endDate);
    }
  };

  // Generate date list for active period
  const dateList = useMemo(() => {
    if (!startDate || !endDate || startDate > endDate) return [];
    return generateDateRange(startDate, endDate);
  }, [startDate, endDate]);

  // Build or fetch ledger rows for the active employee and date list
  const ledgerRows = useMemo(() => {
    if (!currentEmployee) return [];

    const recordMap = new Map<string, TimekeepingDayRecord>();
    for (const r of records) {
      if (r.employeeId === currentEmployee.id) {
        recordMap.set(r.date, r);
      }
    }

    return dateList.map((dateStr) => {
      const existing = recordMap.get(dateStr);
      if (existing) {
        return existing;
      }
      // If no record exists yet for this date, construct default
      const dateObj = new Date(dateStr + 'T00:00:00');
      const isRestDay = currentEmployee.restDays
        ? currentEmployee.restDays.includes(dateObj.getDay())
        : dateObj.getDay() === 0;

      const base: Partial<TimekeepingDayRecord> = {
        id: `day-${currentEmployee.id}-${dateStr}`,
        employeeId: currentEmployee.id,
        employeeNumber: currentEmployee.employeeNumber,
        date: dateStr,
        dayOfWeek: getDayOfWeek(dateStr),
        scheduleIn: isRestDay ? '' : currentEmployee.defaultShiftIn,
        scheduleOut: isRestDay ? '' : currentEmployee.defaultShiftOut,
        isDayOff: isRestDay,
        dayType: isRestDay ? 'day_off' : 'regular',
        leaveType: 'none',
        time1In: '',
        time1Out: '',
        time2In: '',
        time2Out: '',
        otIn: '',
        otOut: '',
        adjustments: [],
        remarks: '',
      };
      return recalculateDayRecord(base, settings, currentEmployee.dutyHours);
    });
  }, [currentEmployee, records, dateList, settings]);

  // Period Summary metrics calculation
  const periodSummary = useMemo(() => {
    let regularSeconds = 0;
    let lateSeconds = 0;
    let utSeconds = 0;
    let otSeconds = 0;
    let approvedOtSeconds = 0;
    let ndfSeconds = 0;
    let presentDays = 0;
    let absentDays = 0;
    let restDays = 0;
    let leaveDays = 0;

    let totalAdjustmentAdditionsSec = 0;
    let totalAdjustmentDeductionsSec = 0;
    let totalAdjustmentDays = 0;

    for (const row of ledgerRows) {
      if (row.isPresent) presentDays++;
      else if (row.isAbsent) absentDays++;

      if (row.isDayOff || row.dayType === 'day_off') restDays++;
      if (row.leaveType !== 'none') leaveDays++;

      regularSeconds += row.regularSeconds || 0;
      lateSeconds += row.lateSeconds || 0;
      utSeconds += row.utSeconds || 0;
      otSeconds += row.otSeconds || 0;
      approvedOtSeconds += row.approvedOtSeconds !== undefined ? row.approvedOtSeconds : (row.isOtApproved ? row.otSeconds : 0);
      ndfSeconds += row.ndfSeconds || 0;

      for (const adj of row.adjustments || []) {
        if (adj.type === 'Day') {
          totalAdjustmentDays += (adj.action === 'payment' ? 1 : -1) * (adj.daysValue || 1);
        } else {
          if (adj.action === 'payment') {
            totalAdjustmentAdditionsSec += adj.durationSeconds;
          } else {
            totalAdjustmentDeductionsSec += adj.durationSeconds;
          }
        }
      }
    }

    const totalPaidSeconds = Math.max(0, regularSeconds + approvedOtSeconds - lateSeconds);

    return {
      regularSeconds,
      lateSeconds,
      utSeconds,
      otSeconds,
      approvedOtSeconds,
      ndfSeconds,
      totalPaidSeconds,
      presentDays,
      absentDays,
      restDays,
      leaveDays,
      totalAdjustmentAdditionsSec,
      totalAdjustmentDeductionsSec,
      totalAdjustmentDays,
    };
  }, [ledgerRows]);

  const handleToggleApproveOt = (row: TimekeepingDayRecord) => {
    if (!currentEmployee) return;
    const updated = recalculateDayRecord(
      { ...row, isOtApproved: !row.isOtApproved },
      settings,
      currentEmployee.dutyHours
    );
    onUpdateRecord(updated);
  };

  // Toggle management full day credit (e.g. Saturday 5-6 hours credited as 8 hours full duty)
  const handleToggleFullDayCredit = (row: TimekeepingDayRecord) => {
    if (!currentEmployee) return;
    const nextState = !row.isFullDayCredit;
    const defaultReason =
      row.dayOfWeek === 'Sat'
        ? 'Saturday Management Memo: Paid as Whole 8 Hours Duty'
        : 'Management Announcement: Paid as Full Day Duty';
    const updated = recalculateDayRecord(
      {
        ...row,
        isFullDayCredit: nextState,
        fullDayCreditHours: nextState ? (row.fullDayCreditHours || currentEmployee.dutyHours || 8) : undefined,
        fullDayCreditReason: nextState ? (row.fullDayCreditReason || defaultReason) : '',
        remarks: nextState
          ? row.remarks
            ? `${row.remarks} | ${defaultReason}`
            : defaultReason
          : row.remarks.replace(/\|?\s*(Management Announcement:|Saturday Management Memo:)[^|]*/gi, '').trim(),
      },
      settings,
      currentEmployee.dutyHours
    );
    onUpdateRecord(updated);
  };

  // Apply batch announcement records from modal
  const handleBatchAnnouncementApplied = (updatedRecords: TimekeepingDayRecord[]) => {
    if (onBatchUpdateRecords) {
      onBatchUpdateRecords(updatedRecords);
    } else {
      for (const rec of updatedRecords) {
        onUpdateRecord(rec);
      }
    }
  };

  const handleOpenDayEdit = (row: TimekeepingDayRecord) => {
    setDayToEdit(row);
    setIsDayEditOpen(true);
  };

  const handleOpenAdjustment = (row: TimekeepingDayRecord) => {
    setDayForAdjustment(row);
    setIsAdjustmentModalOpen(true);
  };

  const handleSaveAdjustments = (dayRecordId: string, adjustments: Adjustment[]) => {
    const targetRow = ledgerRows.find((r) => r.id === dayRecordId);
    if (!targetRow || !currentEmployee) return;

    const updated = recalculateDayRecord(
      { ...targetRow, adjustments },
      settings,
      currentEmployee.dutyHours
    );
    onUpdateRecord(updated);
  };

  // Helper badge for day type
  const renderDayTypeBadge = (row: TimekeepingDayRecord) => {
    if (row.dayType === 'legal_holiday') {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
          Legal Hol
        </span>
      );
    }
    if (row.dayType === 'special_holiday') {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300">
          Special Hol
        </span>
      );
    }
    if (row.dayType === 'cancelled_off_regular') {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
          Cancel-Off Reg
        </span>
      );
    }
    if (row.dayType === 'cancelled_off_holiday') {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">
          Cancel-Off Hol
        </span>
      );
    }
    if (row.dayType === 'day_off' || row.isDayOff) {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
          Rest Day
        </span>
      );
    }
    return (
      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700">
        Regular
      </span>
    );
  };

  // Helper badge for leave type
  const renderLeaveTypeBadge = (leave: string) => {
    if (leave === 'vl') {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-300">
          VL
        </span>
      );
    }
    if (leave === 'sl') {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-300">
          SL
        </span>
      );
    }
    if (leave === 'unpaid') {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
          Unpaid
        </span>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Controls Header: Employee selection & Fortnight Period */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
        {/* Top: Employee Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              <button
                onClick={handlePrevEmployee}
                disabled={currentEmpIndex <= 0}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                title="Previous Employee"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextEmployee}
                disabled={currentEmpIndex >= employees.length - 1}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                title="Next Employee"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Type-to-Search Employee Combobox */}
            <div className="relative" ref={searchDropdownRef}>
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Type name, emp # or dept..."
                  value={
                    isSearchOpen
                      ? employeeSearch
                      : currentEmployee
                      ? `#${currentEmployee.employeeNumber} - ${currentEmployee.name}`
                      : ''
                  }
                  onFocus={() => {
                    setIsSearchOpen(true);
                    setEmployeeSearch('');
                  }}
                  onChange={(e) => {
                    setEmployeeSearch(e.target.value);
                    setIsSearchOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchedEmployees.length > 0) {
                      setSelectedEmployeeId(searchedEmployees[0].id);
                      setIsSearchOpen(false);
                      setEmployeeSearch('');
                    } else if (e.key === 'Escape') {
                      setIsSearchOpen(false);
                    }
                  }}
                  className="w-72 sm:w-80 pl-9 pr-8 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-hidden transition shadow-xs cursor-pointer"
                />
                {isSearchOpen && employeeSearch && (
                  <button
                    type="button"
                    onClick={() => setEmployeeSearch('')}
                    className="absolute right-7 text-slate-400 hover:text-slate-600 p-0.5"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(!isSearchOpen)}
                  className="absolute right-2 text-slate-400 hover:text-slate-600 p-1"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>

              {/* Search Dropdown Results */}
              {isSearchOpen && (
                <div className="absolute left-0 mt-1.5 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 max-h-72 overflow-y-auto divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
                  <div className="p-2.5 bg-slate-50 text-[11px] font-semibold text-slate-500 flex justify-between items-center">
                    <span>Search Results ({searchedEmployees.length})</span>
                    <span className="text-[10px] text-slate-400">Click to load record</span>
                  </div>
                  {searchedEmployees.map((emp) => {
                    const isSelected = emp.id === currentEmployee?.id;
                    return (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => {
                          setSelectedEmployeeId(emp.id);
                          setIsSearchOpen(false);
                          setEmployeeSearch('');
                        }}
                        className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between transition ${
                          isSelected ? 'bg-blue-50/80' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                              isSelected
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {emp.name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center space-x-1.5">
                              <span className="font-semibold text-xs text-slate-900">
                                {emp.name}
                              </span>
                              <span className="font-mono text-[11px] font-bold text-blue-600">
                                #{emp.employeeNumber}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {emp.department} • {emp.position}
                            </div>
                          </div>
                        </div>
                        {isSelected && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                            Selected
                          </span>
                        )}
                      </button>
                    );
                  })}
                  {searchedEmployees.length === 0 && (
                    <div className="p-4 text-center text-xs text-slate-400">
                      No employees found matching "{employeeSearch}"
                    </div>
                  )}
                </div>
              )}
            </div>

            {currentEmployee && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span
                  className={`px-2 py-0.5 rounded-lg font-bold flex items-center gap-1 ${
                    currentEmployee.scheduleType === 'Compressed'
                      ? 'bg-purple-100 text-purple-900 border border-purple-200'
                      : currentEmployee.scheduleType === 'Shifting'
                      ? 'bg-amber-100 text-amber-900 border border-amber-200'
                      : 'bg-blue-50 text-blue-800 border border-blue-200'
                  }`}
                  title={`Active Schedule: ${currentEmployee.scheduleType} with ${currentEmployee.dutyHours}h duty per day`}
                >
                  <Clock className="w-3 h-3" />
                  {currentEmployee.scheduleType}: {currentEmployee.defaultShiftIn}–{currentEmployee.defaultShiftOut} ({currentEmployee.dutyHours}h/day)
                </span>

                <span className="text-slate-400 hidden md:inline">•</span>

                <span className="hidden md:inline text-slate-600 font-medium">
                  {currentEmployee.position} • {currentEmployee.deployment}
                </span>

                {onSyncEmployeeLedger && (
                  <button
                    type="button"
                    onClick={() => {
                      onSyncEmployeeLedger(currentEmployee);
                      setSyncToast(true);
                      setTimeout(() => setSyncToast(false), 2500);
                    }}
                    className="flex items-center space-x-1 px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 hover:text-blue-700 rounded-lg border border-slate-300 shadow-2xs font-semibold text-[11px] transition cursor-pointer"
                    title="Synchronize all days in this ledger to match employee profile shift hours and rest days"
                  >
                    <RefreshCw className="w-3 h-3 text-blue-600" />
                    <span>Sync Ledger to Shift</span>
                  </button>
                )}

                {syncToast && (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 animate-in fade-in">
                    ✓ Shift & Duty Hours Synced!
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Fortnight preset pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {presets.map((preset, idx) => (
              <button
                key={preset.label}
                onClick={() => handleSelectPreset(idx)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  selectedPresetIndex === idx
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date Range Sub-Bar */}
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 pt-3 border-t border-slate-100 gap-3">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-slate-700">Fortnight Cutoff:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setSelectedPresetIndex(-1);
              }}
              className="px-2 py-1 border border-slate-200 rounded text-xs bg-slate-50"
            />
            <span>to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setSelectedPresetIndex(-1);
              }}
              className="px-2 py-1 border border-slate-200 rounded text-xs bg-slate-50"
            />
            <span className="text-slate-400 font-mono">({dateList.length} days)</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setIsAnnouncementModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 transition shadow-xs cursor-pointer"
              title="Announce Saturday or short-day paid as whole 8h duty across dates or employees"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Mgmt Saturday / Full Day Credit (Paid 8h)</span>
            </button>

            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
              <span className="text-slate-600">Red Alert: Late / UT / No-In / No-Out</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block"></span>
              <span className="text-slate-600">NDF: 10PM–6AM Night Diff</span>
            </span>
          </div>
        </div>
      </div>

      {/* Fortnight Ledger Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            {/* Table Header */}
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold tracking-wider">
              <tr>
                <th className="px-3 py-3 text-left">Date / Day</th>
                <th className="px-3 py-3 text-left">Day Type</th>
                <th className="px-3 py-3 text-left">Schedule</th>
                <th className="px-3 py-3 text-center">Time 1 (In / Out)</th>
                <th className="px-3 py-3 text-center">Time 2 (In / Out)</th>
                <th className="px-3 py-3 text-center">OT Punches</th>
                <th className="px-3 py-3 text-right">Regular Hrs</th>
                <th className="px-3 py-3 text-right">Late</th>
                <th className="px-3 py-3 text-right">UT</th>
                <th className="px-3 py-3 text-right">OT</th>
                <th className="px-3 py-3 text-right">NDF</th>
                <th className="px-3 py-3 text-left">Adjustments / Remarks</th>
                <th className="px-2 py-3 text-center">Actions</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100 bg-white">
              {ledgerRows.map((row) => {
                const hasIssues =
                  row.isAbsent || row.isLate || row.isUndertime || row.isNoIn || row.isNoOut;

                // Tint row if problem day or rest day
                const rowBg = hasIssues
                  ? 'bg-rose-50/80 border-l-4 border-l-rose-500 shadow-xs'
                  : row.isDayOff || row.dayType === 'day_off'
                  ? 'bg-slate-50/50'
                  : 'hover:bg-slate-50/70';

                return (
                  <tr key={row.date} className={`${rowBg} transition-colors`}>
                    {/* Date / Day */}
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <div className="font-mono font-bold text-slate-800">{row.date}</div>
                      <div className="text-[11px] text-slate-500 font-sans">{row.dayOfWeek}</div>
                    </td>

                    {/* Day Type & Leave */}
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <div className="flex flex-col gap-1 items-start">
                        {renderDayTypeBadge(row)}
                        {row.leaveType !== 'none' && renderLeaveTypeBadge(row.leaveType)}
                      </div>
                    </td>

                    {/* Schedule */}
                    <td className="px-3 py-2.5 whitespace-nowrap font-mono text-slate-700">
                      {row.isDayOff || row.dayType === 'day_off' ? (
                        <span className="text-slate-400 italic font-sans text-[11px]">
                          REST DAY
                        </span>
                      ) : (
                        <div>
                          <span>
                            {row.scheduleIn} - {row.scheduleOut}
                          </span>
                          {row.isFullDayCredit && (
                            <div className="mt-0.5">
                              <span
                                className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1 font-sans"
                                title={row.fullDayCreditReason || 'Management announcement: paid as full day duty'}
                              >
                                <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                                Mgmt Paid {row.fullDayCreditHours || 8}h
                              </span>
                            </div>
                          )}
                          {!row.isFullDayCredit && row.dayOfWeek === 'Sat' && !row.isDayOff && (
                            <div className="mt-0.5">
                              <button
                                type="button"
                                onClick={() => handleToggleFullDayCredit(row)}
                                className="text-[10px] text-emerald-700 hover:text-emerald-900 font-sans font-medium hover:underline flex items-center gap-0.5 cursor-pointer"
                                title="Click to apply Saturday Management Memo (Paid whole 8h duty without undertime)"
                              >
                                <Sparkles className="w-2.5 h-2.5 text-emerald-600" /> + Credit 8h Duty
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Time 1 */}
                    <td className="px-3 py-2.5 whitespace-nowrap text-center font-mono">
                      {row.isAbsent ? (
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-100/90 px-2 py-0.5 rounded border border-rose-300">
                          ABSENT
                        </span>
                      ) : row.time1In || row.time1Out ? (
                        <div className="text-slate-800">
                          <span
                            className={
                              row.isLate
                                ? 'text-rose-600 font-bold bg-rose-100 px-1 py-0.5 rounded'
                                : row.isNoIn
                                ? 'text-rose-700 font-bold bg-rose-100 px-1.5 py-0.5 rounded border border-rose-300'
                                : 'text-slate-800'
                            }
                          >
                            {row.time1In || (row.isNoIn ? 'NO IN' : '--:--')}
                          </span>
                          <span className="text-slate-400 mx-1">|</span>
                          <span className="text-slate-600">{row.time1Out || '--:--'}</span>
                        </div>
                      ) : row.isNoIn ? (
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded border border-rose-300">
                          NO IN
                        </span>
                      ) : (
                        <span className="text-slate-300">--</span>
                      )}
                    </td>

                    {/* Time 2 */}
                    <td className="px-3 py-2.5 whitespace-nowrap text-center font-mono">
                      {row.isAbsent ? (
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-100/90 px-2 py-0.5 rounded border border-rose-300">
                          ABSENT
                        </span>
                      ) : row.time2In || row.time2Out ? (
                        <div className="text-slate-800">
                          <span className="text-slate-600">{row.time2In || '--:--'}</span>
                          <span className="text-slate-400 mx-1">|</span>
                          <span
                            className={
                              row.isUndertime
                                ? 'text-rose-600 font-bold bg-rose-100 px-1 py-0.5 rounded'
                                : row.isNoOut
                                ? 'text-rose-700 font-bold bg-rose-100 px-1.5 py-0.5 rounded border border-rose-300'
                                : 'text-slate-800'
                            }
                          >
                            {row.time2Out || (row.isNoOut ? 'NO OUT' : '--:--')}
                          </span>
                        </div>
                      ) : row.isNoOut ? (
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded border border-rose-300">
                          NO OUT
                        </span>
                      ) : (
                        <span className="text-slate-300">--</span>
                      )}
                    </td>

                    {/* OT Punches */}
                    <td className="px-3 py-2.5 whitespace-nowrap text-center font-mono">
                      {row.otIn || row.otOut ? (
                        <div className="text-emerald-700 font-medium">
                          {row.otIn || '--'} - {row.otOut || '--'}
                        </div>
                      ) : (
                        <span className="text-slate-300">--</span>
                      )}
                    </td>

                    {/* Regular Hours (H:MM:SS) */}
                    <td className="px-3 py-2.5 whitespace-nowrap text-right font-mono font-medium text-slate-800">
                      {formatDurationHms(row.regularSeconds)}
                    </td>

                    {/* Late (H:MM:SS) - Red Alert */}
                    <td className="px-3 py-2.5 whitespace-nowrap text-right font-mono">
                      {row.lateSeconds > 0 ? (
                        <span className="inline-flex items-center font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded border border-rose-300 shadow-xs">
                          {formatDurationHms(row.lateSeconds)}
                        </span>
                      ) : (
                        <span className="text-slate-300">0:00:00</span>
                      )}
                    </td>

                    {/* UT (Undertime) (H:MM:SS) - Red Alert */}
                    <td className="px-3 py-2.5 whitespace-nowrap text-right font-mono">
                      {row.utSeconds > 0 ? (
                        <span className="inline-flex items-center font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded border border-rose-300 shadow-xs">
                          {formatDurationHms(row.utSeconds)}
                        </span>
                      ) : (
                        <span className="text-slate-300">0:00:00</span>
                      )}
                    </td>

                    {/* OT (Overtime) (H:MM:SS) */}
                    <td className="px-3 py-2.5 whitespace-nowrap text-right font-mono">
                      {row.otSeconds > 0 ? (
                        <div className="flex flex-col items-end gap-1">
                          <span
                            className={`inline-flex items-center font-semibold px-1.5 py-0.5 rounded text-[11px] ${
                              row.isOtApproved
                                ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                                : 'text-amber-700 bg-amber-50 border border-amber-200'
                            }`}
                          >
                            {formatDurationHms(row.otSeconds)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleApproveOt(row)}
                            className={`text-[9px] px-1.5 py-0.5 rounded font-sans font-semibold transition cursor-pointer ${
                              row.isOtApproved
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                : 'bg-amber-100 text-amber-900 hover:bg-emerald-600 hover:text-white'
                            }`}
                            title={
                              row.isOtApproved
                                ? 'OT is Approved and counted in Total Hours to be Paid. Click to revoke.'
                                : 'Click to Approve OT for payment'
                            }
                          >
                            {row.isOtApproved ? '✓ Approved' : '+ Approve OT'}
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-300">0:00:00</span>
                      )}
                    </td>

                    {/* NDF (Night Diff 10PM-6AM) (H:MM:SS) */}
                    <td className="px-3 py-2.5 whitespace-nowrap text-right font-mono">
                      {row.ndfSeconds > 0 ? (
                        <span className="inline-flex items-center font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                          {formatDurationHms(row.ndfSeconds)}
                        </span>
                      ) : (
                        <span className="text-slate-300">0:00:00</span>
                      )}
                    </td>

                    {/* Adjustments & Remarks */}
                    <td className="px-3 py-2.5 text-slate-600 min-w-[210px]">
                      {/* Issue Tags in Vibrant Red Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                        {row.isAbsent && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-600 text-white shadow-xs uppercase tracking-wider flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                            ABSENT
                          </span>
                        )}
                        {row.isNoIn && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-600 text-white shadow-xs uppercase tracking-wider flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                            NO IN
                          </span>
                        )}
                        {row.isNoOut && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-600 text-white shadow-xs uppercase tracking-wider flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                            NO OUT
                          </span>
                        )}
                        {row.isUndertime && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-600 text-white shadow-xs uppercase tracking-wider flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                            UNDERTIME
                          </span>
                        )}
                        {row.isLate && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-600 text-white shadow-xs uppercase tracking-wider flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                            LATE
                          </span>
                        )}
                      </div>

                      {/* Adjustments list */}
                      {row.adjustments && row.adjustments.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-1">
                          {row.adjustments.map((adj) => (
                            <span
                              key={adj.id}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                                adj.action === 'payment'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-rose-50 text-rose-800 border-rose-200'
                              }`}
                              title={adj.remarks}
                            >
                              {adj.type} {adj.action === 'payment' ? '+' : '-'}
                              {adj.type === 'Day'
                                ? `${adj.daysValue}d`
                                : formatDurationHms(adj.durationSeconds)}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Remarks */}
                      {row.remarks && (
                        <span className="text-[11px] text-slate-500 italic block truncate max-w-xs">
                          {row.remarks}
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-2 py-2.5 whitespace-nowrap text-center space-x-1">
                      <button
                        type="button"
                        onClick={() => handleToggleFullDayCredit(row)}
                        title={
                          row.isFullDayCredit
                            ? `Full Day Credit Active: Credited ${row.fullDayCreditHours || 8}h. Click to turn off.`
                            : `Mark as Management Full Day Credit (e.g. ${row.dayOfWeek === 'Sat' ? 'Saturday ' : ''}5–6h paid as whole 8h duty)`
                        }
                        className={`p-1 rounded transition cursor-pointer ${
                          row.isFullDayCredit
                            ? 'text-emerald-700 bg-emerald-100 hover:bg-emerald-200 ring-1 ring-emerald-300'
                            : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenAdjustment(row)}
                        title="Add/Manage Adjustments"
                        className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenDayEdit(row)}
                        title="Edit day punches & details"
                        className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                      >
                        <FileEdit className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {ledgerRows.length === 0 && (
                <tr>
                  <td colSpan={13} className="px-4 py-12 text-center text-slate-400">
                    No dates in the selected range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Period Summary Panel */}
        <div className="bg-slate-900 text-white p-5 border-t border-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold block">
                Period Summary Panel
              </span>
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <span>{currentEmployee?.name}</span>
                <span className="text-xs text-blue-300 font-mono font-normal">
                  ({startDate} to {endDate})
                </span>
              </h4>
            </div>

            {/* Attendance Days Counts */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 rounded-lg border border-emerald-500/30">
                Present: <strong>{periodSummary.presentDays}</strong> days
              </span>
              <span className="px-2.5 py-1 bg-rose-500/20 text-rose-300 rounded-lg border border-rose-500/30">
                Absent: <strong>{periodSummary.absentDays}</strong> days
              </span>
              <span className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg border border-slate-700">
                Rest Days: <strong>{periodSummary.restDays}</strong>
              </span>
              <span className="px-2.5 py-1 bg-teal-500/20 text-teal-300 rounded-lg border border-teal-500/30">
                Leaves: <strong>{periodSummary.leaveDays}</strong>
              </span>
            </div>
          </div>

          {/* Timekeeping Totals Row in H:MM:SS */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 pt-4 text-center font-mono">
            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
              <span className="text-[11px] font-sans text-slate-400 block mb-1">
                Regular Hours Total
              </span>
              <span className="text-base font-bold text-blue-400">
                {formatDurationHms(periodSummary.regularSeconds)}
              </span>
            </div>

            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
              <span className="text-[11px] font-sans text-slate-400 block mb-1">
                Approved / Adj OT
              </span>
              <span className="text-base font-bold text-emerald-400">
                {formatDurationHms(periodSummary.approvedOtSeconds)}
              </span>
              <span className="text-[9px] font-sans text-slate-400 block mt-0.5">
                of {formatDurationHms(periodSummary.otSeconds)} total
              </span>
            </div>

            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
              <span className="text-[11px] font-sans text-slate-400 block mb-1">
                Total Late Hours
              </span>
              <span
                className={`text-base font-bold ${
                  periodSummary.lateSeconds > 0 ? 'text-rose-400' : 'text-slate-300'
                }`}
              >
                {formatDurationHms(periodSummary.lateSeconds)}
              </span>
            </div>

            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
              <span className="text-[11px] font-sans text-slate-400 block mb-1">
                Total Undertime (UT)
              </span>
              <span
                className={`text-base font-bold ${
                  periodSummary.utSeconds > 0 ? 'text-rose-400' : 'text-slate-300'
                }`}
              >
                {formatDurationHms(periodSummary.utSeconds)}
              </span>
            </div>

            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
              <span className="text-[11px] font-sans text-slate-400 block mb-1">
                Total NDF (10PM-6AM)
              </span>
              <span className="text-base font-bold text-indigo-400">
                {formatDurationHms(periodSummary.ndfSeconds)}
              </span>
            </div>

            <div className="bg-blue-950/80 p-3 rounded-xl border-2 border-blue-500/50 shadow-md">
              <span className="text-[11px] font-sans text-blue-200 font-bold block mb-1 uppercase tracking-tight">
                Total Hours to be Paid
              </span>
              <span className="text-base font-extrabold text-amber-300">
                {formatDurationHms(periodSummary.totalPaidSeconds)}
              </span>
              <span className="text-[9px] font-sans text-blue-300 block mt-0.5">
                (Reg + Apprv OT - Late)
              </span>
            </div>
          </div>

          {/* Adjustment Summary Row */}
          {(periodSummary.totalAdjustmentAdditionsSec > 0 ||
            periodSummary.totalAdjustmentDeductionsSec > 0 ||
            periodSummary.totalAdjustmentDays !== 0) && (
            <div className="mt-4 p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">Adjustments Applied:</span>
                <span>
                  Payments (+):{' '}
                  <strong className="text-emerald-400 font-mono">
                    {formatDurationHms(periodSummary.totalAdjustmentAdditionsSec)}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  Deductions (-):{' '}
                  <strong className="text-rose-400 font-mono">
                    {formatDurationHms(periodSummary.totalAdjustmentDeductionsSec)}
                  </strong>
                </span>
                {periodSummary.totalAdjustmentDays !== 0 && (
                  <>
                    <span>•</span>
                    <span>
                      Days Adjustment:{' '}
                      <strong className="text-amber-400 font-mono">
                        {periodSummary.totalAdjustmentDays > 0 ? '+' : ''}
                        {periodSummary.totalAdjustmentDays}d
                      </strong>
                    </span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Day Modal */}
      <DayEditModal
        isOpen={isDayEditOpen}
        onClose={() => setIsDayEditOpen(false)}
        dayRecord={dayToEdit}
        employee={currentEmployee}
        settings={settings}
        onSaveDayRecord={onUpdateRecord}
      />

      {/* Adjustment Modal */}
      <AdjustmentModal
        isOpen={isAdjustmentModalOpen}
        onClose={() => setIsAdjustmentModalOpen(false)}
        dayRecord={dayForAdjustment}
        onSaveAdjustments={handleSaveAdjustments}
      />

      {/* Management Full Day Credit Announcement Modal */}
      <ManagementAnnouncementModal
        isOpen={isAnnouncementModalOpen}
        onClose={() => setIsAnnouncementModalOpen(false)}
        currentEmployee={currentEmployee}
        employees={employees}
        startDate={startDate}
        endDate={endDate}
        existingRecords={records}
        settings={settings}
        onApplyAnnouncement={handleBatchAnnouncementApplied}
      />
    </div>
  );
};
