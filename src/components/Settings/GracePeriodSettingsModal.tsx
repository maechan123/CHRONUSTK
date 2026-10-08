import React, { useState } from 'react';
import { X, Check, Clock, ShieldAlert, Building2 } from 'lucide-react';
import { TimekeepingSettings } from '../../types/timekeeping';

interface GracePeriodSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: TimekeepingSettings;
  onSave: (newSettings: TimekeepingSettings) => void;
}

export const GracePeriodSettingsModal: React.FC<GracePeriodSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
}) => {
  const [gracePeriod, setGracePeriod] = useState<number>(settings.lateGracePeriodMinutes);
  const [ndfStart, setNdfStart] = useState<number>(settings.ndfStartHour);
  const [ndfEnd, setNdfEnd] = useState<number>(settings.ndfEndHour);
  const [dutyHours, setDutyHours] = useState<number>(settings.defaultDutyHours);
  const [companyName, setCompanyName] = useState<string>(settings.companyName);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({
      lateGracePeriodMinutes: gracePeriod,
      ndfStartHour: ndfStart,
      ndfEndHour: ndfEnd,
      defaultDutyHours: dutyHours,
      companyName,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold text-lg">Timekeeping Rules & Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Company Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" /> Company / Entity Name
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              placeholder="e.g. Selah Hotels & Resorts"
            />
          </div>

          {/* Late Grace Period */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-start justify-between mb-2">
              <div>
                <label className="block text-sm font-semibold text-slate-800">
                  Late Grace Period
                </label>
                <p className="text-xs text-slate-500">
                  Tolerance window after scheduled shift-in before lateness is counted.
                </p>
              </div>
              <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                {gracePeriod} min
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2 mt-3">
              {[0, 5, 10, 15, 30].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setGracePeriod(mins)}
                  className={`py-1.5 text-xs font-semibold rounded-lg border transition ${
                    gracePeriod === mins
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {mins === 0 ? 'Strict 0m' : `${mins} mins`}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Standard: 15-minute grace period. If clock-in exceeds this, lateness is calculated from scheduled time.
            </p>
          </div>

          {/* NDF Window (Night Shift Differential) */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="w-4 h-4 text-indigo-600" />
              <label className="block text-sm font-semibold text-slate-800">
                Night Differential Factor (NDF) Window
              </label>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Mandatory night differential stretch. Philippine Labor Code Art. 86 prescribes 10:00 PM to 6:00 AM.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-slate-600 block mb-1">Start Time (24h)</span>
                <select
                  value={ndfStart}
                  onChange={(e) => setNdfStart(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value={20}>8:00 PM (20:00)</option>
                  <option value={21}>9:00 PM (21:00)</option>
                  <option value={22}>10:00 PM (22:00) [Standard]</option>
                  <option value={23}>11:00 PM (23:00)</option>
                </select>
              </div>

              <div>
                <span className="text-xs text-slate-600 block mb-1">End Time (24h)</span>
                <select
                  value={ndfEnd}
                  onChange={(e) => setNdfEnd(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value={5}>5:00 AM (05:00)</option>
                  <option value={6}>6:00 AM (06:00) [Standard]</option>
                  <option value={7}>7:00 AM (07:00)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Standard Duty Hours */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Default Daily Duty Hours
            </label>
            <select
              value={dutyHours}
              onChange={(e) => setDutyHours(parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
            >
              <option value={8}>8 Hours / day (Standard 40-48h workweek)</option>
              <option value={9}>9 Hours / day (Incl. 1h compressed)</option>
              <option value={4}>4 Hours / day (Part-time)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 px-6 py-4 bg-slate-50 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm shadow-sm transition"
          >
            <Check className="w-4 h-4" />
            <span>Apply & Recalculate</span>
          </button>
        </div>
      </div>
    </div>
  );
};
