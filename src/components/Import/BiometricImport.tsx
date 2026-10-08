import React, { useState, useMemo } from 'react';
import {
  UploadCloud,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Sparkles,
  RefreshCw,
  Clock,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import {
  Employee,
  TimekeepingDayRecord,
  TimekeepingSettings,
  BiometricImportResult,
} from '../../types/timekeeping';
import { parseBiometricText } from '../../utils/biometricParser';
import { formatDurationHms } from '../../utils/timeCalculations';
import { SAMPLE_BIOMETRIC_FILE_CONTENT } from '../../utils/sampleData';

interface BiometricImportProps {
  employees: Employee[];
  existingRecords: TimekeepingDayRecord[];
  settings: TimekeepingSettings;
  onApplyImportedRecords: (newRecords: TimekeepingDayRecord[]) => void;
}

export const BiometricImport: React.FC<BiometricImportProps> = ({
  employees,
  existingRecords,
  settings,
  onApplyImportedRecords,
}) => {
  const [rawText, setRawText] = useState('');
  const [fileName, setFileName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<BiometricImportResult | null>(null);
  const [showProblemsOnly, setShowProblemsOnly] = useState(false);
  const [appliedSuccess, setAppliedSuccess] = useState(false);
  const [syncWithProfile, setSyncWithProfile] = useState(true);

  // Map of existing records for lookup
  const existingRecordsMap = useMemo(() => {
    const map = new Map<string, TimekeepingDayRecord>();
    for (const r of existingRecords) {
      map.set(r.id, r);
    }
    return map;
  }, [existingRecords]);

  // Handle file drop or selection
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setAppliedSuccess(false);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setRawText(text);
      processText(text);
    };
    reader.readAsText(file);
  };

  const handleLoadSample = () => {
    setFileName('sample_biometric_october.dat');
    setRawText(SAMPLE_BIOMETRIC_FILE_CONTENT);
    setAppliedSuccess(false);
    processText(SAMPLE_BIOMETRIC_FILE_CONTENT);
  };

  const processText = (text: string, forceSync = syncWithProfile) => {
    if (!text.trim()) {
      setImportResult(null);
      return;
    }
    setIsProcessing(true);
    setTimeout(() => {
      const result = parseBiometricText(text, employees, settings, existingRecordsMap, forceSync);
      setImportResult(result);
      setIsProcessing(false);
    }, 100);
  };

  const handleApplyToLedger = () => {
    if (!importResult || importResult.previewRecords.length === 0) return;
    onApplyImportedRecords(importResult.previewRecords);
    setAppliedSuccess(true);
  };

  // Filter preview records for problem days if toggle is active
  const displayedRecords = useMemo(() => {
    if (!importResult) return [];
    if (!showProblemsOnly) return importResult.previewRecords;
    return importResult.previewRecords.filter(
      (r) => r.isAbsent || r.isLate || r.isUndertime || r.isNoIn || r.isNoOut
    );
  }, [importResult, showProblemsOnly]);

  return (
    <div className="space-y-6">
      {/* Top Banner & File Uploader */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-blue-600" />
              <span>Biometric Punch Import (.dat / .txt)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Supports standard ZKTeco, Realand, Anviz biometric raw time-logs. Automatically matches registered employee numbers, applies First-In / Last-Out chronological pairing, and filters out unregistered punches.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleLoadSample}
              className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 transition shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Load Sample Biometric .dat</span>
            </button>
          </div>
        </div>

        {/* Upload Zone */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* File drag/drop box */}
          <label className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer bg-slate-50/50 hover:bg-blue-50/20 transition group text-center">
            <UploadCloud className="w-8 h-8 text-slate-400 group-hover:text-blue-600 mb-2 transition" />
            <span className="text-xs font-semibold text-slate-800">
              {fileName ? fileName : 'Click to browse or drop biometric .dat / .txt'}
            </span>
            <span className="text-[11px] text-slate-500 mt-1">
              Plain text or tab-delimited attendance files
            </span>
            <input
              type="file"
              accept=".dat,.txt,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {/* Raw Text Paste Box */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Or Paste Raw Biometric Data
              </span>
              {rawText && (
                <button
                  onClick={() => {
                    setRawText('');
                    setImportResult(null);
                    setFileName('');
                  }}
                  className="text-[11px] text-slate-400 hover:text-rose-600"
                >
                  Clear
                </button>
              )}
            </div>
            <textarea
              rows={4}
              value={rawText}
              onChange={(e) => {
                setRawText(e.target.value);
                setAppliedSuccess(false);
                processText(e.target.value);
              }}
              placeholder={`1001   2026-10-16 05:54:10   1\n1001   2026-10-16 15:05:42   1\n1002   2026-10-16 21:55:00   1`}
              className="w-full flex-1 px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Import Dashboard & Metrics */}
      {importResult && (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                Total Lines
              </span>
              <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">
                {importResult.totalLines}
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                Valid Punches
              </span>
              <span className="text-xl font-bold font-mono text-blue-600 mt-1 block">
                {importResult.validPunches}
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 block">
                Matched (Saved)
              </span>
              <span className="text-xl font-bold font-mono text-emerald-700 mt-1 block">
                {importResult.matchedPunches}
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                Skipped (Unmatched)
              </span>
              <span
                className={`text-xl font-bold font-mono mt-1 block ${
                  importResult.unmatchedPunches > 0 ? 'text-amber-600' : 'text-slate-400'
                }`}
              >
                {importResult.unmatchedPunches}
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                Staff Affected
              </span>
              <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">
                {importResult.affectedEmployees.length}
              </span>
            </div>

            <div
              className={`p-4 rounded-xl border shadow-xs ${
                importResult.problemDaysCount > 0
                  ? 'bg-rose-50 border-rose-200'
                  : 'bg-white border-slate-200'
              }`}
            >
              <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-700 block">
                Problem Days
              </span>
              <span className="text-xl font-bold font-mono text-rose-700 mt-1 block">
                {importResult.problemDaysCount}
              </span>
            </div>
          </div>

          {/* Unmatched skipped alert if any */}
          {importResult.unmatchedEmployeeNumbers.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">
                  Skipped Punches for Unregistered Staff Numbers:
                </span>
                <p className="mt-0.5 text-amber-800">
                  The following biometric employee IDs were not found in your Employee Registry and were skipped per policy:
                  {' '}<span className="font-mono font-bold">{importResult.unmatchedEmployeeNumbers.join(', ')}</span>.
                </p>
              </div>
            </div>
          )}

          {/* Review Table Header with Problem Filter & Apply Action */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center space-x-2 cursor-pointer bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 transition">
                <input
                  type="checkbox"
                  checked={showProblemsOnly}
                  onChange={(e) => setShowProblemsOnly(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-rose-700">
                  Filter Problem Days Only ({importResult.problemDaysCount})
                </span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer bg-blue-50/80 hover:bg-blue-100/80 px-3 py-1.5 rounded-xl border border-blue-200 text-xs font-semibold text-blue-900 transition">
                <input
                  type="checkbox"
                  checked={syncWithProfile}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setSyncWithProfile(checked);
                    processText(rawText, checked);
                  }}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <span>Sync with Employee Schedule (Compressed / Shifting / Fixed)</span>
              </label>

              <span className="text-xs text-slate-500">
                Showing {displayedRecords.length} of {importResult.previewRecords.length} day records
              </span>
            </div>

            <div className="flex items-center space-x-3">
              {appliedSuccess ? (
                <div className="flex items-center space-x-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Successfully Applied to Timekeeping Ledger!</span>
                </div>
              ) : (
                <button
                  onClick={handleApplyToLedger}
                  disabled={importResult.previewRecords.length === 0}
                  className="flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50"
                >
                  <span>Apply {importResult.previewRecords.length} Records to Ledger</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Preview Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase font-semibold">
                  <tr>
                    <th className="px-3 py-2.5 text-left">Emp No & Name</th>
                    <th className="px-3 py-2.5 text-left">Date / Day</th>
                    <th className="px-3 py-2.5 text-left">Schedule</th>
                    <th className="px-3 py-2.5 text-center">First In</th>
                    <th className="px-3 py-2.5 text-center">Last Out</th>
                    <th className="px-3 py-2.5 text-right">Regular</th>
                    <th className="px-3 py-2.5 text-right">Late</th>
                    <th className="px-3 py-2.5 text-right">UT</th>
                    <th className="px-3 py-2.5 text-right">OT</th>
                    <th className="px-3 py-2.5 text-right">NDF</th>
                    <th className="px-3 py-2.5 text-left">Issue Audit Flags</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {displayedRecords.map((r) => {
                    const emp = employees.find((e) => e.id === r.employeeId);
                    const hasIssues =
                      r.isAbsent || r.isLate || r.isUndertime || r.isNoIn || r.isNoOut;

                    return (
                      <tr
                        key={`${r.employeeId}-${r.date}`}
                        className={
                          hasIssues
                            ? 'bg-rose-50/80 border-l-4 border-l-rose-500'
                            : 'hover:bg-slate-50'
                        }
                      >
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-mono font-bold text-blue-600">
                              #{r.employeeNumber}
                            </span>
                            <span className="font-medium text-slate-900">
                              {emp?.name || 'Unknown'}
                            </span>
                          </div>
                          {emp && (
                            <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <span
                                className={`px-1 rounded font-semibold ${
                                  emp.scheduleType === 'Compressed'
                                    ? 'bg-purple-100 text-purple-800'
                                    : emp.scheduleType === 'Shifting'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {emp.scheduleType} ({emp.dutyHours}h)
                              </span>
                              <span>• {emp.department}</span>
                            </div>
                          )}
                        </td>

                        <td className="px-3 py-2 whitespace-nowrap font-mono text-slate-700">
                          {r.date}{' '}
                          <span className="font-sans text-[11px] text-slate-400">
                            ({r.dayOfWeek})
                          </span>
                        </td>

                        <td className="px-3 py-2 whitespace-nowrap font-mono text-slate-600">
                          {r.isDayOff ? 'Rest Day' : `${r.scheduleIn} - ${r.scheduleOut}`}
                        </td>

                        <td className="px-3 py-2 whitespace-nowrap text-center font-mono">
                          {r.isAbsent ? (
                            <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded border border-rose-300">
                              ABSENT
                            </span>
                          ) : r.isNoIn ? (
                            <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded border border-rose-300">
                              NO IN
                            </span>
                          ) : (
                            <span className={r.isLate ? 'text-rose-600 font-bold' : 'text-slate-800'}>
                              {r.time1In || '--:--'}
                            </span>
                          )}
                        </td>

                        <td className="px-3 py-2 whitespace-nowrap text-center font-mono">
                          {r.isAbsent ? (
                            <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded border border-rose-300">
                              ABSENT
                            </span>
                          ) : r.isNoOut ? (
                            <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded border border-rose-300">
                              NO OUT
                            </span>
                          ) : (
                            <span
                              className={r.isUndertime ? 'text-rose-600 font-bold' : 'text-slate-800'}
                            >
                              {r.time2Out || r.time1Out || '--:--'}
                            </span>
                          )}
                        </td>

                        <td className="px-3 py-2 whitespace-nowrap text-right font-mono font-medium text-slate-800">
                          {formatDurationHms(r.regularSeconds)}
                        </td>

                        <td className="px-3 py-2 whitespace-nowrap text-right font-mono">
                          {r.lateSeconds > 0 ? (
                            <span className="font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded border border-rose-200">
                              {formatDurationHms(r.lateSeconds)}
                            </span>
                          ) : (
                            <span className="text-slate-300">0:00:00</span>
                          )}
                        </td>

                        <td className="px-3 py-2 whitespace-nowrap text-right font-mono">
                          {r.utSeconds > 0 ? (
                            <span className="font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded border border-rose-200">
                              {formatDurationHms(r.utSeconds)}
                            </span>
                          ) : (
                            <span className="text-slate-300">0:00:00</span>
                          )}
                        </td>

                        <td className="px-3 py-2 whitespace-nowrap text-right font-mono text-emerald-700">
                          {r.otSeconds > 0 ? formatDurationHms(r.otSeconds) : '0:00:00'}
                        </td>

                        <td className="px-3 py-2 whitespace-nowrap text-right font-mono text-indigo-700">
                          {r.ndfSeconds > 0 ? formatDurationHms(r.ndfSeconds) : '0:00:00'}
                        </td>

                        <td className="px-3 py-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {r.isAbsent && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-600 text-white tracking-wider shadow-xs">
                                ABSENT
                              </span>
                            )}
                            {r.isNoIn && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-600 text-white tracking-wider shadow-xs">
                                NO IN
                              </span>
                            )}
                            {r.isNoOut && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-600 text-white tracking-wider shadow-xs">
                                NO OUT
                              </span>
                            )}
                            {r.isUndertime && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-600 text-white tracking-wider shadow-xs">
                                UNDERTIME
                              </span>
                            )}
                            {r.isLate && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-600 text-white tracking-wider shadow-xs">
                                LATE
                              </span>
                            )}
                            {!hasIssues && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800">
                                Clean ✓
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {displayedRecords.length === 0 && (
                    <tr>
                      <td colSpan={11} className="px-4 py-8 text-center text-slate-400">
                        {showProblemsOnly
                          ? 'No problem days found! All punches are clean.'
                          : 'No preview records.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
