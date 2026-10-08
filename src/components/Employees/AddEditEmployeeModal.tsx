import React, { useState, useEffect } from 'react';
import { X, Check, Sparkles, User, Briefcase, Building2, Landmark, Clock } from 'lucide-react';
import {
  Employee,
  EmploymentStatus,
  ScheduleType,
} from '../../types/timekeeping';

interface AddEditEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (employee: Employee, syncLedger?: boolean) => void;
  employeeToEdit?: Employee | null;
  suggestedEmployeeNumber: string;
}

const COMMON_BANKS = [
  'BDO Unibank',
  'BPI',
  'Metrobank',
  'Landbank',
  'UnionBank',
  'Security Bank',
  'GCash / Maya',
  'RCBC',
  'PNB',
  'Chinabank',
];

const COMMON_DEPARTMENTS = [
  'Front Office',
  'Housekeeping',
  'Food & Beverage',
  'Engineering',
  'Admin & HR',
  'Finance & Accounting',
  'Security',
  'IT & Systems',
  'Sales & Marketing',
];

const COMMON_DEPLOYMENTS = [
  'Selah Garden Hotel',
  'Selah Pods Pasay',
  'Selah Lofts',
  'Head Office',
  'Central Commissary',
  'Branch North',
];

const DAYS_OF_WEEK = [
  { label: 'Sun', value: 0 },
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
];

export const AddEditEmployeeModal: React.FC<AddEditEmployeeModalProps> = ({
  isOpen,
  onClose,
  onSave,
  employeeToEdit,
  suggestedEmployeeNumber,
}) => {
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [name, setName] = useState('');
  const [bank, setBank] = useState('BDO Unibank');
  const [deployment, setDeployment] = useState('Selah Garden Hotel');
  const [employmentStatus, setEmploymentStatus] = useState<EmploymentStatus>('Regular');
  const [scheduleType, setScheduleType] = useState<ScheduleType>('Fixed');
  const [dutyHours, setDutyHours] = useState(8);
  const [department, setDepartment] = useState('Front Office');
  const [position, setPosition] = useState('');
  const [defaultShiftIn, setDefaultShiftIn] = useState('08:00');
  const [defaultShiftOut, setDefaultShiftOut] = useState('17:00');
  const [restDays, setRestDays] = useState<number[]>([0]);
  const [syncLedger, setSyncLedger] = useState(true);

  useEffect(() => {
    if (employeeToEdit) {
      setEmployeeNumber(employeeToEdit.employeeNumber);
      setName(employeeToEdit.name);
      setBank(employeeToEdit.bank);
      setDeployment(employeeToEdit.deployment);
      setEmploymentStatus(employeeToEdit.employmentStatus);
      setScheduleType(employeeToEdit.scheduleType);
      setDutyHours(employeeToEdit.dutyHours || 8);
      setDepartment(employeeToEdit.department);
      setPosition(employeeToEdit.position);
      setDefaultShiftIn(employeeToEdit.defaultShiftIn || '08:00');
      setDefaultShiftOut(employeeToEdit.defaultShiftOut || '17:00');
      setRestDays(employeeToEdit.restDays || [0]);
    } else {
      setEmployeeNumber(suggestedEmployeeNumber);
      setName('');
      setBank('BDO Unibank');
      setDeployment('Selah Garden Hotel');
      setEmploymentStatus('Regular');
      setScheduleType('Fixed');
      setDutyHours(8);
      setDepartment('Front Office');
      setPosition('');
      setDefaultShiftIn('08:00');
      setDefaultShiftOut('17:00');
      setRestDays([0]);
    }
  }, [employeeToEdit, suggestedEmployeeNumber, isOpen]);

  if (!isOpen) return null;

  const toggleRestDay = (dayVal: number) => {
    if (restDays.includes(dayVal)) {
      setRestDays(restDays.filter((d) => d !== dayVal));
    } else {
      setRestDays([...restDays, dayVal].sort());
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newEmp: Employee = {
      id: employeeToEdit ? employeeToEdit.id : `emp-${employeeNumber.trim() || Date.now()}`,
      employeeNumber: employeeNumber.trim(),
      name: name.trim(),
      bank: bank.trim(),
      deployment: deployment.trim(),
      employmentStatus,
      scheduleType,
      dutyHours: Number(dutyHours) || 8,
      department: department.trim(),
      position: position.trim() || 'Staff',
      defaultShiftIn,
      defaultShiftOut,
      restDays,
      email: employeeToEdit?.email,
      phone: employeeToEdit?.phone,
    };

    onSave(newEmp, syncLedger);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 my-8 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center space-x-2">
            <User className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold text-lg">
              {employeeToEdit ? 'Edit Employee Details' : 'Register New Employee'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Employee Number & Name */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Employee Number *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={employeeNumber}
                  onChange={(e) => setEmployeeNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  placeholder="e.g. 1011"
                />
                {!employeeToEdit && suggestedEmployeeNumber && (
                  <button
                    type="button"
                    onClick={() => setEmployeeNumber(suggestedEmployeeNumber)}
                    className="absolute right-1 top-1 bottom-1 px-2 text-[10px] bg-blue-50 text-blue-600 rounded hover:bg-blue-100 font-medium flex items-center gap-1"
                    title="Auto-suggest next highest number"
                  >
                    <Sparkles className="w-3 h-3" /> Auto
                  </button>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Matched in biometric punch logs</p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                placeholder="e.g. Juan C. Dela Cruz"
              />
            </div>
          </div>

          {/* Department & Position */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" /> Department *
              </label>
              <input
                type="text"
                list="department-suggestions"
                required
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
              <datalist id="department-suggestions">
                {COMMON_DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5" /> Position / Designation *
              </label>
              <input
                type="text"
                required
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                placeholder="e.g. Front Desk Officer"
              />
            </div>
          </div>

          {/* Bank & Deployment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1">
                <Landmark className="w-3.5 h-3.5" /> Payroll Bank *
              </label>
              <input
                type="text"
                list="bank-suggestions"
                required
                value={bank}
                onChange={(e) => setBank(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
              <datalist id="bank-suggestions">
                {COMMON_BANKS.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" /> Deployment Location *
              </label>
              <input
                type="text"
                list="deployment-suggestions"
                required
                value={deployment}
                onChange={(e) => setDeployment(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
              <datalist id="deployment-suggestions">
                {COMMON_DEPLOYMENTS.map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Employment Status & Schedule Type & Duty Hours */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Employment Status
              </label>
              <select
                value={employmentStatus}
                onChange={(e) => setEmploymentStatus(e.target.value as EmploymentStatus)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                <option value="Regular">Regular</option>
                <option value="Probationary">Probationary</option>
                <option value="Contractual">Contractual</option>
                <option value="Casual">Casual</option>
                <option value="Part-time">Part-time</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Schedule Type
              </label>
              <select
                value={scheduleType}
                onChange={(e) => {
                  const val = e.target.value as ScheduleType;
                  setScheduleType(val);
                  if (val === 'Compressed') {
                    if (dutyHours === 8) setDutyHours(12);
                    if (defaultShiftIn === '08:00' && defaultShiftOut === '17:00') {
                      setDefaultShiftIn('07:00');
                      setDefaultShiftOut('19:00');
                    }
                    if (restDays.length < 3) {
                      setRestDays([0, 5, 6]); // Fri, Sat, Sun
                    }
                  } else if (val === 'Fixed') {
                    if (dutyHours > 8) setDutyHours(8);
                    setDefaultShiftIn('08:00');
                    setDefaultShiftOut('17:00');
                    if (restDays.length > 2) setRestDays([0, 6]);
                  }
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white font-medium"
              >
                <option value="Fixed">Fixed Schedule (e.g. 8-5)</option>
                <option value="Compressed">Compressed Workweek (e.g. 10h/12h)</option>
                <option value="Shifting">Shifting Schedule</option>
                <option value="Flexible">Flexible Schedule</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Daily Duty Hours
              </label>
              <input
                type="number"
                min={4}
                max={12}
                step={0.5}
                value={dutyHours}
                onChange={(e) => setDutyHours(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                {dutyHours >= 10 ? 'Compressed duty threshold' : 'Standard: 8 hours'}
              </span>
            </div>
          </div>

          {/* Default Shift In / Out */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-blue-600" /> Default Working Shift (24-Hour)
              </label>
              {scheduleType === 'Compressed' && (
                <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full">
                  Compressed Mode Active
                </span>
              )}
            </div>

            {/* Quick Shift Templates */}
            <div>
              <span className="text-[11px] text-slate-500 font-medium block mb-1.5">
                Quick Shift Templates:
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setDefaultShiftIn('08:00');
                    setDefaultShiftOut('17:00');
                    setDutyHours(8);
                    setScheduleType('Fixed');
                  }}
                  className="px-2 py-1 text-[11px] bg-white border border-slate-300 hover:border-blue-500 text-slate-700 rounded-md font-mono"
                >
                  8h Fixed (08:00–17:00)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDefaultShiftIn('07:00');
                    setDefaultShiftOut('19:00');
                    setDutyHours(12);
                    setScheduleType('Compressed');
                    if (restDays.length < 3) setRestDays([0, 5, 6]);
                  }}
                  className="px-2 py-1 text-[11px] bg-purple-50 border border-purple-300 hover:bg-purple-100 text-purple-800 rounded-md font-mono font-bold"
                >
                  12h Compressed Day (07:00–19:00)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDefaultShiftIn('19:00');
                    setDefaultShiftOut('07:00');
                    setDutyHours(12);
                    setScheduleType('Compressed');
                    if (restDays.length < 3) setRestDays([0, 5, 6]);
                  }}
                  className="px-2 py-1 text-[11px] bg-purple-50 border border-purple-300 hover:bg-purple-100 text-purple-800 rounded-md font-mono font-bold"
                >
                  12h Compressed Night (19:00–07:00)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDefaultShiftIn('08:00');
                    setDefaultShiftOut('18:00');
                    setDutyHours(10);
                    setScheduleType('Compressed');
                  }}
                  className="px-2 py-1 text-[11px] bg-purple-50 border border-purple-300 hover:bg-purple-100 text-purple-800 rounded-md font-mono font-bold"
                >
                  10h Compressed (08:00–18:00)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDefaultShiftIn('06:00');
                    setDefaultShiftOut('15:00');
                    setDutyHours(8);
                    setScheduleType('Shifting');
                  }}
                  className="px-2 py-1 text-[11px] bg-white border border-slate-300 hover:border-blue-500 text-slate-700 rounded-md font-mono"
                >
                  Shifting AM (06:00–15:00)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDefaultShiftIn('14:00');
                    setDefaultShiftOut('23:00');
                    setDutyHours(8);
                    setScheduleType('Shifting');
                  }}
                  className="px-2 py-1 text-[11px] bg-white border border-slate-300 hover:border-blue-500 text-slate-700 rounded-md font-mono"
                >
                  Shifting PM (14:00–23:00)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDefaultShiftIn('22:00');
                    setDefaultShiftOut('07:00');
                    setDutyHours(8);
                    setScheduleType('Shifting');
                  }}
                  className="px-2 py-1 text-[11px] bg-white border border-slate-300 hover:border-blue-500 text-slate-700 rounded-md font-mono"
                >
                  Shifting Night (22:00–07:00)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-1">
              <div>
                <span className="text-xs text-slate-500 block mb-1">Shift In Time</span>
                <input
                  type="time"
                  required
                  value={defaultShiftIn}
                  onChange={(e) => setDefaultShiftIn(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white font-mono"
                />
              </div>

              <div>
                <span className="text-xs text-slate-500 block mb-1">Shift Out Time</span>
                <input
                  type="time"
                  required
                  value={defaultShiftOut}
                  onChange={(e) => setDefaultShiftOut(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white font-mono"
                />
              </div>
            </div>

            {/* Weekly Rest Days */}
            <div className="mt-3">
              <span className="text-xs text-slate-600 font-medium block mb-1.5">
                Default Rest Day(s) of Week:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {DAYS_OF_WEEK.map((d) => {
                  const isSelected = restDays.includes(d.value);
                  return (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => toggleRestDay(d.value)}
                      className={`px-3 py-1 text-xs rounded-md font-medium transition ${
                        isSelected
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {d.label} {isSelected && '✓'}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Compressed Workweek Guidelines Notice */}
          {scheduleType === 'Compressed' && (
            <div className="bg-purple-50/80 border border-purple-200 rounded-xl p-3 text-xs text-purple-950 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-purple-900">
                <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span>How Compressed Workweek (CWW) Works (DOLE Guidelines):</span>
              </div>
              <p className="text-[11px] text-purple-800 leading-relaxed">
                Under DOLE Department Advisory No. 02 (Series of 2004), the normal 40h or 48h workweek is compressed into fewer days (e.g. 4 days of 10h–12h). Work performed within the agreed daily duty hours ({dutyHours}h) is considered <strong>Regular Hours</strong> without overtime surcharge. Overtime only triggers when working <strong>beyond {dutyHours} hours</strong> or on designated rest days. Staff receive 2 to 3 consecutive rest days per week.
              </p>
            </div>
          )}

          {/* Sync to Ledger Checkbox */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 flex items-start gap-3">
            <input
              type="checkbox"
              id="syncLedger"
              checked={syncLedger}
              onChange={(e) => setSyncLedger(e.target.checked)}
              className="mt-0.5 rounded border-blue-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
            />
            <label htmlFor="syncLedger" className="text-xs text-blue-900 cursor-pointer">
              <span className="font-bold block">Apply & Update Ledger Records:</span>
              Immediately update all ledger days for this employee to match this schedule ({defaultShiftIn}–{defaultShiftOut}, {dutyHours} duty hrs/day) and assign rest days accordingly.
            </label>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center space-x-1.5 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm shadow-sm transition"
            >
              <Check className="w-4 h-4" />
              <span>{employeeToEdit ? 'Save Changes' : 'Register Employee'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
