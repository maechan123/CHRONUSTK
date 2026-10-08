import React, { useState, useMemo } from 'react';
import { X, Sparkles, Calendar, Check, Info, Users, User } from 'lucide-react';
import { Employee, TimekeepingDayRecord, TimekeepingSettings } from '../../types/timekeeping';
import { generateDateRange, getDayOfWeek, recalculateDayRecord } from '../../utils/timeCalculations';

interface ManagementAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentEmployee: Employee | null;
  employees: Employee[];
  startDate: string;
  endDate: string;
  existingRecords: TimekeepingDayRecord[];
  settings: TimekeepingSettings;
  onApplyAnnouncement: (updatedRecords: TimekeepingDayRecord[]) => void;
}

export const ManagementAnnouncementModal: React.FC<ManagementAnnouncementModalProps> = ({
  isOpen,
  onClose,
  currentEmployee,
  employees,
  startDate,
  endDate,
  existingRecords,
  settings,
  onApplyAnnouncement,
}) => {
  const [scope, setScope] = useState<'current_emp_saturdays' | 'all_emp_saturdays' | 'specific_date'>('current_emp_saturdays');
  const [specificDate, setSpecificDate] = useState(() => {
    // Default to the first Saturday in the date range if available
    const dates = generateDateRange(startDate, endDate);
    const firstSat = dates.find((d) => getDayOfWeek(d) === 'Sat');
    return firstSat || startDate;
  });
  const [specificScope, setSpecificScope] = useState<'current' | 'all'>('all');
  const [creditHours, setCreditHours] = useState(8);
  const [reason, setReason] = useState('Saturday Management Memo: Paid as Whole 8 Hours Duty');

  // Dates in range
  const allDatesInRange = useMemo(() => {
    if (!startDate || !endDate || startDate > endDate) return [];
    return generateDateRange(startDate, endDate);
  }, [startDate, endDate]);

  // Saturday dates in range
  const saturdaysInRange = useMemo(() => {
    return allDatesInRange.filter((d) => getDayOfWeek(d) === 'Sat');
  }, [allDatesInRange]);

  // Target dates based on scope
  const targetDates = useMemo(() => {
    if (scope === 'specific_date') {
      return specificDate ? [specificDate] : [];
    }
    return saturdaysInRange;
  }, [scope, saturdaysInRange, specificDate]);

  // Target employees based on scope
  const targetEmployees = useMemo(() => {
    if (scope === 'current_emp_saturdays') {
      return currentEmployee ? [currentEmployee] : [];
    }
    if (scope === 'specific_date' && specificScope === 'current') {
      return currentEmployee ? [currentEmployee] : [];
    }
    return employees;
  }, [scope, specificScope, currentEmployee, employees]);

  if (!isOpen) return null;

  const handleApply = () => {
    if (targetDates.length === 0 || targetEmployees.length === 0) return;

    const recordsMap = new Map<string, TimekeepingDayRecord>();
    for (const r of existingRecords) {
      recordsMap.set(r.id, r);
    }

    const modifiedList: TimekeepingDayRecord[] = [];

    for (const emp of targetEmployees) {
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
                ? existing.remarks.includes(reason)
                  ? existing.remarks
                  : `${existing.remarks} | ${reason}`
                : reason,
            }
          : {
              id,
              employeeId: emp.id,
              employeeNumber: emp.employeeNumber,
              date: dateStr,
              dayOfWeek: getDayOfWeek(dateStr),
              scheduleIn: emp.defaultShiftIn || '08:00',
              scheduleOut: emp.defaultShiftOut || '17:00',
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

        const recomputed = recalculateDayRecord(base, settings, emp.dutyHours || 8);
        modifiedList.push(recomputed);
      }
    }

    onApplyAnnouncement(modifiedList);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 my-6 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Management Full Day Credit Announcement</h3>
              <p className="text-xs text-slate-300">
                Credit short shifts (e.g. Saturday 5–6 hours) as a whole 8-hour duty without undertime penalty
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Information Notice */}
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-900 flex items-start space-x-2.5">
            <Info className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-950">How Full Day Duty Credit Works:</p>
              <p className="mt-0.5 text-emerald-800">
                When management announces that a day (such as Saturday) will be paid as a whole day duty, employees who rendered 5–6 hours will automatically be credited with <strong>{creditHours} hours regular duty</strong>. Undertime is waived (set to 0:00:00).
              </p>
            </div>
          </div>

          {/* Scope Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
              1. Announcement Target & Scope
            </label>
            <div className="space-y-2">
              <label
                className={`flex items-start p-3 rounded-xl border cursor-pointer transition ${
                  scope === 'current_emp_saturdays'
                    ? 'border-emerald-500 bg-emerald-50/50 text-slate-900 shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="scope"
                  value="current_emp_saturdays"
                  checked={scope === 'current_emp_saturdays'}
                  onChange={() => setScope('current_emp_saturdays')}
                  className="mt-0.5 mr-3 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-600" />
                    <span>All Saturdays in Cutoff for Current Staff Only</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Applies to {currentEmployee?.name} for all Saturdays ({saturdaysInRange.join(', ') || 'None found'}) between {startDate} and {endDate}.
                  </div>
                </div>
              </label>

              <label
                className={`flex items-start p-3 rounded-xl border cursor-pointer transition ${
                  scope === 'all_emp_saturdays'
                    ? 'border-emerald-500 bg-emerald-50/50 text-slate-900 shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="scope"
                  value="all_emp_saturdays"
                  checked={scope === 'all_emp_saturdays'}
                  onChange={() => setScope('all_emp_saturdays')}
                  className="mt-0.5 mr-3 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-emerald-600" />
                    <span>All Saturdays in Cutoff for ALL Employees ({employees.length} Staff)</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Company-wide Saturday announcement: Credits {saturdaysInRange.length} Saturday(s) across all active employees.
                  </div>
                </div>
              </label>

              <label
                className={`flex items-start p-3 rounded-xl border cursor-pointer transition ${
                  scope === 'specific_date'
                    ? 'border-emerald-500 bg-emerald-50/50 text-slate-900 shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="scope"
                  value="specific_date"
                  checked={scope === 'specific_date'}
                  onChange={() => setScope('specific_date')}
                  className="mt-0.5 mr-3 text-emerald-600 focus:ring-emerald-500"
                />
                <div className="flex-1">
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-purple-600" />
                    <span>Single Specific Date (e.g. Special Saturday / Short Day)</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Apply management credit to a single specific date.
                  </div>

                  {scope === 'specific_date' && (
                    <div className="mt-2.5 pt-2 border-t border-slate-200 flex flex-wrap items-center gap-3">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-[11px] font-semibold text-slate-600">Date:</span>
                        <input
                          type="date"
                          value={specificDate}
                          onChange={(e) => setSpecificDate(e.target.value)}
                          className="px-2 py-1 text-xs border border-slate-300 rounded font-mono bg-white"
                        />
                        <span className="text-xs font-bold text-slate-700">
                          ({getDayOfWeek(specificDate)})
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 text-xs">
                        <label className="flex items-center space-x-1 cursor-pointer">
                          <input
                            type="radio"
                            name="specScope"
                            checked={specificScope === 'all'}
                            onChange={() => setSpecificScope('all')}
                            className="text-emerald-600 text-xs"
                          />
                          <span>All Staff</span>
                        </label>
                        <label className="flex items-center space-x-1 cursor-pointer">
                          <input
                            type="radio"
                            name="specScope"
                            checked={specificScope === 'current'}
                            onChange={() => setSpecificScope('current')}
                            className="text-emerald-600 text-xs"
                          />
                          <span>{currentEmployee?.name || 'Selected Staff'}</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </label>
            </div>
          </div>

          {/* Credit Hours & Reason */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Credited Hours
              </label>
              <div className="flex items-center space-x-1.5">
                <input
                  type="number"
                  min="1"
                  max="24"
                  step="0.5"
                  value={creditHours}
                  onChange={(e) => setCreditHours(parseFloat(e.target.value) || 8)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 bg-white"
                />
                <span className="text-xs text-slate-500 font-medium whitespace-nowrap">hrs duty</span>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Announcement Memo / Title
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Saturday Management Memo: Paid as Whole 8 Hours Duty"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white"
              />
            </div>
          </div>

          {/* Impact Summary Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs space-y-1.5">
            <div className="font-semibold text-slate-700">Announcement Preview:</div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-600">
              <div>
                Target Dates: <strong>{targetDates.length}</strong> day(s) ({targetDates.join(', ') || 'None'})
              </div>
              <div>
                Target Employees: <strong>{targetEmployees.length}</strong> staff
              </div>
              <div>
                Paid Duty Credit: <strong className="text-emerald-700">{creditHours}.00 hrs</strong> (0 undertime)
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200 shrink-0">
          <div className="text-xs text-slate-500">
            {targetEmployees.length * targetDates.length} record(s) will be updated with full day credit.
          </div>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={targetDates.length === 0 || targetEmployees.length === 0}
              onClick={handleApply}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Apply Announcement</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
