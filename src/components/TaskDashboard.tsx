import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Lock,
  ArrowUpDown,
  BookOpen,
  Clock,
  Sparkles,
  Layers,
  ShieldCheck,
  MoreVertical,
  Edit2,
  Key,
  Copy,
  Trash2,
  Download,
  Coins,
  CheckCircle2,
  TrendingDown,
  Smartphone,
  Users,
  Receipt,
  ArrowRight,
  Unlock,
} from 'lucide-react';
import { TaskSummary, TaskSortOption, CurrencyConfig } from '../types';
import { formatCurrency } from '../lib/exportUtils';

interface TaskDashboardProps {
  tasks: TaskSummary[];
  currency: CurrencyConfig;
  onOpenCreateModal: () => void;
  onSelectTask: (task: TaskSummary) => void;
  onRenameTask: (task: TaskSummary) => void;
  onChangePassword: (task: TaskSummary) => void;
  onDuplicateTask: (task: TaskSummary) => void;
  onDeleteTask: (task: TaskSummary) => void;
  onExportCSVQuick: (task: TaskSummary) => void;
  hasPwaInstallPrompt?: boolean;
  onTriggerInstall?: () => void;
}

export function formatRelativeDate(dateString: string): string {
  if (!dateString) return 'Never';
  const d = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHours < 24) return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export const TaskDashboard: React.FC<TaskDashboardProps> = ({
  tasks,
  currency,
  onOpenCreateModal,
  onSelectTask,
  onRenameTask,
  onChangePassword,
  onDuplicateTask,
  onDeleteTask,
  onExportCSVQuick,
  hasPwaInstallPrompt,
  onTriggerInstall,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<TaskSortOption>('updated_desc');
  const [activeMenuTaskId, setActiveMenuTaskId] = useState<string | null>(null);

  // Filtered & Sorted Khatas
  const filteredTasks = useMemo(() => {
    return tasks
      .filter((t) => t.task_name.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => {
        if (sortBy === 'updated_desc') {
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        }
        if (sortBy === 'updated_asc') {
          return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
        }
        if (sortBy === 'name_asc') {
          return a.task_name.localeCompare(b.task_name);
        }
        if (sortBy === 'name_desc') {
          return b.task_name.localeCompare(a.task_name);
        }
        if (sortBy === 'total_desc') {
          return (b.grand_total || 0) - (a.grand_total || 0);
        }
        if (sortBy === 'records_desc') {
          return (b.record_count || 0) - (a.record_count || 0);
        }
        return 0;
      });
  }, [tasks, searchQuery, sortBy]);

  // Overall Statistics across all Khatas
  const totalTasks = tasks.length;
  const totalRecords = tasks.reduce((sum, t) => sum + (t.record_count || 0), 0);
  const totalLedgerValue = tasks.reduce((sum, t) => sum + (t.grand_total || 0), 0);
  const totalPaidValue = tasks.reduce((sum, t) => sum + (t.total_paid || 0), 0);
  const totalRemainingValue = tasks.reduce((sum, t) => sum + (t.total_remaining || 0), 0);

  return (
    <div id="tasks-dashboard-container" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-[#e5e5e5]">
      {/* Top Banner / Hero */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[#0d0d0d] border border-[#262626] rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-xs font-semibold text-emerald-400 mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Digital Business Tasks &amp; Ledgers</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Your Business Tasks, Organized Digitally.
          </h1>
          <p className="text-xs sm:text-sm text-[#888] mt-1.5 max-w-xl leading-relaxed">
            Manage customer accounts, sales, payments, and outstanding balances across your business task spreadsheets.
          </p>
        </div>

        {/* Primary Action Button */}
        <div className="flex items-center space-x-3 shrink-0 relative z-10">
          {hasPwaInstallPrompt && onTriggerInstall && (
            <button
              onClick={onTriggerInstall}
              className="flex items-center space-x-2 px-4 py-3 rounded-xl bg-[#171717] hover:bg-[#222] border border-emerald-800/60 text-emerald-400 font-semibold text-xs transition-colors cursor-pointer"
            >
              <Smartphone className="w-4 h-4" />
              <span>Install App</span>
            </button>
          )}

          <button
            id="create-task-primary-btn"
            onClick={onOpenCreateModal}
            className="flex items-center space-x-2 px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-xl shadow-emerald-950/50 transition-all duration-150 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ Create New Task</span>
          </button>
        </div>
      </div>

      {/* Summary Statistics Dashboard */}
      {totalTasks > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Invoiced */}
          <div className="p-5 rounded-2xl bg-[#111111] border border-[#262626] shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] text-[#737373] uppercase tracking-wider mb-1 font-semibold">
                Total Sales / Invoiced
              </p>
              <p id="dashboard-total-invoiced" className="text-xl sm:text-2xl font-bold text-white tabular-nums">
                {formatCurrency(totalLedgerValue, currency.symbol)}
              </p>
              <p className="text-[11px] text-[#737373] mt-0.5">
                Across {totalTasks} {totalTasks === 1 ? 'Task' : 'Tasks'}
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-[#171717] border border-[#262626] flex items-center justify-center text-[#737373]">
              <Coins className="w-5 h-5" />
            </div>
          </div>

          {/* Total Paid */}
          <div className="p-5 rounded-2xl bg-[#111111] border border-emerald-900/40 shadow-sm flex items-center justify-between relative overflow-hidden">
            <div>
              <p className="text-[10px] text-emerald-500 uppercase tracking-wider mb-1 font-semibold">
                Total Received / Paid
              </p>
              <p id="dashboard-total-paid" className="text-xl sm:text-2xl font-bold text-emerald-400 tabular-nums">
                {formatCurrency(totalPaidValue, currency.symbol)}
              </p>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <span className="text-[11px] text-emerald-400/80">
                  {totalLedgerValue > 0 ? `${Math.round((totalPaidValue / totalLedgerValue) * 100)}% collected` : '0% collected'}
                </span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-950/40 border border-emerald-900/50 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          {/* Total Remaining */}
          <div className="p-5 rounded-2xl bg-[#111111] border border-rose-900/40 shadow-sm flex items-center justify-between relative overflow-hidden">
            <div>
              <p className="text-[10px] text-rose-400 uppercase tracking-wider mb-1 font-semibold">
                Outstanding Balance
              </p>
              <p id="dashboard-total-remaining" className="text-xl sm:text-2xl font-bold text-rose-400 tabular-nums">
                {formatCurrency(totalRemainingValue, currency.symbol)}
              </p>
              <p className="text-[11px] text-rose-400/80 mt-0.5">
                {totalRemainingValue > 0 ? 'Pending recovery' : 'All accounts settled'}
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-rose-950/40 border border-rose-900/50 flex items-center justify-center text-rose-400">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>

          {/* Total Task Records */}
          <div className="p-5 rounded-2xl bg-[#111111] border border-[#262626] shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] text-[#737373] uppercase tracking-wider mb-1 font-semibold">
                Total Task Records
              </p>
              <p className="text-xl sm:text-2xl font-bold text-[#e5e5e5]">
                {totalRecords}
              </p>
              <p className="text-[11px] text-[#737373] mt-0.5">
                In {totalTasks} {totalTasks === 1 ? 'task spreadsheet' : 'task spreadsheets'}
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-[#171717] border border-[#262626] flex items-center justify-center text-[#737373]">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* Control Bar: Search & Sort */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center space-x-2">
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center space-x-2">
            <span>My Tasks</span>
          </h2>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#171717] border border-[#262626] text-emerald-400">
            {tasks.length}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-[#525252] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="search-tasks-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="w-full pl-8 pr-3.5 py-2 text-xs rounded-xl bg-[#171717] border border-[#262626] text-[#e5e5e5] placeholder-[#525252] focus:outline-none focus:border-emerald-600 transition-colors"
            />
          </div>

          {/* Sort Dropdown */}
          <div className="relative inline-flex items-center">
            <ArrowUpDown className="w-3.5 h-3.5 text-[#737373] absolute left-2.5 pointer-events-none" />
            <select
              id="sort-tasks-select"
              aria-label="Sort tasks by"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as TaskSortOption)}
              className="pl-7 pr-3 py-2 text-xs font-medium bg-[#171717] hover:bg-[#222] text-[#a3a3a3] hover:text-[#e5e5e5] rounded-xl border border-[#262626] focus:outline-none focus:border-emerald-600 cursor-pointer transition-colors"
            >
              <option value="updated_desc" className="bg-[#171717] text-[#e5e5e5]">Recently Updated</option>
              <option value="updated_asc" className="bg-[#171717] text-[#e5e5e5]">Oldest Updated</option>
              <option value="name_asc" className="bg-[#171717] text-[#e5e5e5]">Task Name (A-Z)</option>
              <option value="name_desc" className="bg-[#171717] text-[#e5e5e5]">Task Name (Z-A)</option>
              <option value="total_desc" className="bg-[#171717] text-[#e5e5e5]">Highest Sales</option>
              <option value="records_desc" className="bg-[#171717] text-[#e5e5e5]">Most Entries</option>
            </select>
          </div>
        </div>
      </div>

      {/* Task Cards Grid */}
      {filteredTasks.length > 0 ? (
        <div id="tasks-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTasks.map((task) => {
            const grandVal = task.grand_total || 0;
            const paidVal = task.total_paid || 0;
            const remainingVal = task.total_remaining ?? Math.max(0, grandVal - paidVal);
            const isSettled = remainingVal === 0 && grandVal > 0;

            return (
              <div
                key={task.id}
                id={`task-card-${task.id}`}
                onClick={() => onSelectTask(task)}
                className="group relative rounded-2xl bg-[#111111] border border-[#262626] hover:border-emerald-600/70 p-5 shadow-lg hover:bg-[#141414] hover:shadow-emerald-950/20 transition-all duration-200 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  {/* Card Header: Book icon, Protected status, & 3-dot Menu */}
                  <div className="flex items-center justify-between mb-3.5">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 flex items-center justify-center">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      {task.is_protected ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-950/40 text-amber-400 border border-amber-800/50">
                          <Lock className="w-2.5 h-2.5" />
                          <span>Protected</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#171717] text-[#737373] border border-[#262626]">
                          <span>Open</span>
                        </span>
                      )}
                      {isSettled && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                          ALL PAID
                        </span>
                      )}
                    </div>

                    {/* 3-dots Context Menu */}
                    <div
                      className="relative"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      <button
                        id={`task-menu-btn-${task.id}`}
                        aria-label="Task options menu"
                        onClick={() =>
                          setActiveMenuTaskId(activeMenuTaskId === task.id ? null : task.id)
                        }
                        className="p-1.5 rounded-lg text-[#737373] hover:text-[#e5e5e5] hover:bg-[#1f1f1f] transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {activeMenuTaskId === task.id && (
                        <div
                          id={`task-context-menu-${task.id}`}
                          className="absolute right-0 top-8 z-20 w-48 bg-[#171717] rounded-xl shadow-2xl border border-[#262626] py-1.5 animate-in fade-in zoom-in-95 duration-100"
                          onMouseLeave={() => setActiveMenuTaskId(null)}
                        >
                          <button
                            onClick={() => {
                              setActiveMenuTaskId(null);
                              onSelectTask(task);
                            }}
                            className="w-full px-3.5 py-2 text-left text-xs font-semibold text-[#e5e5e5] hover:bg-[#222] flex items-center space-x-2"
                          >
                            <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Open Task</span>
                          </button>
                          <button
                            onClick={() => {
                              setActiveMenuTaskId(null);
                              onRenameTask(task);
                            }}
                            className="w-full px-3.5 py-2 text-left text-xs font-medium text-[#a3a3a3] hover:text-[#e5e5e5] hover:bg-[#222] flex items-center space-x-2"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-[#737373]" />
                            <span>Rename Task</span>
                          </button>
                          <button
                            onClick={() => {
                              setActiveMenuTaskId(null);
                              onChangePassword(task);
                            }}
                            className="w-full px-3.5 py-2 text-left text-xs font-medium text-[#a3a3a3] hover:text-[#e5e5e5] hover:bg-[#222] flex items-center space-x-2"
                          >
                            <Key className="w-3.5 h-3.5 text-[#737373]" />
                            <span>Change Password</span>
                          </button>
                          <button
                            onClick={() => {
                              setActiveMenuTaskId(null);
                              onDuplicateTask(task);
                            }}
                            className="w-full px-3.5 py-2 text-left text-xs font-medium text-[#a3a3a3] hover:text-[#e5e5e5] hover:bg-[#222] flex items-center space-x-2"
                          >
                            <Copy className="w-3.5 h-3.5 text-[#737373]" />
                            <span>Duplicate Task</span>
                          </button>
                          <button
                            onClick={() => {
                              setActiveMenuTaskId(null);
                              onExportCSVQuick(task);
                            }}
                            className="w-full px-3.5 py-2 text-left text-xs font-medium text-[#a3a3a3] hover:text-[#e5e5e5] hover:bg-[#222] flex items-center space-x-2"
                          >
                            <Download className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Export (CSV)</span>
                          </button>
                          <div className="my-1 border-t border-[#262626]" />
                          <button
                            onClick={() => {
                              setActiveMenuTaskId(null);
                              onDeleteTask(task);
                            }}
                            className="w-full px-3.5 py-2 text-left text-xs font-medium text-rose-400 hover:bg-rose-950/40 flex items-center space-x-2"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                            <span>Delete Task</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Task Name */}
                  <h3 className="text-base font-bold text-[#e5e5e5] group-hover:text-emerald-400 transition-colors line-clamp-1">
                    {task.task_name}
                  </h3>

                  {/* Financial Stats Details */}
                  <div className="mt-3.5 space-y-1.5 text-xs bg-[#0a0a0a]/50 p-3 rounded-xl border border-[#222]">
                    <div className="flex items-center justify-between">
                      <span className="text-[#737373]">Total Sales:</span>
                      <span className="font-bold text-white tabular-nums">
                        {formatCurrency(grandVal, currency.symbol)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-emerald-400">
                      <span className="text-[11px] text-emerald-500/80 font-medium">Received:</span>
                      <span className="font-semibold font-mono tabular-nums">
                        {formatCurrency(paidVal, currency.symbol)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-rose-400">
                      <span className="text-[11px] text-rose-500/80 font-medium">Outstanding:</span>
                      <span className="font-bold font-mono tabular-nums">
                        {formatCurrency(remainingVal, currency.symbol)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Footer: Last Updated & Entries Count */}
                <div className="mt-4 pt-3 border-t border-[#262626] flex items-center justify-between text-[11px]">
                  <span className="flex items-center space-x-1 text-[#737373]">
                    <Clock className="w-3 h-3 text-[#525252]" />
                    <span>{formatRelativeDate(task.updated_at)}</span>
                  </span>
                  <span className="font-bold text-emerald-400 group-hover:text-emerald-300 flex items-center space-x-1 transition-colors">
                    <span>{task.record_count} {task.record_count === 1 ? 'Entry' : 'Entries'}</span>
                    <ArrowRight className="w-3.5 h-3.5 inline ml-0.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : tasks.length > 0 ? (
        /* Search has 0 results */
        <div className="text-center py-16 bg-[#0d0d0d] rounded-2xl border border-[#262626] p-8">
          <Search className="w-8 h-8 text-[#525252] mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-[#e5e5e5]">
            No matching tasks found
          </h3>
          <p className="text-xs text-[#737373] mt-1">
            Try adjusting your search terms or filter criteria.
          </p>
          <button
            onClick={() => setSearchQuery('')}
            className="mt-4 px-4 py-2 text-xs font-semibold rounded-lg bg-[#171717] hover:bg-[#222] text-[#e5e5e5] border border-[#262626] transition-colors"
          >
            Clear Search
          </button>
        </div>
      ) : (
        /* Empty State */
        <div
          id="dashboard-empty-state"
          className="text-center py-20 px-4 bg-[#0d0d0d] rounded-3xl border border-[#262626] shadow-xl"
        >
          <div className="w-16 h-16 rounded-2xl bg-emerald-950/40 border border-emerald-800/50 text-emerald-400 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white">
            No Tasks Yet
          </h3>
          <p className="text-xs sm:text-sm text-[#737373] mt-1.5 max-w-sm mx-auto leading-relaxed">
            Create your first task spreadsheet and start organizing customer accounts, sales, and payments.
          </p>
          <button
            id="empty-state-create-btn"
            onClick={onOpenCreateModal}
            className="mt-6 inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-xl shadow-emerald-950/50 transition-all transform hover:-translate-y-0.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ Create New Task</span>
          </button>
        </div>
      )}
    </div>
  );
};
