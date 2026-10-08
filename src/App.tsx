import React, { useState, useEffect } from 'react';
import {
  loadSettings,
  saveSettings,
  loadEmployees,
  saveEmployees,
  loadRecords,
  saveRecords,
  resetToSampleData,
  applyScheduleRange,
  syncEmployeeLedgerRecords,
} from './services/storageService';
import {
  Employee,
  TimekeepingDayRecord,
  TimekeepingSettings,
} from './types/timekeeping';
import { recalculateDayRecord } from './utils/timeCalculations';
import { Navbar, ActiveTab } from './components/Navbar';
import { EmployeeRegistry } from './components/Employees/EmployeeRegistry';
import { TimekeepingLedger } from './components/Ledger/TimekeepingLedger';
import { BiometricImport } from './components/Import/BiometricImport';
import { SummaryReport } from './components/Summary/SummaryReport';
import { AttendanceDashboard } from './components/Analytics/AttendanceDashboard';
import { GracePeriodSettingsModal } from './components/Settings/GracePeriodSettingsModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('ledger');

  // Core state
  const [settings, setSettings] = useState<TimekeepingSettings>(loadSettings);
  const [employees, setEmployees] = useState<Employee[]>(loadEmployees);
  const [records, setRecords] = useState<TimekeepingDayRecord[]>(() =>
    loadRecords(employees, settings)
  );

  // Settings modal
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Auto-save on change
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    saveEmployees(employees);
  }, [employees]);

  useEffect(() => {
    saveRecords(records);
  }, [records]);

  // Recalculate records if settings change (e.g. grace period changed from 15m to 0m)
  const handleUpdateSettings = (newSettings: TimekeepingSettings) => {
    setSettings(newSettings);
    // Recalculate all records with new rules
    const empMap = new Map(employees.map((e) => [e.id, e]));
    const updated = records.map((r) => {
      const emp = empMap.get(r.employeeId);
      return recalculateDayRecord(r, newSettings, emp?.dutyHours || 8);
    });
    setRecords(updated);
  };

  // Reset to sample data
  const handleResetData = () => {
    if (
      confirm(
        'Reset all employees, biometric logs, and ledger entries back to standard hotel demonstration data?'
      )
    ) {
      const fresh = resetToSampleData();
      setEmployees(fresh.employees);
      setSettings(fresh.settings);
      setRecords(fresh.records);
    }
  };

  // Employee actions
  const handleSaveEmployee = (emp: Employee, syncLedger = true) => {
    const existingIndex = employees.findIndex((e) => e.id === emp.id);
    let updatedEmployees: Employee[];
    if (existingIndex >= 0) {
      updatedEmployees = [...employees];
      updatedEmployees[existingIndex] = emp;
    } else {
      updatedEmployees = [...employees, emp];
    }
    setEmployees(updatedEmployees);

    // Synchronize all existing ledger records to employee's new schedule & duty hours
    if (syncLedger) {
      const updatedRecords = syncEmployeeLedgerRecords(emp, records, settings);
      setRecords(updatedRecords);
    }
  };

  const handleSyncEmployeeLedger = (emp: Employee) => {
    const updatedRecords = syncEmployeeLedgerRecords(emp, records, settings);
    setRecords(updatedRecords);
  };

  const handleDeleteEmployee = (empId: string) => {
    setEmployees(employees.filter((e) => e.id !== empId));
    setRecords(records.filter((r) => r.employeeId !== empId));
  };

  // Bulk schedule update across date range
  const handleApplyScheduleRange = (
    employee: Employee,
    dates: string[],
    shiftIn: string,
    shiftOut: string,
    isDayOff: boolean
  ) => {
    const updated = applyScheduleRange(
      employee,
      dates,
      shiftIn,
      shiftOut,
      isDayOff,
      records,
      settings
    );
    setRecords(updated);
  };

  // Update a single day record from ledger
  const handleUpdateRecord = (updatedRecord: TimekeepingDayRecord) => {
    const index = records.findIndex((r) => r.id === updatedRecord.id);
    if (index >= 0) {
      const next = [...records];
      next[index] = updatedRecord;
      setRecords(next);
    } else {
      setRecords([...records, updatedRecord]);
    }
  };

  // Apply imported biometric records
  const handleApplyImportedRecords = (newRecords: TimekeepingDayRecord[]) => {
    const recordsMap = new Map<string, TimekeepingDayRecord>();
    for (const r of records) {
      recordsMap.set(r.id, r);
    }
    for (const nr of newRecords) {
      recordsMap.set(nr.id, nr);
    }
    setRecords(Array.from(recordsMap.values()));
    setActiveTab('ledger'); // Transition smoothly to ledger to see changes
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans antialiased selection:bg-blue-600 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        settings={settings}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onResetData={handleResetData}
        employeeCount={employees.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-[1290px] max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6" style={{ width: '1290px' }}>
        {activeTab === 'employees' && (
          <EmployeeRegistry
            employees={employees}
            records={records}
            settings={settings}
            onSaveEmployee={handleSaveEmployee}
            onDeleteEmployee={handleDeleteEmployee}
            onApplySchedule={handleApplyScheduleRange}
          />
        )}

        {activeTab === 'ledger' && (
          <TimekeepingLedger
            employees={employees}
            records={records}
            settings={settings}
            onUpdateRecord={handleUpdateRecord}
            onBatchUpdateRecords={handleApplyImportedRecords}
            onSyncEmployeeLedger={handleSyncEmployeeLedger}
          />
        )}

        {activeTab === 'import' && (
          <BiometricImport
            employees={employees}
            existingRecords={records}
            settings={settings}
            onApplyImportedRecords={handleApplyImportedRecords}
          />
        )}

        {activeTab === 'summary' && (
          <SummaryReport
            employees={employees}
            records={records}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
          />
        )}

        {activeTab === 'dashboard' && (
          <AttendanceDashboard
            employees={employees}
            records={records}
            settings={settings}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="print:hidden border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <strong>{settings.companyName}</strong> • Automated Labor Standard Timekeeping (Art. 86 NDF, Holiday & Overtime)
          </div>
          <div className="flex items-center space-x-3 text-slate-400">
            <span>H:MM:SS Standard Ledger</span>
            <span>•</span>
            <span>Active Grace Period: {settings.lateGracePeriodMinutes}m</span>
          </div>
        </div>
      </footer>

      {/* Settings Modal */}
      <GracePeriodSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={handleUpdateSettings}
      />
    </div>
  );
}
