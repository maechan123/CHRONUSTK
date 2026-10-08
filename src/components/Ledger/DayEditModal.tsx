import React, { useState, useEffect, useMemo } from 'react';
import { X, Check, Clock, AlertTriangle, Sparkles } from 'lucide-react';
import {
  DayType,
  LeaveType,
  TimekeepingDayRecord,
  TimekeepingSettings,
  Employee,
} from '../../types/timekeeping';
import { recalculateDayRecord, formatDurationHms } from '../../utils/timeCalculations';

interface DayEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  dayRecord: TimekeepingDayRecord | null;
  employee: Employee | null;
  settings: TimekeepingSettings;
  onSaveDayRecord: (record: TimekeepingDayRecord) => void;
}

export const DayEditModal: React.FC<DayEditModalProps> = ({
  isOpen,
  onClose,
  dayRecord,
  employee,
  settings,
  onSaveDayRecord,
}) => {
  const [dayType, setDayType] = useState<DayType>('regular');
  const [leaveType, setLeaveType] = useState<LeaveType>('none');
  const [isDayOff, setIsDayOff] = useState(false);
  const [scheduleIn, setScheduleIn] = useState('08:00');
  const [scheduleOut, setScheduleOut] = useState('17:00');

  const [time1In, setTime1In] = useState('');
  const [time1Out, setTime1Out] = useState('');
  const [time2In, setTime2In] = useState('');
  const [time2Out, setTime2Out] = useState('');
  const [otIn, setOtIn] = useState('');
  const [otOut, setOtOut] = useState('');
  const [isOtApproved, setIsOtApproved] = useState(false);
  const [remarks, setRemarks] = useState('');

  // Management Full Day Credit (e.g. Saturday 5-6h paid as 8h)
  const [isFullDayCredit, setIsFullDayCredit] = useState(false);
  const [fullDayCreditHours, setFullDayCreditHours] = useState(8);
  const [fullDayCreditReason, setFullDayCreditReason] = useState('');

  useEffect(() => {
    if (dayRecord) {
      setDayType(dayRecord.dayType);
      setLeaveType(dayRecord.leaveType);
      setIsDayOff(dayRecord.isDayOff || dayRecord.dayType === 'day_off');
      setScheduleIn(dayRecord.scheduleIn || '08:00');
      setScheduleOut(dayRecord.scheduleOut || '17:00');
      setTime1In(dayRecord.time1In || '');
      setTime1Out(dayRecord.time1Out || '');
      setTime2In(dayRecord.time2In || '');
      setTime2Out(dayRecord.time2Out || '');
      setOtIn(dayRecord.otIn || '');
      setOtOut(dayRecord.otOut || '');
      setIsOtApproved(!!dayRecord.isOtApproved);
      setRemarks(dayRecord.remarks || '');
      setIsFullDayCredit(!!dayRecord.isFullDayCredit);
      setFullDayCreditHours(dayRecord.fullDayCreditHours ?? (employee?.dutyHours || 8));
      setFullDayCreditReason(
        dayRecord.fullDayCreditReason ||
          (dayRecord.dayOfWeek === 'Sat'
            ? 'Saturday Management Memo: Paid as Whole 8 Hours Duty'
            : 'Management Announcement: Paid as Full Day Duty')
      );
    }
  }, [dayRecord, isOpen, employee]);

  // Live preview recalculated record
  const preview = useMemo(() => {
    if (!dayRecord) return null;
    return recalculateDayRecord(
      {
        ...dayRecord,
        dayType,
        leaveType,
        isDayOff,
        scheduleIn: isDayOff ? '' : scheduleIn,
        scheduleOut: isDayOff ? '' : scheduleOut,
        time1In,
        time1Out,
        time2In,
        time2Out,
        otIn,
        otOut,
        isOtApproved,
        remarks,
        isFullDayCredit,
        fullDayCreditHours,
        fullDayCreditReason,
      },
      settings,
      employee?.dutyHours || 8
    );
  }, [
    dayRecord,
    dayType,
    leaveType,
    isDayOff,
    scheduleIn,
    scheduleOut,
    time1In,
    time1Out,
    time2In,
    time2Out,
    otIn,
    otOut,
    isOtApproved,
    remarks,
    isFullDayCredit,
    fullDayCreditHours,
    fullDayCreditReason,
    settings,
    employee,
  ]);

  if (!isOpen || !dayRecord) return null;

  const handleSave = () => {
    if (preview) {
      onSaveDayRecord(preview);
    }
    onClose();
  };

  const handleDayTypeChange = (newType: DayType) => {
    setDayType(newType);
    if (newType === 'day_off') {
      setIsDayOff(true);
    } else {
      setIsDayOff(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 my-6 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white shrink-0">
          <div>
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-400" />
              <span>Edit Daily Ledger Record</span>
            </h3>
            <p className="text-xs text-slate-300">
              Date: <span className="font-semibold text-white">{dayRecord.date}</span> ({dayRecord.dayOfWeek}) • Staff: {employee?.name} (Emp #{dayRecord.employeeNumber})
            </p>
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
          {/* Day Type & Leave Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Day Type
              </label>
              <select
                value={dayType}
                onChange={(e) => handleDayTypeChange(e.target.value as DayType)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white font-medium"
              >
                <option value="regular">Regular Working Day</option>
                <option value="legal_holiday">Legal / Regular Holiday (200%)</option>
                <option value="special_holiday">Special Non-Working Holiday (130%)</option>
                <option value="cancelled_off_regular">Cancel-Off: Rest Day Work (Regular)</option>
                <option value="cancelled_off_holiday">Cancel-Off: Rest Day Work (Holiday)</option>
                <option value="day_off">Day Off / Rest Day</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Leave Type
              </label>
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white font-medium"
              >
                <option value="none">None / Active Duty</option>
                <option value="vl">Vacation Leave (VL)</option>
                <option value="sl">Sick Leave (SL)</option>
                <option value="unpaid">Unpaid / Absent (UL)</option>
              </select>
            </div>
          </div>

          {/* Schedule */}
          {!isDayOff && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 block mb-2">
                Shift Schedule
              </span>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-slate-500 block mb-1">Shift In</span>
                  <input
                    type="time"
                    value={scheduleIn}
                    onChange={(e) => setScheduleIn(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-mono"
                  />
                </div>
                <div>
                  <span className="text-xs text-slate-500 block mb-1">Shift Out</span>
                  <input
                    type="time"
                    value={scheduleOut}
                    onChange={(e) => setScheduleOut(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Biometric Punches: Time 1, Time 2, OT Punches */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 block">
              Timekeeping Punches (HH:mm:ss or HH:mm)
            </span>

            {/* Time 1 */}
            <div>
              <span className="text-xs font-semibold text-slate-700 block mb-1">
                Time 1 (First Half / Morning)
              </span>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[11px] text-slate-500 block mb-0.5">Time 1 In</span>
                  <input
                    type="text"
                    value={time1In}
                    onChange={(e) => setTime1In(e.target.value)}
                    placeholder="e.g. 07:55:00"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-mono"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block mb-0.5">Time 1 Out</span>
                  <input
                    type="text"
                    value={time1Out}
                    onChange={(e) => setTime1Out(e.target.value)}
                    placeholder="e.g. 12:00:00"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Time 2 */}
            <div>
              <span className="text-xs font-semibold text-slate-700 block mb-1">
                Time 2 (Second Half / Afternoon / Shift End)
              </span>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[11px] text-slate-500 block mb-0.5">Time 2 In</span>
                  <input
                    type="text"
                    value={time2In}
                    onChange={(e) => setTime2In(e.target.value)}
                    placeholder="e.g. 13:00:00"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-mono"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block mb-0.5">Time 2 Out</span>
                  <input
                    type="text"
                    value={time2Out}
                    onChange={(e) => setTime2Out(e.target.value)}
                    placeholder="e.g. 17:02:00"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-mono"
                  />
                </div>
              </div>
            </div>

            {/* OT Punches */}
            <div>
              <span className="text-xs font-semibold text-slate-700 block mb-1">
                Overtime Punches (OT In / OT Out)
              </span>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[11px] text-slate-500 block mb-0.5">OT In</span>
                  <input
                    type="text"
                    value={otIn}
                    onChange={(e) => setOtIn(e.target.value)}
                    placeholder="e.g. 17:00:00"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-mono"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block mb-0.5">OT Out</span>
                  <input
                    type="text"
                    value={otOut}
                    onChange={(e) => setOtOut(e.target.value)}
                    placeholder="e.g. 19:30:00"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-mono"
                  />
                </div>
              </div>

              {/* OT Approval Status */}
              <div className="mt-2.5 pt-2 border-t border-slate-200 flex items-center justify-between">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isOtApproved}
                    onChange={(e) => setIsOtApproved(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <span className="text-xs font-semibold text-emerald-800">
                    Overtime Approved for Payment (Count toward Total Hours to be Paid)
                  </span>
                </label>
                <span className="text-[10px] text-slate-400">
                  {isOtApproved ? '✓ Counted in payroll' : 'Pending authorization'}
                </span>
              </div>
            </div>
          </div>

          {/* Management Full Day Credit Announcement (e.g. Saturday 5-6h paid as 8h) */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start space-x-2.5">
                <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-700 shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wide flex items-center gap-2">
                    <span>Management Announcement: Paid as Whole Day Duty</span>
                    {dayRecord.dayOfWeek === 'Sat' && (
                      <span className="text-[10px] px-1.5 py-0.2 bg-emerald-200 text-emerald-800 rounded font-bold">
                        Saturday Special
                      </span>
                    )}
                  </h4>
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    For special days (e.g. Saturday worked 5–6 hours) announced by management to be credited and paid as a whole 8-hour duty without undertime penalty.
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={isFullDayCredit}
                  onChange={(e) => setIsFullDayCredit(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-5 h-5 cursor-pointer"
                />
              </label>
            </div>

            {isFullDayCredit && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-emerald-200/70">
                <div>
                  <label className="block text-[11px] font-semibold text-emerald-900 mb-1">
                    Credited Regular Hours to Pay
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="1"
                      max="24"
                      step="0.5"
                      value={fullDayCreditHours}
                      onChange={(e) => setFullDayCreditHours(parseFloat(e.target.value) || 8)}
                      className="w-24 px-2 py-1.5 border border-emerald-300 rounded-lg text-xs bg-white font-mono font-bold text-emerald-900"
                    />
                    <span className="text-xs text-emerald-700">hours duty credit</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-emerald-900 mb-1">
                    Announcement / Memo Note
                  </label>
                  <input
                    type="text"
                    value={fullDayCreditReason}
                    onChange={(e) => setFullDayCreditReason(e.target.value)}
                    placeholder="e.g. Saturday Management Announcement - Paid 8h Duty"
                    className="w-full px-2.5 py-1.5 border border-emerald-300 rounded-lg text-xs bg-white text-slate-800"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Remarks / Audit Notes
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Approved OB Slip #104, Power outage manual punch"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
            />
          </div>

          {/* Live Computed Durations Preview */}
          {preview && (
            <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Computed Durations (H:MM:SS)
                </span>
                {/* Problem Badges */}
                <div className="flex items-center gap-1">
                  {preview.isAbsent && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white">
                      ABSENT
                    </span>
                  )}
                  {preview.isLate && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white">
                      LATE
                    </span>
                  )}
                  {preview.isUndertime && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white">
                      UNDERTIME
                    </span>
                  )}
                  {preview.isNoIn && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white">
                      NO IN
                    </span>
                  )}
                  {preview.isNoOut && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white">
                      NO OUT
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-5 gap-2 text-center font-mono">
                <div className="bg-white p-2 rounded-lg border border-blue-100">
                  <span className="text-[10px] font-sans text-slate-500 block">Regular</span>
                  <span className="font-bold text-xs text-slate-900">
                    {formatDurationHms(preview.regularSeconds)}
                  </span>
                </div>
                <div
                  className={`p-2 rounded-lg border ${
                    preview.lateSeconds > 0
                      ? 'bg-rose-50 border-rose-200 text-rose-700'
                      : 'bg-white border-blue-100 text-slate-900'
                  }`}
                >
                  <span className="text-[10px] font-sans text-slate-500 block">Late</span>
                  <span className="font-bold text-xs">
                    {formatDurationHms(preview.lateSeconds)}
                  </span>
                </div>
                <div
                  className={`p-2 rounded-lg border ${
                    preview.utSeconds > 0
                      ? 'bg-rose-50 border-rose-200 text-rose-700'
                      : 'bg-white border-blue-100 text-slate-900'
                  }`}
                >
                  <span className="text-[10px] font-sans text-slate-500 block">Undertime</span>
                  <span className="font-bold text-xs">
                    {formatDurationHms(preview.utSeconds)}
                  </span>
                </div>
                <div
                  className={`p-2 rounded-lg border ${
                    preview.otSeconds > 0
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-white border-blue-100 text-slate-900'
                  }`}
                >
                  <span className="text-[10px] font-sans text-slate-500 block">Overtime</span>
                  <span className="font-bold text-xs">
                    {formatDurationHms(preview.otSeconds)}
                  </span>
                </div>
                <div
                  className={`p-2 rounded-lg border ${
                    preview.ndfSeconds > 0
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-800'
                      : 'bg-white border-blue-100 text-slate-900'
                  }`}
                >
                  <span className="text-[10px] font-sans text-slate-500 block">NDF</span>
                  <span className="font-bold text-xs">
                    {formatDurationHms(preview.ndfSeconds)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 px-6 py-4 bg-slate-50 border-t border-slate-200 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center space-x-1.5 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm shadow-sm transition"
          >
            <Check className="w-4 h-4" />
            <span>Update Day Record</span>
          </button>
        </div>
      </div>
    </div>
  );
};
