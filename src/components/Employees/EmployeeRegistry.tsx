import React, { useState, useMemo } from 'react';
import {
  Search,
  UserPlus,
  Calendar,
  Edit2,
  Trash2,
  Filter,
  Sparkles,
  Building2,
  Briefcase,
  Landmark,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { Employee, TimekeepingDayRecord, TimekeepingSettings } from '../../types/timekeeping';
import { AddEditEmployeeModal } from './AddEditEmployeeModal';
import { SetScheduleModal } from './SetScheduleModal';
import { getNextSuggestedEmployeeNumber } from '../../services/storageService';

interface EmployeeRegistryProps {
  employees: Employee[];
  records: TimekeepingDayRecord[];
  settings: TimekeepingSettings;
  onSaveEmployee: (employee: Employee, syncLedger?: boolean) => void;
  onDeleteEmployee: (employeeId: string) => void;
  onApplySchedule: (
    employee: Employee,
    dates: string[],
    shiftIn: string,
    shiftOut: string,
    isDayOff: boolean
  ) => void;
}

export const EmployeeRegistry: React.FC<EmployeeRegistryProps> = ({
  employees,
  records,
  settings,
  onSaveEmployee,
  onDeleteEmployee,
  onApplySchedule,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedDeployment, setSelectedDeployment] = useState('ALL');

  // Modals state
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState<Employee | null>(null);

  const [isSetScheduleOpen, setIsSetScheduleOpen] = useState(false);
  const [employeeToSchedule, setEmployeeToSchedule] = useState<Employee | null>(null);

  // Auto-suggested next number
  const suggestedNumber = useMemo(() => {
    return getNextSuggestedEmployeeNumber(employees);
  }, [employees]);

  // Unique departments, statuses, deployments for filter dropdowns
  const departments = useMemo(() => {
    const set = new Set(employees.map((e) => e.department).filter(Boolean));
    return Array.from(set).sort();
  }, [employees]);

  const deployments = useMemo(() => {
    const set = new Set(employees.map((e) => e.deployment).filter(Boolean));
    return Array.from(set).sort();
  }, [employees]);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return employees.filter((emp) => {
      // Search across name, employee number, department, position
      const matchesSearch =
        !q ||
        emp.name.toLowerCase().includes(q) ||
        emp.employeeNumber.toLowerCase().includes(q) ||
        emp.department.toLowerCase().includes(q) ||
        emp.position.toLowerCase().includes(q);

      const matchesDept = selectedDept === 'ALL' || emp.department === selectedDept;
      const matchesStatus = selectedStatus === 'ALL' || emp.employmentStatus === selectedStatus;
      const matchesDeployment = selectedDeployment === 'ALL' || emp.deployment === selectedDeployment;

      return matchesSearch && matchesDept && matchesStatus && matchesDeployment;
    });
  }, [employees, searchQuery, selectedDept, selectedStatus, selectedDeployment]);

  const handleOpenAdd = () => {
    setEmployeeToEdit(null);
    setIsAddEditModalOpen(true);
  };

  const handleOpenEdit = (emp: Employee) => {
    setEmployeeToEdit(emp);
    setIsAddEditModalOpen(true);
  };

  const handleOpenSetSchedule = (emp: Employee) => {
    setEmployeeToSchedule(emp);
    setIsSetScheduleOpen(true);
  };

  const handleDelete = (emp: Employee) => {
    if (confirm(`Are you sure you want to remove ${emp.name} (Emp #${emp.employeeNumber})?`)) {
      onDeleteEmployee(emp.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top action bar and quick statistics */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Employee Registry</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                {employees.length} Registered
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Maintain personnel records, default shift schedules, payroll banks, and deployments.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <Sparkles className="w-3.5 h-3.5 text-blue-500 mr-1.5" />
              <span>Next Suggestion:</span>
              <span className="ml-1 font-mono font-bold text-blue-600 bg-white px-1.5 py-0.5 rounded border border-blue-200">
                {suggestedNumber}
              </span>
            </div>

            <button
              onClick={handleOpenAdd}
              className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm shadow-sm transition"
            >
              <UserPlus className="w-4 h-4" />
              <span>Register Employee</span>
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search box */}
          <div className="relative md:col-span-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search name, emp #, dept, position..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-slate-50/50"
            />
          </div>

          {/* Department Filter */}
          <div>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50/50 text-slate-700"
            >
              <option value="ALL">All Departments ({departments.length})</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Employment Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50/50 text-slate-700"
            >
              <option value="ALL">All Employment Statuses</option>
              <option value="Regular">Regular</option>
              <option value="Probationary">Probationary</option>
              <option value="Contractual">Contractual</option>
              <option value="Casual">Casual</option>
              <option value="Part-time">Part-time</option>
            </select>
          </div>

          {/* Deployment Location Filter */}
          <div>
            <select
              value={selectedDeployment}
              onChange={(e) => setSelectedDeployment(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50/50 text-slate-700"
            >
              <option value="ALL">All Deployment Locations</option>
              {deployments.map((dep) => (
                <option key={dep} value={dep}>
                  {dep}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Employee List Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Emp No</th>
                <th className="px-4 py-3">Employee Name</th>
                <th className="px-4 py-3">Department & Position</th>
                <th className="px-4 py-3">Deployment</th>
                <th className="px-4 py-3">Payroll Bank</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Default Shift</th>
                <th className="px-4 py-3">Duty Hrs</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                  {/* Number */}
                  <td className="px-4 py-3 font-mono font-bold text-blue-600 whitespace-nowrap">
                    #{emp.employeeNumber}
                  </td>

                  {/* Name */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="font-semibold text-slate-900">{emp.name}</div>
                    {emp.email && <div className="text-[10px] text-slate-400">{emp.email}</div>}
                  </td>

                  {/* Dept & Position */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-slate-800 font-medium">{emp.department}</div>
                    <div className="text-[11px] text-slate-500">{emp.position}</div>
                  </td>

                  {/* Deployment */}
                  <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                    <span className="inline-flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-slate-400" />
                      {emp.deployment}
                    </span>
                  </td>

                  {/* Bank */}
                  <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                    <span className="inline-flex items-center gap-1 font-mono text-[11px]">
                      <Landmark className="w-3 h-3 text-slate-400" />
                      {emp.bank}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        emp.employmentStatus === 'Regular'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : emp.employmentStatus === 'Probationary'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {emp.employmentStatus}
                    </span>
                  </td>

                  {/* Default Shift */}
                  <td className="px-4 py-3 whitespace-nowrap font-mono text-slate-700">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {emp.defaultShiftIn} - {emp.defaultShiftOut}
                    </span>
                    <span className="text-[10px] text-slate-400 block font-sans">
                      {emp.scheduleType}
                    </span>
                  </td>

                  {/* Duty Hours */}
                  <td className="px-4 py-3 whitespace-nowrap text-slate-700 font-mono">
                    {emp.dutyHours} hrs
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 whitespace-nowrap text-right space-x-1">
                    <button
                      onClick={() => handleOpenSetSchedule(emp)}
                      title="Set Schedule across date range"
                      className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition"
                    >
                      <Calendar className="w-3 h-3" />
                      <span>Set Schedule</span>
                    </button>

                    <button
                      onClick={() => handleOpenEdit(emp)}
                      title="Edit employee"
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDelete(emp)}
                      title="Remove employee"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}

              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                    No employees found matching the filters or search query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      <AddEditEmployeeModal
        isOpen={isAddEditModalOpen}
        onClose={() => setIsAddEditModalOpen(false)}
        onSave={onSaveEmployee}
        employeeToEdit={employeeToEdit}
        suggestedEmployeeNumber={suggestedNumber}
      />

      {/* Set Schedule Modal with live date preview */}
      <SetScheduleModal
        isOpen={isSetScheduleOpen}
        onClose={() => setIsSetScheduleOpen(false)}
        employee={employeeToSchedule}
        existingRecords={records}
        onApplySchedule={onApplySchedule}
      />
    </div>
  );
};
