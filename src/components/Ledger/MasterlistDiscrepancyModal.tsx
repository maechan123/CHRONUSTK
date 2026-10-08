import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  X,
  Search,
  CheckCircle2,
  Calendar,
  ArrowRight,
  Filter,
  Download,
  AlertCircle,
  Clock,
  Printer,
} from 'lucide-react';
import { Employee, TimekeepingDayRecord } from '../../types/timekeeping';

interface MasterlistDiscrepancyModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  records: TimekeepingDayRecord[];
  startDate: string;
  endDate: string;
  onSelectEmployee: (employeeId: string) => void;
}

export interface EmployeeDiscrepancyAudit {
  employee: Employee;
  noInCount: number;
  noOutCount: number;
  totalMissingPunches: number;
  absentCount: number;
  lateCount: number;
  undertimeCount: number;
  totalWorkedDays: number;
  flaggedDays: {
    date: string;
    dayOfWeek: string;
    isNoIn: boolean;
    isNoOut: boolean;
    isAbsent: boolean;
    remarks?: string;
  }[];
  isHabitual: boolean; // >= 2 missing punches
}

export const MasterlistDiscrepancyModal: React.FC<MasterlistDiscrepancyModalProps> = ({
  isOpen,
  onClose,
  employees,
  records,
  startDate,
  endDate,
  onSelectEmployee,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'flagged' | 'habitual'>('flagged');
  const [selectedDept, setSelectedDept] = useState('ALL');

  // Compute audit records for each employee across selected date range
  const auditList = useMemo(() => {
    return employees.map((emp) => {
      const empRecords = records.filter(
        (r) => r.employeeId === emp.id && r.date >= startDate && r.date <= endDate
      );

      let noInCount = 0;
      let noOutCount = 0;
      let absentCount = 0;
      let lateCount = 0;
      let undertimeCount = 0;
      let totalWorkedDays = 0;
      const flaggedDays: EmployeeDiscrepancyAudit['flaggedDays'] = [];

      for (const r of empRecords) {
        if (!r.isDayOff && r.dayType !== 'day_off') {
          totalWorkedDays++;
          if (r.isNoIn) noInCount++;
          if (r.isNoOut) noOutCount++;
          if (r.isAbsent) absentCount++;
          if (r.isLate) lateCount++;
          if (r.isUndertime) undertimeCount++;

          if (r.isNoIn || r.isNoOut || r.isAbsent) {
            flaggedDays.push({
              date: r.date,
              dayOfWeek: r.dayOfWeek,
              isNoIn: !!r.isNoIn,
              isNoOut: !!r.isNoOut,
              isAbsent: !!r.isAbsent,
              remarks: r.remarks,
            });
          }
        }
      }

      const totalMissingPunches = noInCount + noOutCount;
      const isHabitual = totalMissingPunches >= 2;

      return {
        employee: emp,
        noInCount,
        noOutCount,
        totalMissingPunches,
        absentCount,
        lateCount,
        undertimeCount,
        totalWorkedDays,
        flaggedDays,
        isHabitual,
      };
    });
  }, [employees, records, startDate, endDate]);

  // Aggregate KPIs
  const totalEmployees = employees.length;
  const staffWithMissingPunches = auditList.filter((a) => a.totalMissingPunches > 0);
  const habitualNonBioStaff = auditList.filter((a) => a.isHabitual);
  const totalNoInIncidents = auditList.reduce((acc, a) => acc + a.noInCount, 0);
  const totalNoOutIncidents = auditList.reduce((acc, a) => acc + a.noOutCount, 0);

  // Departments list
  const departments = useMemo(() => {
    return Array.from(new Set(employees.map((e) => e.department).filter(Boolean))).sort();
  }, [employees]);

  // Filtered list
  const filteredList = useMemo(() => {
    return auditList.filter((item) => {
      // Filter tab
      if (filterMode === 'flagged' && item.totalMissingPunches === 0) return false;
      if (filterMode === 'habitual' && !item.isHabitual) return false;

      // Department filter
      if (selectedDept !== 'ALL' && item.employee.department !== selectedDept) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = item.employee.name.toLowerCase().includes(q);
        const matchNum = item.employee.employeeNumber.toLowerCase().includes(q);
        const matchDept = item.employee.department.toLowerCase().includes(q);
        const matchPos = item.employee.position.toLowerCase().includes(q);
        const matchIssue =
          (q === 'no in' && item.noInCount > 0) ||
          (q === 'no out' && item.noOutCount > 0) ||
          (q === 'missing' && item.totalMissingPunches > 0) ||
          (q === 'habitual' && item.isHabitual);

        return matchName || matchNum || matchDept || matchPos || matchIssue;
      }

      return true;
    });
  }, [auditList, filterMode, selectedDept, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-5 flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Masterlist Biometric Discrepancy Auditor
                </h3>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-rose-500/30 text-rose-300 border border-rose-500/40">
                  Salary Risk Audit
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Cutoff Period: <span className="font-mono text-blue-300 font-semibold">{startDate}</span> to <span className="font-mono text-blue-300 font-semibold">{endDate}</span> • Real-time detection of No-In / No-Out to avoid payroll discrepancies
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Close Auditor"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Audit Stats KPI Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 border-b border-slate-200">
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 block">Total Staff Audited</span>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <span className="text-xl font-bold text-slate-800">{totalEmployees}</span>
              <span className="text-xs text-slate-400">employees</span>
            </div>
          </div>

          <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-amber-800 block">Staff with Missing Punches</span>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <span className="text-xl font-extrabold text-amber-700">{staffWithMissingPunches.length}</span>
              <span className="text-xs text-amber-600 font-medium">({Math.round((staffWithMissingPunches.length / (totalEmployees || 1)) * 100)}%)</span>
            </div>
          </div>

          <div className="bg-rose-50/70 p-3 rounded-xl border border-rose-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-rose-800 block">🚨 Habitual Non-Bio Staff (≥2)</span>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <span className="text-xl font-extrabold text-rose-700">{habitualNonBioStaff.length}</span>
              <span className="text-xs text-rose-600 font-medium">require HR memo</span>
            </div>
          </div>

          <div className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-indigo-800 block">Total Missing Punch Logs</span>
            <div className="flex items-baseline space-x-2 mt-0.5">
              <span className="text-xl font-extrabold text-indigo-700">
                {totalNoInIncidents + totalNoOutIncidents}
              </span>
              <span className="text-[11px] text-slate-600 font-mono">
                ({totalNoInIncidents} No-In / {totalNoOutIncidents} No-Out)
              </span>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setFilterMode('flagged')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                filterMode === 'flagged'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Flagged with Missing Punches ({staffWithMissingPunches.length})</span>
            </button>

            <button
              onClick={() => setFilterMode('habitual')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                filterMode === 'habitual'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Habitual Non-Bio Staff ({habitualNonBioStaff.length})</span>
            </button>

            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <span>All Masterlist Staff ({totalEmployees})</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            {/* Department dropdown */}
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-700"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            {/* Search Input */}
            <div className="relative w-52 sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search staff, dept, 'no in'..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Audit Results Table */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs divide-y divide-slate-200">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[10px] tracking-wider">
                <tr>
                  <th className="px-3 py-2.5">Employee Masterlist Info</th>
                  <th className="px-3 py-2.5 text-center">Biometric Status</th>
                  <th className="px-3 py-2.5 text-center">Missing In / Out</th>
                  <th className="px-3 py-2.5">Specific Flagged Dates &amp; Notes</th>
                  <th className="px-3 py-2.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredList.map((item) => {
                  const hasDiscrepancy = item.totalMissingPunches > 0;
                  return (
                    <tr
                      key={item.employee.id}
                      className={`hover:bg-slate-50 transition ${
                        item.isHabitual
                          ? 'bg-rose-50/40'
                          : hasDiscrepancy
                          ? 'bg-amber-50/30'
                          : ''
                      }`}
                    >
                      {/* Employee Info */}
                      <td className="px-3 py-3">
                        <div className="flex items-center space-x-2.5">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                              item.isHabitual
                                ? 'bg-rose-600 text-white'
                                : hasDiscrepancy
                                ? 'bg-amber-500 text-white'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {item.employee.name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center space-x-1.5">
                              <span className="font-bold text-slate-900 text-xs">
                                {item.employee.name}
                              </span>
                              <span className="font-mono text-[11px] font-bold text-blue-600">
                                #{item.employee.employeeNumber}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {item.employee.department} • {item.employee.position} ({item.employee.deployment})
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Biometric Status */}
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        {item.isHabitual ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-black bg-rose-600 text-white shadow-2xs tracking-wide">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                            🚨 HABITUAL NON-BIO ({item.totalMissingPunches})
                          </span>
                        ) : hasDiscrepancy ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                            ⚠️ {item.totalMissingPunches} Missing Punch{item.totalMissingPunches > 1 ? 'es' : ''}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            100% Bio Compliant
                          </span>
                        )}
                      </td>

                      {/* Missing In / Out count */}
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5 font-mono text-[11px]">
                          <span
                            className={`px-1.5 py-0.5 rounded font-bold ${
                              item.noInCount > 0
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'text-slate-400 bg-slate-50'
                            }`}
                            title={`${item.noInCount} No-In punch(es)`}
                          >
                            {item.noInCount} No-In
                          </span>
                          <span className="text-slate-300">/</span>
                          <span
                            className={`px-1.5 py-0.5 rounded font-bold ${
                              item.noOutCount > 0
                                ? 'bg-rose-100 text-rose-900 border border-rose-300'
                                : 'text-slate-400 bg-slate-50'
                            }`}
                            title={`${item.noOutCount} No-Out punch(es)`}
                          >
                            {item.noOutCount} No-Out
                          </span>
                        </div>
                      </td>

                      {/* Specific Flagged Days */}
                      <td className="px-3 py-3">
                        {item.flaggedDays.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-md">
                            {item.flaggedDays.map((fd, i) => (
                              <div
                                key={i}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-mono flex items-center gap-1 border ${
                                  fd.isNoIn
                                    ? 'bg-amber-50 text-amber-900 border-amber-300'
                                    : fd.isNoOut
                                    ? 'bg-rose-50 text-rose-900 border-rose-300'
                                    : 'bg-slate-50 text-slate-700 border-slate-200'
                                }`}
                                title={fd.remarks || `${fd.date} has missing punch`}
                              >
                                <span className="font-bold">{fd.date.slice(5)} ({fd.dayOfWeek}):</span>
                                <span className="font-extrabold uppercase">
                                  {fd.isNoIn ? 'No-In' : fd.isNoOut ? 'No-Out' : 'Absent'}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">
                            All scheduled shifts logged in biometrics correctly.
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            onSelectEmployee(item.employee.id);
                            onClose();
                          }}
                          className="inline-flex items-center space-x-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
                          title="Open this employee's ledger to inspect or fix punches"
                        >
                          <span>Open Ledger</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {filteredList.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-xs">
                      No employees match your search criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="text-slate-600 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <span>
              <strong>Tip for HR:</strong> Missing punches left unverified cause automated undertime calculations or salary disputes. Click <strong>Open Ledger</strong> to edit biometric punches or record supervisor adjustments.
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition cursor-pointer"
          >
            Close Auditor
          </button>
        </div>
      </div>
    </div>
  );
};
