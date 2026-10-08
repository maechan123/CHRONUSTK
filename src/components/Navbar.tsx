import React from 'react';
import {
  Users,
  CalendarDays,
  UploadCloud,
  FileSpreadsheet,
  TrendingUp,
  Clock,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { TimekeepingSettings } from '../types/timekeeping';

export type ActiveTab = 'employees' | 'ledger' | 'import' | 'summary' | 'dashboard';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  settings: TimekeepingSettings;
  onOpenSettings: () => void;
  onResetData: () => void;
  employeeCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  settings,
  onOpenSettings,
  onResetData,
  employeeCount,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
      <div className="w-[1283px] max-w-full mx-auto px-4 sm:px-6 lg:px-8" style={{ width: '1283px' }}>
        <div className="flex items-center justify-between h-16">
          {/* Logo & App Info */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/30 text-white">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight text-white">ChronosLedger</span>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  ERP Timekeeping
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {settings.companyName} • {employeeCount} Staff Registered
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1 bg-slate-950/60 p-1.5 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('employees')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'employees'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/50'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Employees</span>
            </button>

            <button
              onClick={() => setActiveTab('ledger')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'ledger'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/50'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              <span>Timekeeping Ledger</span>
            </button>

            <button
              onClick={() => setActiveTab('import')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'import'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/50'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              <span>Biometric Import</span>
            </button>

            <button
              onClick={() => setActiveTab('summary')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'summary'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/50'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Summary Report</span>
            </button>

            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/50'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Trends</span>
            </button>
          </nav>

          {/* Quick Settings & Reset */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onOpenSettings}
              title="Configure Late Grace Period & Labor Rules"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Grace: {settings.lateGracePeriodMinutes}m</span>
              <span className="text-slate-400">| NDF: 10P-6A</span>
            </button>

            <button
              onClick={onResetData}
              title="Reset to Sample Hotel Attendance Data"
              className="p-2 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="flex md:hidden overflow-x-auto py-2 space-x-1 border-t border-slate-800 scrollbar-none">
          <button
            onClick={() => setActiveTab('employees')}
            className={`px-3 py-1 rounded text-xs whitespace-nowrap ${
              activeTab === 'employees' ? 'bg-blue-600 text-white' : 'text-slate-300'
            }`}
          >
            Employees
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-3 py-1 rounded text-xs whitespace-nowrap ${
              activeTab === 'ledger' ? 'bg-blue-600 text-white' : 'text-slate-300'
            }`}
          >
            Ledger
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`px-3 py-1 rounded text-xs whitespace-nowrap ${
              activeTab === 'import' ? 'bg-blue-600 text-white' : 'text-slate-300'
            }`}
          >
            Import
          </button>
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-3 py-1 rounded text-xs whitespace-nowrap ${
              activeTab === 'summary' ? 'bg-blue-600 text-white' : 'text-slate-300'
            }`}
          >
            Summary Report
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1 rounded text-xs whitespace-nowrap ${
              activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'text-slate-300'
            }`}
          >
            Trends
          </button>
        </div>
      </div>
    </header>
  );
};
