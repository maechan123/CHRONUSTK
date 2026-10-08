import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Printer,
  Download,
  Calendar,
  Filter,
  Building2,
  Clock,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import {
  Employee,
  TimekeepingDayRecord,
  TimekeepingSettings,
} from '../../types/timekeeping';
import {
  formatDurationHms,
  getFortnightPresets,
} from '../../utils/timeCalculations';
import {
  computeEmployeeSummaryRows,
  exportToExcel,
  EmployeeSummaryRow,
} from '../../utils/exportHelpers';

interface SummaryReportProps {
  employees: Employee[];
  records: TimekeepingDayRecord[];
  settings: TimekeepingSettings;
  onUpdateSettings: (newSettings: TimekeepingSettings) => void;
}

export const SummaryReport: React.FC<SummaryReportProps> = ({
  employees,
  records,
  settings,
  onUpdateSettings,
}) => {
  // Determine full extent of ledger data by default
  const defaultExtents = useMemo(() => {
    if (records.length === 0) {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      return { start: `${y}-${m}-01`, end: `${y}-${m}-15` };
    }
    const dates = records.map((r) => r.date).sort();
    return {
      start: dates[0],
      end: dates[dates.length - 1],
    };
  }, [records]);

  const presets = useMemo(() => getFortnightPresets(), []);
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(-1); // Default to full extent
  const [startDate, setStartDate] = useState(defaultExtents.start);
  const [endDate, setEndDate] = useState(defaultExtents.end);

  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedDeployment, setSelectedDeployment] = useState('ALL');

  // Fortnight Preset selection
  const handleSelectPreset = (idx: number) => {
    setSelectedPresetIndex(idx);
    if (idx === -1) {
      // Full extent
      setStartDate(defaultExtents.start);
      setEndDate(defaultExtents.end);
    } else {
      const p = presets[idx];
      if (p) {
        setStartDate(p.startDate);
        setEndDate(p.endDate);
      }
    }
  };

  // Departments & Deployments
  const departments = useMemo(() => {
    return Array.from(new Set(employees.map((e) => e.department).filter(Boolean))).sort();
  }, [employees]);

  const deployments = useMemo(() => {
    return Array.from(new Set(employees.map((e) => e.deployment).filter(Boolean))).sort();
  }, [employees]);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchDept = selectedDept === 'ALL' || emp.department === selectedDept;
      const matchDep = selectedDeployment === 'ALL' || emp.deployment === selectedDeployment;
      return matchDept && matchDep;
    });
  }, [employees, selectedDept, selectedDeployment]);

  // Compute summary rows across the date range
  const summaryRows = useMemo(() => {
    return computeEmployeeSummaryRows(filteredEmployees, records, startDate, endDate);
  }, [filteredEmployees, records, startDate, endDate]);

  // Grand totals across all employees
  const grandTotals = useMemo(() => {
    let regularSeconds = 0;
    let lateSeconds = 0;
    let utSeconds = 0;
    let otSeconds = 0;
    let approvedOtSec = 0;
    let ndfSeconds = 0;
    let totalHoursToBePaidSec = 0;
    let daysPresent = 0;
    let daysAbsent = 0;

    let legalHolWorkedSec = 0;
    let legalHolUnworkedDays = 0;
    let specHolWorkedSec = 0;
    let specHolUnworkedDays = 0;

    let cancelOffRegSec = 0;
    let cancelOffHolSec = 0;

    let adjOtSec = 0;
    let adjLateSec = 0;
    let adjUtSec = 0;
    let adjNdfSec = 0;
    let daysAdj = 0;

    for (const r of summaryRows) {
      regularSeconds += r.regularSeconds;
      lateSeconds += r.lateSeconds;
      utSeconds += r.utSeconds;
      otSeconds += r.otSeconds;
      approvedOtSec += r.approvedOtSeconds;
      ndfSeconds += r.ndfSeconds;
      totalHoursToBePaidSec += r.totalHoursToBePaidSeconds;
      daysPresent += r.daysPresent;
      daysAbsent += r.daysAbsent;

      legalHolWorkedSec += r.legalHolidayWorkedSeconds;
      legalHolUnworkedDays += r.legalHolidayUnworkedDays;
      specHolWorkedSec += r.specialHolidayWorkedSeconds;
      specHolUnworkedDays += r.specialHolidayUnworkedDays;

      cancelOffRegSec += r.cancelledOffRegularSeconds;
      cancelOffHolSec += r.cancelledOffHolidaySeconds;

      adjOtSec += r.adjustedOtSeconds;
      adjLateSec += r.adjustedLateSeconds;
      adjUtSec += r.adjustedUtSeconds;
      adjNdfSec += r.adjustedNdfSeconds;
      daysAdj += r.daysAdjustment;
    }

    return {
      regularSeconds,
      lateSeconds,
      utSeconds,
      otSeconds,
      approvedOtSec,
      ndfSeconds,
      totalHoursToBePaidSec,
      daysPresent,
      daysAbsent,
      legalHolWorkedSec,
      legalHolUnworkedDays,
      specHolWorkedSec,
      specHolUnworkedDays,
      cancelOffRegSec,
      cancelOffHolSec,
      adjOtSec,
      adjLateSec,
      adjUtSec,
      adjNdfSec,
      daysAdj,
    };
  }, [summaryRows]);

  const handleExportExcel = () => {
    const periodLabel = `${startDate}_to_${endDate}`;
    exportToExcel(summaryRows, periodLabel, settings.companyName);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner and Filter Bar - hidden in print */}
      <div className="print:hidden bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-blue-600" />
              <span>Consolidated Payroll Sheet & Summary Report</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Comprehensive labor breakdown: Identity block, Holiday block, Cancelled-off block, and Adjustment block. Durations formatted in H:MM:SS.
            </p>
          </div>

          {/* Export Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition border border-slate-200"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Print / Export PDF</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="flex items-center space-x-1.5 px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition"
            >
              <Download className="w-4 h-4" />
              <span>Export to Excel (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Fortnight Presets */}
        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold text-slate-700 mr-1">Period Presets:</span>
            <button
              onClick={() => handleSelectPreset(-1)}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                selectedPresetIndex === -1
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              Full Ledger Extent ({defaultExtents.start} to {defaultExtents.end})
            </button>

            {presets.map((preset, idx) => (
              <button
                key={preset.label}
                onClick={() => handleSelectPreset(idx)}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  selectedPresetIndex === idx
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Configurable Late Grace Period Badge */}
          <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-slate-600 font-medium">Late Grace Period:</span>
            <select
              value={settings.lateGracePeriodMinutes}
              onChange={(e) =>
                onUpdateSettings({
                  ...settings,
                  lateGracePeriodMinutes: parseInt(e.target.value, 10),
                })
              }
              className="bg-white border border-slate-300 rounded text-xs font-bold text-blue-700 px-2 py-0.5"
            >
              <option value={0}>0 min (Strict)</option>
              <option value={5}>5 mins</option>
              <option value={10}>10 mins</option>
              <option value={15}>15 mins (Standard)</option>
              <option value={30}>30 mins</option>
            </select>
          </div>
        </div>

        {/* Date Range & Department Filter Row */}
        <div className="pt-2 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-slate-500">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setSelectedPresetIndex(-2);
              }}
              className="w-full px-2 py-1 border border-slate-200 rounded-lg bg-slate-50"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-slate-500">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setSelectedPresetIndex(-2);
              }}
              className="w-full px-2 py-1 border border-slate-200 rounded-lg bg-slate-50"
            />
          </div>

          <div>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-700"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedDeployment}
              onChange={(e) => setSelectedDeployment(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-700"
            >
              <option value="ALL">All Deployment Locations</option>
              {deployments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Printable Sheet View */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:border-none print:shadow-none p-6 space-y-6">
        {/* Official Header */}
        <div className="border-b border-slate-200 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight uppercase">
              {settings.companyName}
            </h1>
            <h2 className="text-sm font-semibold text-blue-700">
              Consolidated Payroll Timekeeping Summary Sheet
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Payroll Period: <strong className="text-slate-800">{startDate}</strong> to{' '}
              <strong className="text-slate-800">{endDate}</strong> • Grace Period: {settings.lateGracePeriodMinutes}m • NDF: 10PM–6AM
            </p>
          </div>

          <div className="text-xs text-slate-400 text-right print:block">
            <span>Generated: {new Date().toLocaleDateString()}</span>
            <div className="font-semibold text-slate-600">
              {summaryRows.length} Employee(s) Listed
            </div>
          </div>
        </div>

        {/* Consolidated Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs border border-slate-200">
            {/* Multi-tier Header */}
            <thead>
              {/* Grouping Headers */}
              <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider text-center divide-x divide-slate-200">
                <th colSpan={4} className="py-2 bg-slate-200 text-slate-900">
                  Identity Block
                </th>
                <th colSpan={7} className="py-2 bg-blue-100/80 text-blue-900">
                  Timekeeping Totals (H:MM:SS)
                </th>
                <th colSpan={4} className="py-2 bg-amber-100/70 text-amber-900">
                  Holiday Block
                </th>
                <th colSpan={2} className="py-2 bg-indigo-100/70 text-indigo-900">
                  Cancelled-Off Block
                </th>
                <th colSpan={5} className="py-2 bg-emerald-100/70 text-emerald-900">
                  Adjustment Block
                </th>
              </tr>

              {/* Individual Column Headers */}
              <tr className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] divide-x divide-slate-200 text-center">
                {/* Identity */}
                <th className="px-2 py-2 text-left">Emp No</th>
                <th className="px-2 py-2 text-left">Name</th>
                <th className="px-2 py-2 text-left">Dept & Position</th>
                <th className="px-2 py-2 text-left">Bank</th>

                {/* Timekeeping Totals */}
                <th className="px-2 py-2 text-center bg-blue-50/60 text-blue-900">Days Present</th>
                <th className="px-2 py-2 text-right">Regular Hrs</th>
                <th className="px-2 py-2 text-right">Late Hrs</th>
                <th className="px-2 py-2 text-right">Undertime (UT)</th>
                <th className="px-2 py-2 text-right">Approved/Adj OT</th>
                <th className="px-2 py-2 text-right text-indigo-900">NDF (10PM–6AM)</th>
                <th className="px-2 py-2 text-right bg-blue-100 text-blue-950 font-bold whitespace-nowrap">
                  TOTAL HOURS TO BE PAID
                </th>

                {/* Holiday */}
                <th className="px-2 py-2 text-right">Legal Worked</th>
                <th className="px-2 py-2 text-center">Legal Unworked</th>
                <th className="px-2 py-2 text-right">Special Worked</th>
                <th className="px-2 py-2 text-center">Special Unworked</th>

                {/* Cancelled Off */}
                <th className="px-2 py-2 text-right">Cancel-Off Reg</th>
                <th className="px-2 py-2 text-right">Cancel-Off Hol</th>

                {/* Adjustments */}
                <th className="px-2 py-2 text-right">Adj OT</th>
                <th className="px-2 py-2 text-right">Adj Late</th>
                <th className="px-2 py-2 text-right">Adj UT</th>
                <th className="px-2 py-2 text-right">Adj NDF</th>
                <th className="px-2 py-2 text-center">Days (+/-)</th>
              </tr>
            </thead>

            {/* Table Rows */}
            <tbody className="divide-y divide-slate-100 bg-white font-mono divide-x divide-slate-200">
              {summaryRows.map((row) => (
                <tr key={row.employeeNumber} className="hover:bg-slate-50">
                  {/* Identity */}
                  <td className="px-2 py-2 text-left font-bold text-blue-600">
                    #{row.employeeNumber}
                  </td>
                  <td className="px-2 py-2 text-left font-sans font-medium text-slate-900 whitespace-nowrap">
                    {row.name}
                  </td>
                  <td className="px-2 py-2 text-left font-sans text-slate-600 whitespace-nowrap">
                    <span className="font-medium text-slate-800">{row.department}</span>
                    <span className="text-[10px] text-slate-400 block">{row.position}</span>
                  </td>
                  <td className="px-2 py-2 text-left font-sans text-slate-600 whitespace-nowrap text-[11px]">
                    {row.bank}
                  </td>

                  {/* Timekeeping Block */}
                  <td className="px-2 py-2 text-center font-bold text-slate-800 bg-blue-50/30">
                    {row.daysPresent}d
                  </td>
                  <td className="px-2 py-2 text-right font-bold text-slate-900">
                    {formatDurationHms(row.regularSeconds)}
                  </td>
                  <td
                    className={`px-2 py-2 text-right ${
                      row.lateSeconds > 0 ? 'text-rose-600 font-bold bg-rose-50/50' : 'text-slate-400'
                    }`}
                  >
                    {formatDurationHms(row.lateSeconds)}
                  </td>
                  <td
                    className={`px-2 py-2 text-right ${
                      row.utSeconds > 0 ? 'text-rose-600 font-bold bg-rose-50/50' : 'text-slate-400'
                    }`}
                  >
                    {formatDurationHms(row.utSeconds)}
                  </td>
                  <td
                    className={`px-2 py-2 text-right ${
                      row.approvedOtSeconds > 0 ? 'text-emerald-700 font-semibold' : 'text-slate-400'
                    }`}
                    title="Approved / Adjusted OT applied to payable hours"
                  >
                    {formatDurationHms(row.approvedOtSeconds)}
                  </td>
                  <td
                    className={`px-2 py-2 text-right ${
                      row.ndfSeconds > 0 ? 'text-indigo-700 font-semibold' : 'text-slate-400'
                    }`}
                    title="Night Differential 10:00 PM - 6:00 AM"
                  >
                    {formatDurationHms(row.ndfSeconds)}
                  </td>
                  {/* TOTAL HOURS TO BE PAID = (REGULAR HRS + APPROVED/ADJUST OT - LATE HRS) */}
                  <td className="px-2 py-2 text-right font-mono font-bold text-blue-900 bg-blue-50/70 border-x-2 border-blue-200">
                    <div>{formatDurationHms(row.totalHoursToBePaidSeconds)}</div>
                    <div className="text-[9px] font-sans text-blue-600 font-normal">
                      {(row.totalHoursToBePaidSeconds / 3600).toFixed(2)}h
                    </div>
                  </td>

                  {/* Holiday Block */}
                  <td className="px-2 py-2 text-right text-slate-700">
                    {row.legalHolidayWorkedSeconds > 0
                      ? formatDurationHms(row.legalHolidayWorkedSeconds)
                      : '0:00:00'}
                  </td>
                  <td className="px-2 py-2 text-center text-slate-600">
                    {row.legalHolidayUnworkedDays > 0 ? `${row.legalHolidayUnworkedDays}d` : '-'}
                  </td>
                  <td className="px-2 py-2 text-right text-slate-700">
                    {row.specialHolidayWorkedSeconds > 0
                      ? formatDurationHms(row.specialHolidayWorkedSeconds)
                      : '0:00:00'}
                  </td>
                  <td className="px-2 py-2 text-center text-slate-600">
                    {row.specialHolidayUnworkedDays > 0 ? `${row.specialHolidayUnworkedDays}d` : '-'}
                  </td>

                  {/* Cancelled-Off Block */}
                  <td className="px-2 py-2 text-right text-slate-700">
                    {row.cancelledOffRegularSeconds > 0
                      ? formatDurationHms(row.cancelledOffRegularSeconds)
                      : '0:00:00'}
                  </td>
                  <td className="px-2 py-2 text-right text-slate-700">
                    {row.cancelledOffHolidaySeconds > 0
                      ? formatDurationHms(row.cancelledOffHolidaySeconds)
                      : '0:00:00'}
                  </td>

                  {/* Adjustment Block */}
                  <td className="px-2 py-2 text-right text-slate-700">
                    {row.adjustedOtSeconds !== 0 ? formatDurationHms(row.adjustedOtSeconds) : '-'}
                  </td>
                  <td className="px-2 py-2 text-right text-slate-700">
                    {row.adjustedLateSeconds !== 0 ? formatDurationHms(row.adjustedLateSeconds) : '-'}
                  </td>
                  <td className="px-2 py-2 text-right text-slate-700">
                    {row.adjustedUtSeconds !== 0 ? formatDurationHms(row.adjustedUtSeconds) : '-'}
                  </td>
                  <td className="px-2 py-2 text-right text-slate-700">
                    {row.adjustedNdfSeconds !== 0 ? formatDurationHms(row.adjustedNdfSeconds) : '-'}
                  </td>
                  <td className="px-2 py-2 text-center font-bold">
                    {row.daysAdjustment !== 0 ? (
                      <span className={row.daysAdjustment > 0 ? 'text-emerald-700' : 'text-rose-600'}>
                        {row.daysAdjustment > 0 ? `+${row.daysAdjustment}d` : `${row.daysAdjustment}d`}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                </tr>
              ))}

              {/* Grand Totals Summary Row */}
              <tr className="bg-slate-900 text-white font-bold divide-x divide-slate-800">
                <td colSpan={4} className="px-2 py-2.5 text-left font-sans uppercase tracking-wider text-[11px]">
                  Grand Totals ({summaryRows.length} Staff)
                </td>
                <td className="px-2 py-2.5 text-center text-white font-bold">
                  {grandTotals.daysPresent}d
                </td>
                <td className="px-2 py-2.5 text-right text-blue-400">
                  {formatDurationHms(grandTotals.regularSeconds)}
                </td>
                <td className="px-2 py-2.5 text-right text-rose-300">
                  {formatDurationHms(grandTotals.lateSeconds)}
                </td>
                <td className="px-2 py-2.5 text-right text-rose-300">
                  {formatDurationHms(grandTotals.utSeconds)}
                </td>
                <td className="px-2 py-2.5 text-right text-emerald-400">
                  {formatDurationHms(grandTotals.approvedOtSec)}
                </td>
                <td className="px-2 py-2.5 text-right text-indigo-300">
                  {formatDurationHms(grandTotals.ndfSeconds)}
                </td>
                <td className="px-2 py-2.5 text-right text-amber-300 font-extrabold bg-blue-950">
                  <div>{formatDurationHms(grandTotals.totalHoursToBePaidSec)}</div>
                  <div className="text-[9px] font-sans text-slate-300 font-normal">
                    {(grandTotals.totalHoursToBePaidSec / 3600).toFixed(2)}h
                  </div>
                </td>

                <td className="px-2 py-2.5 text-right">
                  {formatDurationHms(grandTotals.legalHolWorkedSec)}
                </td>
                <td className="px-2 py-2.5 text-center">
                  {grandTotals.legalHolUnworkedDays}d
                </td>
                <td className="px-2 py-2.5 text-right">
                  {formatDurationHms(grandTotals.specHolWorkedSec)}
                </td>
                <td className="px-2 py-2.5 text-center">
                  {grandTotals.specHolUnworkedDays}d
                </td>

                <td className="px-2 py-2.5 text-right">
                  {formatDurationHms(grandTotals.cancelOffRegSec)}
                </td>
                <td className="px-2 py-2.5 text-right">
                  {formatDurationHms(grandTotals.cancelOffHolSec)}
                </td>

                <td className="px-2 py-2.5 text-right">
                  {formatDurationHms(grandTotals.adjOtSec)}
                </td>
                <td className="px-2 py-2.5 text-right">
                  {formatDurationHms(grandTotals.adjLateSec)}
                </td>
                <td className="px-2 py-2.5 text-right">
                  {formatDurationHms(grandTotals.adjUtSec)}
                </td>
                <td className="px-2 py-2.5 text-right">
                  {formatDurationHms(grandTotals.adjNdfSec)}
                </td>
                <td className="px-2 py-2.5 text-center">
                  {grandTotals.daysAdj !== 0 ? `${grandTotals.daysAdj}d` : '-'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Corporate Sign-off Block for Audit & Payroll Approval */}
        <div className="pt-8 grid grid-cols-4 gap-6 text-xs text-slate-700">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-6">
              Prepared By:
            </span>
            <div className="border-b border-slate-300 pb-1 font-semibold text-slate-800">
              Karen Sophia Flores
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">HR & Payroll Specialist</span>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-6">
              Checked & Verified By:
            </span>
            <div className="border-b border-slate-300 pb-1 font-semibold text-slate-800">
              Finance & Accounting Head
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">Internal Audit & Timekeeping</span>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-6">
              Approved For Payout:
            </span>
            <div className="border-b border-slate-300 pb-1 font-semibold text-slate-800">
              General Manager / VP
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">Executive Management</span>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-6">
              Bank Endorsement:
            </span>
            <div className="border-b border-slate-300 pb-1 font-semibold text-slate-800">
              Disbursing Officer
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">Bank Advice Upload</span>
          </div>
        </div>
      </div>
    </div>
  );
};
