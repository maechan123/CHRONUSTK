import React, { useState } from 'react';
import { X, Plus, Trash2, Check, AlertCircle, ShieldAlert } from 'lucide-react';
import {
  Adjustment,
  AdjustmentType,
  AdjustmentAction,
  TimekeepingDayRecord,
} from '../../types/timekeeping';
import { formatDurationHms } from '../../utils/timeCalculations';

interface AdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  dayRecord: TimekeepingDayRecord | null;
  onSaveAdjustments: (dayRecordId: string, adjustments: Adjustment[]) => void;
}

export const AdjustmentModal: React.FC<AdjustmentModalProps> = ({
  isOpen,
  onClose,
  dayRecord,
  onSaveAdjustments,
}) => {
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [newType, setNewType] = useState<AdjustmentType>('OT');
  const [newAction, setNewAction] = useState<AdjustmentAction>('payment');
  const [hours, setHours] = useState('1');
  const [minutes, setMinutes] = useState('0');
  const [daysValue, setDaysValue] = useState('1');
  const [remarks, setRemarks] = useState('');

  React.useEffect(() => {
    if (dayRecord) {
      setAdjustments(dayRecord.adjustments || []);
      setRemarks('');
      setHours('1');
      setMinutes('0');
    }
  }, [dayRecord, isOpen]);

  if (!isOpen || !dayRecord) return null;

  const handleAdd = () => {
    let durationSeconds = 0;
    if (newType !== 'Day') {
      const h = parseInt(hours, 10) || 0;
      const m = parseInt(minutes, 10) || 0;
      durationSeconds = h * 3600 + m * 60;
      if (durationSeconds <= 0) return;
    }

    const newAdj: Adjustment = {
      id: `adj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: newType,
      action: newAction,
      durationSeconds,
      daysValue: newType === 'Day' ? parseFloat(daysValue) || 1 : undefined,
      remarks: remarks.trim() || 'Manual adjustment',
      createdAt: new Date().toISOString(),
    };

    setAdjustments([...adjustments, newAdj]);
    setRemarks('');
  };

  const handleDelete = (id: string) => {
    setAdjustments(adjustments.filter((a) => a.id !== id));
  };

  const handleSave = () => {
    onSaveAdjustments(dayRecord.id, adjustments);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div>
            <h3 className="font-semibold text-lg">Day Adjustments & Corrections</h3>
            <p className="text-xs text-slate-300">
              Date: <span className="font-mono font-semibold">{dayRecord.date}</span> ({dayRecord.dayOfWeek}) • Emp #{dayRecord.employeeNumber}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Add Adjustment Form */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 block">
              Add New Adjustment Entry
            </span>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-600 block mb-1">Adjustment Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as AdjustmentType)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                >
                  <option value="OT">Overtime (OT)</option>
                  <option value="Late">Tardiness / Late</option>
                  <option value="UT">Undertime (UT)</option>
                  <option value="NDF">Night Differential (NDF)</option>
                  <option value="Day">Day Equivalent (Day)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-600 block mb-1">Action Impact</label>
                <select
                  value={newAction}
                  onChange={(e) => setNewAction(e.target.value as AdjustmentAction)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white font-semibold"
                >
                  <option value="payment" className="text-emerald-700">
                    Payment (+) Credit to Employee
                  </option>
                  <option value="deduct" className="text-rose-700">
                    Deduct (-) Payroll Charge
                  </option>
                </select>
              </div>
            </div>

            {/* Duration or Days input */}
            {newType !== 'Day' ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-600 block mb-1">Hours</label>
                  <input
                    type="number"
                    min="0"
                    max="24"
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600 block mb-1">Minutes</label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={minutes}
                    onChange={(e) => setMinutes(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="text-xs text-slate-600 block mb-1">Day Value</label>
                <input
                  type="number"
                  step="0.5"
                  value={daysValue}
                  onChange={(e) => setDaysValue(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  placeholder="e.g. 1.0 or 0.5"
                />
              </div>
            )}

            <div>
              <label className="text-xs text-slate-600 block mb-1">Remarks / Justification *</label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. Approved GM Memo, OB Pass #401, Biometric down correction"
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
              />
            </div>

            <button
              type="button"
              onClick={handleAdd}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Attach Adjustment</span>
            </button>
          </div>

          {/* Existing Adjustments Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Attached Adjustments ({adjustments.length})
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-48 overflow-y-auto">
              {adjustments.map((adj) => (
                <div key={adj.id} className="p-3 flex items-center justify-between bg-white text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">{adj.type}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          adj.action === 'payment'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {adj.action === 'payment' ? '+ Payment' : '- Deduct'}
                      </span>
                      <span className="font-mono font-medium text-slate-700">
                        {adj.type === 'Day'
                          ? `${adj.daysValue} Day(s)`
                          : formatDurationHms(adj.durationSeconds)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 italic">
                      "{adj.remarks || 'No remarks'}"
                    </p>
                  </div>

                  <button
                    onClick={() => handleDelete(adj.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {adjustments.length === 0 && (
                <div className="p-4 text-center text-slate-400 text-xs">
                  No adjustments attached to this date record.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 px-6 py-4 bg-slate-50 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center space-x-1.5 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm shadow-sm transition"
          >
            <Check className="w-4 h-4" />
            <span>Save Adjustments</span>
          </button>
        </div>
      </div>
    </div>
  );
};
