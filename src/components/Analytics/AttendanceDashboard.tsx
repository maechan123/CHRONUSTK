import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Clock,
  Users,
  AlertTriangle,
  Award,
  CheckCircle2,
  Calendar,
  Building2,
  BarChart3,
  Moon,
} from 'lucide-react';
import {
  Employee,
  TimekeepingDayRecord,
  TimekeepingSettings,
} from '../../types/timekeeping';
import {
  formatDurationHms,
  getFortnightPresets,
  secondsToDecimalHours,
} from '../../utils/timeCalculations';

interface AttendanceDashboardProps {
  employees: Employee[];
  records: TimekeepingDayRecord[];
  settings: TimekeepingSettings;
}

export const AttendanceDashboard: React.FC<AttendanceDashboardProps> = ({
  employees,
  records,
  settings,
}) => {
  const presets = useMemo(() => getFortnightPresets(), []);
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0);
  const [startDate, setStartDate] = useState(presets[0]?.startDate || '2026-10-01');
  const [endDate, setEndDate] = useState(presets[0]?.endDate || '2026-10-15');
  const [filterDept, setFilterDept] = useState('ALL');

  const handleSelectPreset = (idx: number) => {
    setSelectedPresetIndex(idx);
    const p = presets[idx];
    if (p) {
      setStartDate(p.startDate);
      setEndDate(p.endDate);
    }
  };

  const departments = useMemo(() => {
    return Array.from(new Set(employees.map((e) => e.department).filter(Boolean))).sort();
  }, [employees]);

  // Filter records within range and department
  const filteredRecords = useMemo(() => {
    const empMap = new Map(employees.map((e) => [e.id, e]));
    return records.filter((r) => {
      if (r.date < startDate || r.date > endDate) return false;
      if (filterDept !== 'ALL') {
        const emp = empMap.get(r.employeeId);
        if (!emp || emp.department !== filterDept) return false;
      }
      return true;
    });
  }, [records, employees, startDate, endDate, filterDept]);

  // High-level KPI aggregations
  const stats = useMemo(() => {
    let totalDutyDays = 0;
    let presentDays = 0;
    let absentDays = 0;
    let lateDays = 0;
    let utDays = 0;

    let regularSec = 0;
    let otSec = 0;
    let lateSec = 0;
    let utSec = 0;
    let ndfSec = 0;

    const empTally = new Map<
      string,
      {
        name: string;
        empNo: string;
        dept: string;
        present: number;
        lates: number;
        lateSec: number;
        otSec: number;
        ndfSec: number;
        scheduledDays: number;
      }
    >();

    for (const r of filteredRecords) {
      if (!r.isDayOff && r.dayType !== 'day_off') {
        totalDutyDays++;
      }

      if (r.isPresent) presentDays++;
      else if (r.isAbsent) absentDays++;

      if (r.isLate) lateDays++;
      if (r.isUndertime) utDays++;

      regularSec += r.regularSeconds || 0;
      otSec += r.otSeconds || 0;
      lateSec += r.lateSeconds || 0;
      utSec += r.utSeconds || 0;
      ndfSec += r.ndfSeconds || 0;

      // Employee level tallies
      const current = empTally.get(r.employeeId) || {
        name: r.employeeNumber,
        empNo: r.employeeNumber,
        dept: '',
        present: 0,
        lates: 0,
        lateSec: 0,
        otSec: 0,
        ndfSec: 0,
        scheduledDays: 0,
      };

      if (!r.isDayOff) current.scheduledDays++;
      if (r.isPresent) current.present++;
      if (r.isLate) {
        current.lates++;
        current.lateSec += r.lateSeconds || 0;
      }
      current.otSec += r.otSeconds || 0;
      current.ndfSec += r.ndfSeconds || 0;

      empTally.set(r.employeeId, current);
    }

    // Attach proper names
    for (const emp of employees) {
      const tally = empTally.get(emp.id);
      if (tally) {
        tally.name = emp.name;
        tally.dept = emp.department;
      }
    }

    const attendanceRate = totalDutyDays > 0 ? (presentDays / totalDutyDays) * 100 : 100;
    const onTimeRate = presentDays > 0 ? ((presentDays - lateDays) / presentDays) * 100 : 100;

    // Perfect attendance count (0 lates, 0 absents out of scheduled days)
    let perfectAttendanceCount = 0;
    empTally.forEach((t) => {
      if (t.scheduledDays > 0 && t.present === t.scheduledDays && t.lates === 0) {
        perfectAttendanceCount++;
      }
    });

    const empList = Array.from(empTally.values());
    const topOt = [...empList].sort((a, b) => b.otSec - a.otSec).slice(0, 5);
    const topLates = [...empList].sort((a, b) => b.lates - a.lates).slice(0, 5);

    return {
      attendanceRate: Math.round(attendanceRate * 10) / 10,
      onTimeRate: Math.round(onTimeRate * 10) / 10,
      presentDays,
      absentDays,
      lateDays,
      utDays,
      regularSec,
      otSec,
      lateSec,
      utSec,
      ndfSec,
      perfectAttendanceCount,
      topOt,
      topLates,
    };
  }, [filteredRecords, employees]);

  // Department comparative metrics
  const deptBreakdown = useMemo(() => {
    const map = new Map<
      string,
      {
        dept: string;
        present: number;
        lates: number;
        otSec: number;
        ndfSec: number;
        regularSec: number;
      }
    >();

    const empMap = new Map(employees.map((e) => [e.id, e]));

    for (const r of filteredRecords) {
      const emp = empMap.get(r.employeeId);
      const dept = emp?.department || 'Other';

      const d = map.get(dept) || {
        dept,
        present: 0,
        lates: 0,
        otSec: 0,
        ndfSec: 0,
        regularSec: 0,
      };

      if (r.isPresent) d.present++;
      if (r.isLate) d.lates++;
      d.otSec += r.otSeconds || 0;
      d.ndfSec += r.ndfSeconds || 0;
      d.regularSec += r.regularSeconds || 0;

      map.set(dept, d);
    }

    return Array.from(map.values()).sort((a, b) => b.present - a.present);
  }, [filteredRecords, employees]);

  // Daily timeline breakdown
  const dailyTimeline = useMemo(() => {
    const map = new Map<
      string,
      { date: string; present: number; lates: number; otHours: number; absents: number }
    >();

    for (const r of filteredRecords) {
      const d = map.get(r.date) || {
        date: r.date,
        present: 0,
        lates: 0,
        otHours: 0,
        absents: 0,
      };
      if (r.isPresent) d.present++;
      if (r.isLate) d.lates++;
      if (r.isAbsent) d.absents++;
      d.otHours += secondsToDecimalHours(r.otSeconds || 0);
      map.set(r.date, d);
    }

    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredRecords]);

  // Max value for daily bar scaling
  const maxDailyPresent = useMemo(() => {
    const vals = dailyTimeline.map((d) => d.present + d.absents);
    return Math.max(...vals, 1);
  }, [dailyTimeline]);

  return (
    <div className="space-y-6">
      {/* Top Banner and Filter Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <span>Attendance Trends & Punctuality Analytics</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Visual overview of on-time punctuality, overtime distribution, night shift differential utilization, and departmental compliance.
            </p>
          </div>

          {/* Department Filter */}
          <div className="flex items-center space-x-2">
            <Building2 className="w-4 h-4 text-slate-400" />
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold bg-slate-50 text-slate-700"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Fortnight Presets */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="font-semibold text-slate-700 mr-2 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> Period:
          </span>
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
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Attendance Rate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Attendance Rate
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {stats.attendanceRate}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {stats.presentDays} Present / {stats.absentDays} Absent
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(stats.attendanceRate, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* On-Time Punctuality */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              On-Time Rate
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-blue-600">
            {stats.onTimeRate}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {stats.lateDays} Late arrivals recorded
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-blue-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(stats.onTimeRate, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Overtime (OT) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Overtime
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold font-mono text-emerald-700">
            {formatDurationHms(stats.otSec)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {secondsToDecimalHours(stats.otSec)} decimal hours
          </div>
          <div className="mt-3 text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded inline-block">
            Duty + Approved OT
          </div>
        </div>

        {/* Night Diff (NDF) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Night Diff (NDF)
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Moon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold font-mono text-indigo-700">
            {formatDurationHms(stats.ndfSec)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            10:00 PM – 6:00 AM window
          </div>
          <div className="mt-3 text-[10px] text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded inline-block">
            +10% Labor standard
          </div>
        </div>

        {/* Perfect Attendance */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Perfect Attendance
            </span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-purple-700">
            {stats.perfectAttendanceCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Zero lates & zero absences
          </div>
          <div className="mt-3 text-[10px] text-purple-600 font-semibold bg-purple-50 px-2 py-0.5 rounded inline-block">
            Eligible for recognition
          </div>
        </div>
      </div>

      {/* Main Charts & Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Punch Timeline Volume Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                <span>Daily Attendance & Tardiness Progression</span>
              </h3>
              <p className="text-xs text-slate-500">
                Volume of staff present (green), tardy (red), and overtime hours
              </p>
            </div>
          </div>

          <div className="h-64 flex items-end gap-1.5 pt-6 border-b border-slate-100 overflow-x-auto pb-2">
            {dailyTimeline.map((item) => {
              const presentHeight = (item.present / maxDailyPresent) * 100;
              const lateHeight = item.present > 0 ? (item.lates / item.present) * 100 : 0;
              const dayStr = item.date.split('-')[2];

              return (
                <div
                  key={item.date}
                  className="flex-1 min-w-[28px] flex flex-col items-center group relative h-full justify-end"
                >
                  {/* Tooltip */}
                  <div className="absolute -top-12 bg-slate-900 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-20 shadow-md">
                    {item.date}: {item.present} Present ({item.lates} Late), {item.otHours.toFixed(1)}h OT
                  </div>

                  {/* Overtime indicator pill */}
                  {item.otHours > 0 && (
                    <span className="text-[9px] font-mono text-emerald-600 font-bold mb-1">
                      {item.otHours.toFixed(0)}h
                    </span>
                  )}

                  {/* Stacked bar */}
                  <div
                    className="w-full bg-slate-100 rounded-t-sm flex flex-col justify-end overflow-hidden"
                    style={{ height: `${Math.max(presentHeight, 8)}%` }}
                  >
                    {item.lates > 0 && (
                      <div
                        className="w-full bg-rose-500 transition-all"
                        style={{ height: `${lateHeight}%` }}
                      ></div>
                    )}
                    <div className="w-full bg-emerald-500 flex-1"></div>
                  </div>

                  <span className="text-[10px] font-mono text-slate-500 mt-2 block">
                    {dayStr}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-center space-x-6 text-xs text-slate-600 pt-2">
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-xs bg-emerald-500"></span>
              <span>On-Time Present</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-xs bg-rose-500"></span>
              <span>Late Arrivals</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="text-emerald-700 font-mono font-bold text-[11px]">Xh</span>
              <span>Overtime Hours</span>
            </div>
          </div>
        </div>

        {/* Department Comparison Bar Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span>Departmental Punctuality & Overtime</span>
              </h3>
              <p className="text-xs text-slate-500">
                Punctuality rate and total overtime load by department
              </p>
            </div>
          </div>

          <div className="space-y-3.5 pt-2 max-h-64 overflow-y-auto">
            {deptBreakdown.map((dept) => {
              const onTimeRate =
                dept.present > 0 ? Math.round(((dept.present - dept.lates) / dept.present) * 100) : 100;

              return (
                <div key={dept.dept} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">{dept.dept}</span>
                    <div className="flex items-center space-x-3 font-mono text-[11px]">
                      <span className="text-emerald-700 font-semibold">
                        OT: {formatDurationHms(dept.otSec)}
                      </span>
                      <span
                        className={`font-bold ${
                          onTimeRate < 80 ? 'text-rose-600' : 'text-blue-600'
                        }`}
                      >
                        {onTimeRate}% on-time
                      </span>
                    </div>
                  </div>

                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                    <div
                      className={`h-full ${
                        onTimeRate < 80 ? 'bg-rose-500' : 'bg-blue-600'
                      }`}
                      style={{ width: `${onTimeRate}%` }}
                    ></div>
                    <div
                      className="h-full bg-rose-300"
                      style={{ width: `${100 - onTimeRate}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top Overtime Leaders & Late Arrival Frequency Audit */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Overtime Leaders */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>Top Overtime (OT) Leaders</span>
            </h3>
            <span className="text-xs text-slate-400">Fatigue & Budget Tracking</span>
          </div>

          <div className="divide-y divide-slate-100">
            {stats.topOt.map((item, idx) => (
              <div key={item.empNo} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-3">
                  <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-700 font-bold flex items-center justify-center text-[10px]">
                    {idx + 1}
                  </span>
                  <div>
                    <span className="font-bold text-slate-900">{item.name}</span>
                    <span className="text-slate-400 ml-1.5 font-mono text-[11px]">
                      (#{item.empNo})
                    </span>
                    <div className="text-[11px] text-slate-500">{item.dept}</div>
                  </div>
                </div>

                <div className="text-right font-mono">
                  <span className="font-bold text-emerald-700 text-sm">
                    {formatDurationHms(item.otSec)}
                  </span>
                  <div className="text-[10px] text-indigo-600">
                    NDF: {formatDurationHms(item.ndfSec)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tardiness Audit */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Frequent Lateness / Tardiness Audit</span>
            </h3>
            <span className="text-xs text-slate-400">HR Coaching Intervention</span>
          </div>

          <div className="divide-y divide-slate-100">
            {stats.topLates.map((item, idx) => (
              <div key={item.empNo} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-3">
                  <span className="w-5 h-5 rounded-full bg-rose-50 text-rose-700 font-bold flex items-center justify-center text-[10px]">
                    {idx + 1}
                  </span>
                  <div>
                    <span className="font-bold text-slate-900">{item.name}</span>
                    <span className="text-slate-400 ml-1.5 font-mono text-[11px]">
                      (#{item.empNo})
                    </span>
                    <div className="text-[11px] text-slate-500">{item.dept}</div>
                  </div>
                </div>

                <div className="text-right font-mono">
                  <span
                    className={`font-bold ${
                      item.lates > 0 ? 'text-rose-600 text-sm' : 'text-slate-400'
                    }`}
                  >
                    {item.lates} {item.lates === 1 ? 'Incident' : 'Incidents'}
                  </span>
                  <div className="text-[10px] text-slate-500">
                    Lost: {formatDurationHms(item.lateSec)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
