import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  Lock,
  Plus,
  Search,
  Download,
  FileText,
  Printer,
  Settings,
  Edit3,
  KeyRound,
  Copy,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Hash,
  Coins,
  Package,
  Layers,
  Sparkles,
  LayoutGrid,
  Table as TableIcon,
  Users,
  CreditCard,
  DollarSign,
  TrendingDown,
  ArrowUpRight,
  Filter,
  Check,
  ChevronDown,
} from 'lucide-react';
import {
  TaskSummary,
  TaskRecord,
  CurrencyConfig,
  AutoSaveStatus,
  PaymentStatus,
  normalizePaymentStatus,
  calculateRemainingAmount,
  CustomerKhataSummary,
} from '../types';
import { LedgerTable } from './LedgerTable';
import { formatCurrency, exportToCSV, exportToPDF } from '../lib/exportUtils';

interface LedgerViewProps {
  task: TaskSummary;
  initialRecords: TaskRecord[];
  currency: CurrencyConfig;
  onBack: () => void;
  onLockTask: () => void;
  onSaveRecords: (records: TaskRecord[]) => Promise<void>;
  onRenameTask: () => void;
  onChangePassword: () => void;
  onDuplicateTask: () => void;
  onDeleteTask: () => void;
}

export const LedgerView: React.FC<LedgerViewProps> = ({
  task,
  initialRecords,
  currency,
  onBack,
  onLockTask,
  onSaveRecords,
  onRenameTask,
  onChangePassword,
  onDuplicateTask,
  onDeleteTask,
}) => {
  const [records, setRecords] = useState<TaskRecord[]>(initialRecords);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'UNPAID'>('ALL');
  const [activeTab, setActiveTab] = useState<'records' | 'khata'>('records');
  const [saveStatus, setSaveStatus] = useState<AutoSaveStatus>('saved');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  // Sync initial records if prop updates
  useEffect(() => {
    setRecords(initialRecords);
  }, [initialRecords]);

  // Debounced Auto-Save
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerAutoSave = useCallback(
    (updatedRecords: TaskRecord[]) => {
      setSaveStatus('saving');
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          await onSaveRecords(updatedRecords);
          setSaveStatus('saved');
        } catch (err) {
          console.error('Auto-save error:', err);
          setSaveStatus('error');
        }
      }, 500);
    },
    [onSaveRecords]
  );

  // Add Row
  const handleAddRow = (prefillCustomer = '') => {
    const newRow: TaskRecord = {
      id: 'row_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36),
      task_id: task.id,
      customer_name: prefillCustomer || '',
      item: '',
      quantity: 1,
      price: 0,
      total: 0,
      paid_amount: 0,
      remaining_amount: 0,
      payment_status: 'UNPAID',
      date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      order_index: records.length,
    };
    const updated = [...records, newRow];
    setRecords(updated);
    triggerAutoSave(updated);
  };

  // Change field in a row with dynamic auto-calculation of Total and Remaining ONLY
  const handleChangeRecord = (index: number, field: keyof TaskRecord, value: any) => {
    const updated = [...records];
    const item = { ...updated[index] };

    if (field === 'quantity') {
      const qty = parseFloat(value) || 0;
      item.quantity = qty;
      item.total = Math.round(qty * item.price * 100) / 100;
      item.remaining_amount = calculateRemainingAmount(item.total, item.paid_amount);
      // USER-CONTROLLED: Never overwrite item.payment_status!
    } else if (field === 'price') {
      const prc = parseFloat(value) || 0;
      item.price = prc;
      item.total = Math.round(item.quantity * prc * 100) / 100;
      item.remaining_amount = calculateRemainingAmount(item.total, item.paid_amount);
      // USER-CONTROLLED: Never overwrite item.payment_status!
    } else if (field === 'paid_amount') {
      const paid = parseFloat(value) || 0;
      item.paid_amount = paid;
      item.remaining_amount = calculateRemainingAmount(item.total, paid);
      // USER-CONTROLLED: Never overwrite item.payment_status!
    } else if (field === 'payment_status') {
      // Strictly user chosen
      item.payment_status = normalizePaymentStatus(value);
    } else {
      (item as any)[field] = value;
    }

    updated[index] = item;
    setRecords(updated);
    triggerAutoSave(updated);
  };

  // Delete row
  const handleDeleteRecord = (index: number) => {
    const updated = records.filter((_, idx) => idx !== index);
    setRecords(updated);
    triggerAutoSave(updated);
  };

  // Duplicate row
  const handleDuplicateRecord = (index: number) => {
    const source = records[index];
    const duplicate: TaskRecord = {
      ...source,
      id: 'row_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36),
      order_index: records.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const updated = [...records.slice(0, index + 1), duplicate, ...records.slice(index + 1)];
    setRecords(updated);
    triggerAutoSave(updated);
  };

  // Move row
  const handleMoveRecord = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === records.length - 1) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const updated = [...records];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    setRecords(updated);
    triggerAutoSave(updated);
  };

  // Filtered records for search and status
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Status filter
      if (statusFilter !== 'ALL') {
        const itemStatus = r.payment_status === 'PAID' ? 'PAID' : 'UNPAID';
        if (itemStatus !== statusFilter) return false;
      }

      // Search query filter
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        (r.customer_name || '').toLowerCase().includes(query) ||
        (r.item || '').toLowerCase().includes(query) ||
        (r.date || '').toLowerCase().includes(query)
      );
    });
  }, [records, searchQuery, statusFilter]);

  // Grand Totals & Payment Metrics
  const totalRecordCount = records.length;
  const grandTotal = records.reduce((sum, r) => sum + (Number(r.total) || 0), 0);
  const totalPaid = records.reduce((sum, r) => sum + (Number(r.paid_amount) || 0), 0);
  const totalRemaining = records.reduce(
    (sum, r) => sum + (Number(r.remaining_amount ?? Math.max(0, (r.total || 0) - (r.paid_amount || 0)))),
    0
  );
  const paidCount = records.filter((r) => r.payment_status === 'PAID').length;
  const unpaidCount = records.filter((r) => r.payment_status !== 'PAID').length;

  // Customer Khata Ledger Aggregation
  const customerKhatas = useMemo(() => {
    const map = new Map<string, TaskRecord[]>();
    for (const r of records) {
      const name = (r.customer_name || '').trim();
      const key = name ? name : 'Unnamed Customer';
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(r);
    }

    const summaries: CustomerKhataSummary[] = [];
    map.forEach((customerRecords, customerName) => {
      const custTotal = customerRecords.reduce((sum, r) => sum + (Number(r.total) || 0), 0);
      const custPaid = customerRecords.reduce((sum, r) => sum + (Number(r.paid_amount) || 0), 0);
      const custRemaining = customerRecords.reduce(
        (sum, r) => sum + (Number(r.remaining_amount ?? Math.max(0, (r.total || 0) - (r.paid_amount || 0)))),
        0
      );

      const custPaidCount = customerRecords.filter((r) => r.payment_status === 'PAID').length;
      const custUnpaidCount = customerRecords.filter((r) => r.payment_status !== 'PAID').length;

      summaries.push({
        customer_name: customerName,
        total_amount: custTotal,
        total_paid: custPaid,
        total_remaining: custRemaining,
        transaction_count: customerRecords.length,
        paid_count: custPaidCount,
        unpaid_count: custUnpaidCount,
        records: customerRecords,
      });
    });

    // Sort by total remaining descending, then total amount
    return summaries.sort((a, b) => b.total_remaining - a.total_remaining || b.total_amount - a.total_amount);
  }, [records]);

  // Print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="ledger-view-container" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 text-[#e5e5e5]">
      {/* Top Navigation & Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#262626]">
        {/* Back Button & Khata Title */}
        <div className="flex items-center space-x-3">
          <button
            id="back-to-dashboard-btn"
            onClick={onBack}
            className="p-2.5 rounded-xl bg-[#171717] hover:bg-[#222] border border-[#262626] text-[#e5e5e5] transition-colors cursor-pointer"
            title="Return to My Khatas"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <div className="flex items-center space-x-2">
              <h1 id="active-task-title" className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {task.task_name}
              </h1>
              <button
                id="rename-task-quick-btn"
                onClick={onRenameTask}
                title="Rename Khata"
                className="text-[#737373] hover:text-[#e5e5e5] p-1 rounded-lg hover:bg-[#1f1f1f] transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center space-x-3 text-xs text-[#737373] mt-0.5">
              <span className="flex items-center space-x-1">
                <Lock className="w-3 h-3 text-amber-500/80" />
                <span>{task.is_protected ? 'Protected' : 'Open Khata'}</span>
              </span>
              <span>•</span>
              {/* Auto Save Status Badge */}
              <span id="autosave-status-badge" className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#171717] border border-emerald-900/40">
                {saveStatus === 'saved' && (
                  <>
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="font-semibold text-emerald-400">SAVED</span>
                  </>
                )}
                {saveStatus === 'saving' && (
                  <>
                    <Clock className="w-3 h-3 text-amber-400 animate-spin" />
                    <span className="font-semibold text-amber-400">SAVING...</span>
                  </>
                )}
                {saveStatus === 'error' && (
                  <>
                    <AlertCircle className="w-3 h-3 text-rose-400" />
                    <span className="font-semibold text-rose-400">SAVE ERROR</span>
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Lock Khata Button */}
          <button
            id="lock-task-btn"
            onClick={onLockTask}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#171717] hover:bg-[#222] border border-[#262626] text-[#a3a3a3] hover:text-[#e5e5e5] transition-colors cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5 text-amber-500/80" />
            <span>Lock Khata</span>
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              id="export-dropdown-btn"
              onClick={() => {
                setShowExportDropdown(!showExportDropdown);
                setShowSettingsDropdown(false);
              }}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#171717] hover:bg-[#222] border border-[#262626] text-[#e5e5e5] transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#a3a3a3]" />
              <span>Export</span>
            </button>

            {showExportDropdown && (
              <div
                id="export-menu"
                className="absolute right-0 top-11 z-20 w-48 bg-[#171717] rounded-2xl shadow-2xl border border-[#262626] py-1.5 animate-in fade-in zoom-in-95 duration-100"
                onMouseLeave={() => setShowExportDropdown(false)}
              >
                <button
                  id="export-pdf-btn"
                  onClick={() => {
                    setShowExportDropdown(false);
                    exportToPDF(task.task_name, records, currency.symbol, grandTotal);
                  }}
                  className="w-full px-4 py-2.5 text-left text-xs font-semibold text-[#e5e5e5] hover:bg-[#222] flex items-center space-x-2"
                >
                  <FileText className="w-4 h-4 text-rose-400" />
                  <span>Export PDF Statement</span>
                </button>
                <button
                  id="export-csv-btn"
                  onClick={() => {
                    setShowExportDropdown(false);
                    exportToCSV(task.task_name, records, currency.symbol);
                  }}
                  className="w-full px-4 py-2.5 text-left text-xs font-semibold text-[#e5e5e5] hover:bg-[#222] flex items-center space-x-2"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>Export Excel / CSV</span>
                </button>
                <button
                  id="print-ledger-btn"
                  onClick={() => {
                    setShowExportDropdown(false);
                    handlePrint();
                  }}
                  className="w-full px-4 py-2.5 text-left text-xs font-semibold text-[#e5e5e5] hover:bg-[#222] flex items-center space-x-2"
                >
                  <Printer className="w-4 h-4 text-sky-400" />
                  <span>Print Khata</span>
                </button>
              </div>
            )}
          </div>

          {/* Settings Menu */}
          <div className="relative">
            <button
              id="task-settings-btn"
              onClick={() => {
                setShowSettingsDropdown(!showSettingsDropdown);
                setShowExportDropdown(false);
              }}
              className="p-2 rounded-xl bg-[#171717] hover:bg-[#222] text-[#a3a3a3] hover:text-[#e5e5e5] border border-[#262626] transition-colors"
              title="Khata Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            {showSettingsDropdown && (
              <div
                id="settings-menu"
                className="absolute right-0 top-11 z-20 w-48 bg-[#171717] rounded-2xl shadow-2xl border border-[#262626] py-1.5 animate-in fade-in zoom-in-95 duration-100"
                onMouseLeave={() => setShowSettingsDropdown(false)}
              >
                <button
                  id="settings-rename-btn"
                  onClick={() => {
                    setShowSettingsDropdown(false);
                    onRenameTask();
                  }}
                  className="w-full px-4 py-2.5 text-left text-xs font-medium text-[#a3a3a3] hover:text-[#e5e5e5] hover:bg-[#222] flex items-center space-x-2"
                >
                  <Edit3 className="w-4 h-4 text-[#737373]" />
                  <span>Rename Khata</span>
                </button>
                <button
                  id="settings-change-password-btn"
                  onClick={() => {
                    setShowSettingsDropdown(false);
                    onChangePassword();
                  }}
                  className="w-full px-4 py-2.5 text-left text-xs font-medium text-[#a3a3a3] hover:text-[#e5e5e5] hover:bg-[#222] flex items-center space-x-2"
                >
                  <KeyRound className="w-4 h-4 text-[#737373]" />
                  <span>Change Password</span>
                </button>
                <button
                  id="settings-duplicate-btn"
                  onClick={() => {
                    setShowSettingsDropdown(false);
                    onDuplicateTask();
                  }}
                  className="w-full px-4 py-2.5 text-left text-xs font-medium text-[#a3a3a3] hover:text-[#e5e5e5] hover:bg-[#222] flex items-center space-x-2"
                >
                  <Copy className="w-4 h-4 text-[#737373]" />
                  <span>Duplicate Khata</span>
                </button>
                <div className="my-1 border-t border-[#262626]" />
                <button
                  id="settings-delete-btn"
                  onClick={() => {
                    setShowSettingsDropdown(false);
                    onDeleteTask();
                  }}
                  className="w-full px-4 py-2.5 text-left text-xs font-medium text-rose-400 hover:bg-rose-950/40 flex items-center space-x-2"
                >
                  <Trash2 className="w-4 h-4 text-rose-500" />
                  <span>Delete Khata</span>
                </button>
              </div>
            )}
          </div>

          {/* Primary + Add Entry Button */}
          <button
            id="add-row-primary-btn"
            onClick={() => handleAddRow()}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/50 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>+ Add Entry</span>
          </button>
        </div>
      </div>

      {/* Payment Summary Metrics Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sales / Grand Total */}
        <div className="p-4 rounded-xl bg-[#111111] border border-[#262626] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] text-[#737373] uppercase tracking-wider mb-1 font-semibold">
              Total Invoiced / Sales
            </p>
            <p id="grand-total-stat" className="text-xl sm:text-2xl font-bold text-white tabular-nums">
              {formatCurrency(grandTotal, currency.symbol)}
            </p>
            <p className="text-[11px] text-[#737373] mt-0.5">{totalRecordCount} total entries</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#171717] border border-[#262626] flex items-center justify-center text-[#737373]">
            <Coins className="w-5 h-5" />
          </div>
        </div>

        {/* Total Paid / Received */}
        <div className="p-4 rounded-xl bg-[#111111] border border-emerald-900/40 shadow-sm flex items-center justify-between relative overflow-hidden">
          <div>
            <p className="text-[10px] text-emerald-500 uppercase tracking-wider mb-1 font-semibold">
              Total Paid / Received
            </p>
            <p id="total-paid-stat" className="text-xl sm:text-2xl font-bold text-emerald-400 tabular-nums">
              {formatCurrency(totalPaid, currency.symbol)}
            </p>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-[11px] text-emerald-400/80 font-medium">
                {grandTotal > 0 ? `${Math.round((totalPaid / grandTotal) * 100)}% collected` : '0%'}
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#171717] border border-emerald-900/30 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Total Remaining / Outstanding */}
        <div className="p-4 rounded-xl bg-[#111111] border border-rose-900/40 shadow-sm flex items-center justify-between relative overflow-hidden">
          <div>
            <p className="text-[10px] text-rose-400 uppercase tracking-wider mb-1 font-semibold">
              Remaining / Outstanding
            </p>
            <p id="total-remaining-stat" className="text-xl sm:text-2xl font-bold text-rose-400 tabular-nums">
              {formatCurrency(totalRemaining, currency.symbol)}
            </p>
            <p className="text-[11px] text-rose-400/80 mt-0.5">
              {totalRemaining > 0 ? 'Pending recovery' : 'All accounts settled'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#171717] border border-rose-900/30 flex items-center justify-center text-rose-400">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        {/* Status Breakdown Counts */}
        <div className="p-4 rounded-xl bg-[#111111] border border-[#262626] shadow-sm flex flex-col justify-between">
          <p className="text-[10px] text-[#737373] uppercase tracking-wider font-semibold">
            Status Breakdown
          </p>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <button
              onClick={() => setStatusFilter(statusFilter === 'PAID' ? 'ALL' : 'PAID')}
              className={`p-2 rounded-lg border text-center transition-all ${
                statusFilter === 'PAID'
                  ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500'
                  : 'bg-[#171717] border-[#262626] text-[#a3a3a3] hover:border-emerald-800'
              }`}
            >
              <span className="text-[10px] font-bold text-emerald-400 block uppercase">Paid</span>
              <span className="text-sm font-bold text-white">{paidCount}</span>
            </button>

            <button
              onClick={() => setStatusFilter(statusFilter === 'UNPAID' ? 'ALL' : 'UNPAID')}
              className={`p-2 rounded-lg border text-center transition-all ${
                statusFilter === 'UNPAID'
                  ? 'bg-rose-950/60 border-rose-500 text-rose-300 ring-1 ring-rose-500'
                  : 'bg-[#171717] border-[#262626] text-[#a3a3a3] hover:border-rose-800'
              }`}
            >
              <span className="text-[10px] font-bold text-rose-400 block uppercase">Unpaid</span>
              <span className="text-sm font-bold text-white">{unpaidCount}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs & Filters Navigation */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        {/* Tab Selection */}
        <div className="flex items-center space-x-2 bg-[#171717] p-1 rounded-xl border border-[#262626]">
          <button
            id="tab-records-btn"
            onClick={() => setActiveTab('records')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'records'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-[#737373] hover:text-[#e5e5e5]'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>All Entries ({records.length})</span>
          </button>
          <button
            id="tab-khata-btn"
            onClick={() => setActiveTab('khata')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'khata'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-[#737373] hover:text-[#e5e5e5]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Customer Khata Breakdown ({customerKhatas.length})</span>
          </button>
        </div>

        {/* Search & Status Pill Filters */}
        <div className="flex items-center space-x-2 flex-1 sm:max-w-md justify-end">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-[#525252] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="search-records-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by customer, item, date..."
              className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg bg-[#171717] border border-[#262626] text-[#e5e5e5] placeholder-[#525252] focus:outline-none focus:border-emerald-600 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[#737373] hover:text-[#e5e5e5]"
              >
                ✕
              </button>
            )}
          </div>

          {/* Status Reset Filter if active */}
          {statusFilter !== 'ALL' && (
            <button
              onClick={() => setStatusFilter('ALL')}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 hover:bg-emerald-900/50 flex items-center space-x-1"
            >
              <span>Filter: {statusFilter}</span>
              <span className="text-xs">✕</span>
            </button>
          )}

          {/* View Toggle on Mobile */}
          <div className="flex sm:hidden rounded-lg bg-[#171717] p-0.5 border border-[#262626]">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded ${viewMode === 'table' ? 'bg-[#262626] text-white' : 'text-[#737373]'}`}
            >
              <TableIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded ${viewMode === 'cards' ? 'bg-[#262626] text-white' : 'text-[#737373]'}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content: Records View or Customer Khata View */}
      {activeTab === 'records' ? (
        viewMode === 'table' ? (
          <LedgerTable
            records={filteredRecords}
            currency={currency}
            onChangeRecord={handleChangeRecord}
            onDeleteRecord={handleDeleteRecord}
            onDuplicateRecord={handleDuplicateRecord}
            onMoveRecord={handleMoveRecord}
            onAddRow={() => handleAddRow()}
          />
        ) : (
          /* Mobile Cards Mode */
          <div className="space-y-3 sm:hidden">
            {filteredRecords.map((row, index) => {
              const totalVal = row.total || 0;
              const paidVal = row.paid_amount || 0;
              const remainingVal = row.remaining_amount ?? Math.max(0, totalVal - paidVal);
              const statusVal: PaymentStatus = row.payment_status === 'PAID' ? 'PAID' : 'UNPAID';

              return (
                <div
                  key={row.id || index}
                  className="p-4 rounded-xl bg-[#111111] border border-[#262626] shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-[#737373]">#{index + 1}</span>
                    <input
                      type="date"
                      value={row.date}
                      onChange={(e) => handleChangeRecord(index, 'date', e.target.value)}
                      className="text-xs text-[#a3a3a3] bg-transparent"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-[#737373]">Customer Name</label>
                    <input
                      type="text"
                      value={row.customer_name}
                      onChange={(e) => handleChangeRecord(index, 'customer_name', e.target.value)}
                      placeholder="Customer Name"
                      className="w-full px-2.5 py-1.5 text-sm rounded-lg bg-[#171717] border border-[#262626] text-[#e5e5e5] focus:border-emerald-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-[#737373]">Item</label>
                    <input
                      type="text"
                      value={row.item}
                      onChange={(e) => handleChangeRecord(index, 'item', e.target.value)}
                      placeholder="Item Name"
                      className="w-full px-2.5 py-1.5 text-sm rounded-lg bg-[#171717] border border-[#262626] text-[#e5e5e5] focus:border-emerald-600 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-[#737373]">Quantity</label>
                      <input
                        type="number"
                        value={row.quantity}
                        onChange={(e) => handleChangeRecord(index, 'quantity', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-sm rounded-lg bg-[#171717] border border-[#262626] text-[#e5e5e5] font-mono focus:border-emerald-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-[#737373]">Price ({currency.symbol})</label>
                      <input
                        type="number"
                        value={row.price}
                        onChange={(e) => handleChangeRecord(index, 'price', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-sm rounded-lg bg-[#171717] border border-[#262626] text-[#e5e5e5] font-mono focus:border-emerald-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Payment Row Inputs & Status Selector */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-emerald-400">Paid Amount</label>
                      <input
                        type="number"
                        value={row.paid_amount || ''}
                        onChange={(e) => handleChangeRecord(index, 'paid_amount', e.target.value)}
                        placeholder="0.00"
                        className="w-full px-2.5 py-1.5 text-sm rounded-lg bg-[#171717] border border-[#262626] text-emerald-400 font-mono focus:border-emerald-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-[#737373]">Payment Status</label>
                      <div className="relative">
                        <select
                          value={statusVal}
                          onChange={(e) => handleChangeRecord(index, 'payment_status', e.target.value as PaymentStatus)}
                          className={`w-full appearance-none cursor-pointer text-xs font-semibold py-1.5 pl-2.5 pr-6 rounded-lg border transition-all focus:outline-none focus:ring-1 ${
                            statusVal === 'PAID'
                              ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300 focus:ring-emerald-500'
                              : 'bg-rose-950/70 border-rose-500/50 text-rose-300 focus:ring-rose-500'
                          }`}
                        >
                          <option value="PAID" className="bg-[#171717] text-emerald-400 font-semibold">
                            ✓ Paid
                          </option>
                          <option value="UNPAID" className="bg-[#171717] text-rose-400 font-semibold">
                            ✕ Unpaid
                          </option>
                        </select>
                        <ChevronDown
                          className={`w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none ${
                            statusVal === 'PAID' ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#262626]">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#737373] block">Total</span>
                      <span className="text-sm font-bold text-white tabular-nums">
                        {formatCurrency(totalVal, currency.symbol)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-rose-400 block">Remaining</span>
                      <span className="text-sm font-bold text-rose-400 tabular-nums">
                        {formatCurrency(remainingVal, currency.symbol)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end space-x-1 pt-1">
                    <button
                      onClick={() => handleDuplicateRecord(index)}
                      className="p-2 text-[#737373] hover:text-[#e5e5e5] rounded-lg hover:bg-[#1f1f1f]"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteRecord(index)}
                      className="p-2 text-[#737373] hover:text-rose-400 rounded-lg hover:bg-rose-950/30"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}

            <button
              type="button"
              onClick={() => handleAddRow()}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-950/40 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ Add Entry</span>
            </button>
          </div>
        )
      ) : (
        /* Customer Khata Ledger View */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customerKhatas.map((khata, i) => (
              <div
                key={khata.customer_name || i}
                className="p-4 rounded-xl bg-[#0f0f0f] border border-[#262626] shadow-md hover:border-emerald-900/50 transition-all flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-white truncate max-w-[200px]">
                      {khata.customer_name}
                    </h3>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        khata.unpaid_count === 0 && khata.total_remaining === 0
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {khata.unpaid_count === 0 && khata.total_remaining === 0 ? 'PAID' : 'UNPAID'}
                    </span>
                  </div>
                  <p className="text-xs text-[#737373] mt-0.5">
                    {khata.transaction_count} entries • {khata.paid_count} paid, {khata.unpaid_count} unpaid
                  </p>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-[#262626] text-xs">
                  <div className="flex justify-between items-center text-[#a3a3a3]">
                    <span>Total Invoiced:</span>
                    <span className="font-mono font-medium text-white">
                      {formatCurrency(khata.total_amount, currency.symbol)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-emerald-400/90">
                    <span>Total Paid:</span>
                    <span className="font-mono font-semibold">
                      {formatCurrency(khata.total_paid, currency.symbol)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-rose-400">
                    <span className="font-bold">Remaining Balance:</span>
                    <span className="font-mono font-bold">
                      {formatCurrency(khata.total_remaining, currency.symbol)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-2 border-t border-[#262626]">
                  <button
                    onClick={() => {
                      setSearchQuery(khata.customer_name === 'Unnamed Customer' ? '' : khata.customer_name);
                      setActiveTab('records');
                    }}
                    className="flex-1 py-1.5 rounded-lg bg-[#171717] hover:bg-[#222] border border-[#333] text-xs font-semibold text-[#e5e5e5] transition-colors flex items-center justify-center space-x-1"
                  >
                    <span>View Entries</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      handleAddRow(khata.customer_name === 'Unnamed Customer' ? '' : khata.customer_name);
                      setActiveTab('records');
                    }}
                    className="py-1.5 px-3 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-700/50 text-emerald-400 text-xs font-semibold transition-colors flex items-center space-x-1"
                    title="Add new transaction for this customer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>
            ))}

            {customerKhatas.length === 0 && (
              <div className="col-span-full py-12 text-center text-[#737373]">
                <Users className="w-8 h-8 mx-auto mb-2 text-[#525252]" />
                <p className="text-sm font-medium">No customer accounts yet.</p>
                <button
                  type="button"
                  onClick={() => handleAddRow()}
                  className="mt-3 inline-flex items-center space-x-1.5 text-xs font-semibold text-emerald-400 hover:underline"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create first ledger entry</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
