import React, { useState, useMemo } from 'react';
import { X, Calendar, Check, Clock, AlertCircle } from 'lucide-react';
import { Employee, TimekeepingDayRecord } from '../../types/timekeeping';
import { generateDateRange, getDayOfWeek } from '../../utils/timeCalculations';

interface SetScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  existingRecords: TimekeepingDayRecord[];
  onApplySchedule: (
    employee: Employee,
    dates: string[],
    shiftIn: string,
    shiftOut: string,
    isDayOff: boolean
  ) => void;
}

export const SetScheduleModal: React.FC<SetScheduleModalProps> = ({
  isOpen,
  onClose,
  employee,
  existingRecords,
  onApplySchedule,
}) => {
  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 6);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  const [isDayOff, setIsDayOff] = useState(false);
  const [shiftIn, setShiftIn] = useState('08:00');
  const [shiftOut, setShiftOut] = useState('17:00');

  // Pre-fill default shifts when employee opens
  React.useEffect(() => {
    if (employee) {
      setShiftIn(employee.defaultShiftIn || '08:00');
      setShiftOut(employee.defaultShiftOut || '17:00');
      setIsDayOff(false);
    }
  }, [employee]);

  // Generate affected dates
  const affectedDates = useMemo(() => {
    if (!startDate || !endDate || startDate > endDate) return [];
    return generateDateRange(startDate, endDate);
  }, [startDate, endDate]);

  // Preview data lookup
  const previewData = useMemo(() => {
    if (!employee) return [];
    const empRecords = new Map<string, TimekeepingDayRecord>();
    for (const r of existingRecords) {
      if (r.employeeId === employee.id) {
        empRecords.set(r.date, r);
      }
    }

    return affectedDates.map((dateStr) => {
      const existing = empRecords.get(dateStr);
      const dayName = getDayOfWeek(dateStr);
      const currentSched = existing
        ? existing.isDayOff
          ? 'Rest Day (OFF)'
          : `${existing.scheduleIn} - ${existing.scheduleOut}`
        : 'Not Set / Default';

      const proposedSched = isDayOff ? 'Rest Day (OFF)' : `${shiftIn} - ${shiftOut}`;
      const isChanged = currentSched !== proposedSched;

      return {
        dateStr,
        dayName,
        currentSched,
        proposedSched,
        isChanged,
        hasPunches: existing ? existing.isPresent : false,
      };
    });
  }, [affectedDates, employee, existingRecords, isDayOff, shiftIn, shiftOut]);

  if (!isOpen || !employee) return null;

  const handleQuickPreset = (preset: '1-15' | '16-end' | 'next7') => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();

    if (preset === '1-15') {
      setStartDate(`${y}-${m}-01`);
      setEndDate(`${y}-${m}-15`);
    } else if (preset === '16-end') {
      setStartDate(`${y}-${m}-16`);
      setEndDate(`${y}-${m}-${String(lastDay).padStart(2, '0')}`);
    } else if (preset === 'next7') {
      setStartDate(today);
      const endD = new Date();
      endD.setDate(endD.getDate() + 6);
      setEndDate(
        `${endD.getFullYear()}-${String(endD.getMonth() + 1).padStart(2, '0')}-${String(endD.getDate()).padStart(2, '0')}`
      );
    }
  };

  const handleConfirm = () => {
    if (affectedDates.length === 0) return;
    onApplySchedule(employee, affectedDates, shiftIn, shiftOut, isDayOff);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 my-6 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white shrink-0">
          <div>
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-blue-400" />
              <h3 className="font-semibold text-lg">Apply Shift Schedule Across Date Range</h3>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Target Staff: <span className="font-semibold text-white">{employee.name}</span> (Emp #{employee.employeeNumber}) • {employee.department}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Quick Presets & Date Range */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                1. Select Target Date Range
              </label>
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickPreset('1-15')}
                  className="px-2 py-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded"
                >
                  1st–15th Fortnight
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPreset('16-end')}
                  className="px-2 py-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded"
                >
                  16th–End Fortnight
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPreset('next7')}
                  className="px-2 py-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded"
                >
                  Next 7 Days
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-slate-500 block mb-1">From Date</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                />
              </div>
              <div>
                <span className="text-xs text-slate-500 block mb-1">To Date</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                />
              </div>
            </div>
          </div>

          {/* Shift Details */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-600" /> 2. Shift Timing Configuration
              </label>
              <label className="flex items-center space-x-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-slate-300">
                <input
                  type="checkbox"
                  checked={isDayOff}
                  onChange={(e) => setIsDayOff(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                />
                <span className="text-xs font-semibold text-rose-700">
                  Mark as Day Off / Rest Day
                </span>
              </label>
            </div>

            {!isDayOff ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-slate-600 block mb-1">Shift In Time</span>
                  <input
                    type="time"
                    value={shiftIn}
                    onChange={(e) => setShiftIn(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white font-mono"
                  />
                </div>
                <div>
                  <span className="text-xs text-slate-600 block mb-1">Shift Out Time</span>
                  <input
                    type="time"
                    value={shiftOut}
                    onChange={(e) => setShiftOut(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white font-mono"
                  />
                </div>
              </div>
            ) : (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
                All dates in this range will be marked as non-working <strong>Day Off / Rest Day</strong>. Punches on these days will be treated as rest day work (Cancel-off).
              </div>
            )}
          </div>

          {/* Live Preview of Affected Days */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                3. Live Preview of Affected Days ({affectedDates.length} Days)
              </label>
              <span className="text-xs text-slate-500">
                Inspect changes before applying
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-100 text-slate-600 uppercase font-semibold sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-left">Day</th>
                    <th className="px-3 py-2 text-left">Current Schedule</th>
                    <th className="px-3 py-2 text-left">Proposed Schedule</th>
                    <th className="px-3 py-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white font-mono">
                  {previewData.map((item) => (
                    <tr
                      key={item.dateStr}
                      className={item.isChanged ? 'bg-blue-50/40' : 'hover:bg-slate-50'}
                    >
                      <td className="px-3 py-2 font-medium text-slate-800">{item.dateStr}</td>
                      <td className="px-3 py-2 text-slate-600 font-sans">{item.dayName}</td>
                      <td className="px-3 py-2 text-slate-500">{item.currentSched}</td>
                      <td className="px-3 py-2 font-semibold text-blue-700">
                        {item.proposedSched}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {item.isChanged ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-sans font-medium bg-blue-100 text-blue-800">
                            Update
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-sans font-medium bg-slate-100 text-slate-500">
                            Same
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {previewData.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400 font-sans">
                        No valid dates in range. Please adjust From and To dates.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200 shrink-0">
          <div className="text-xs text-slate-500">
            {affectedDates.length} calendar day(s) will be updated.
          </div>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={affectedDates.length === 0}
              onClick={handleConfirm}
              className="flex items-center space-x-1.5 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm shadow-sm transition disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>Apply Schedule ({affectedDates.length} Days)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
