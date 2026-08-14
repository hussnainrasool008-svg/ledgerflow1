import React, { useRef } from 'react';
import {
  Trash2,
  Copy,
  Plus,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  AlertCircle,
  Check,
  ChevronDown,
} from 'lucide-react';
import { TaskRecord, CurrencyConfig, PaymentStatus } from '../types';
import { formatCurrency } from '../lib/exportUtils';

interface LedgerTableProps {
  records: TaskRecord[];
  currency: CurrencyConfig;
  onChangeRecord: (index: number, field: keyof TaskRecord, value: any) => void;
  onDeleteRecord: (index: number) => void;
  onDuplicateRecord: (index: number) => void;
  onMoveRecord: (index: number, direction: 'up' | 'down') => void;
  onAddRow: () => void;
}

export const LedgerTable: React.FC<LedgerTableProps> = ({
  records,
  currency,
  onChangeRecord,
  onDeleteRecord,
  onDuplicateRecord,
  onMoveRecord,
  onAddRow,
}) => {
  const lastRowCustomerRef = useRef<HTMLInputElement | null>(null);

  const handleKeyDown = (
    e: React.KeyboardEvent,
    index: number,
    field: keyof TaskRecord
  ) => {
    // If Enter in the Date (last input) on the last row -> automatically add a new row
    if (e.key === 'Enter' && index === records.length - 1 && field === 'date') {
      e.preventDefault();
      onAddRow();
    }
  };

  return (
    <div className="w-full bg-[#0d0d0d] rounded-xl border border-[#262626] shadow-2xl overflow-hidden flex flex-col">
      {/* Horizontally scrollable container */}
      <div className="overflow-x-auto w-full min-w-full">
        <table id="ledger-records-table" className="w-full text-left border-collapse min-w-[1020px]">
          {/* Table Header */}
          <thead>
            <tr className="bg-[#171717] border-b border-[#262626] text-[11px] font-semibold text-[#737373] uppercase tracking-wider select-none">
              <th className="py-3 px-2.5 w-10 text-center">#</th>
              <th className="py-3 px-3 min-w-[170px]">Customer Name</th>
              <th className="py-3 px-3 min-w-[150px]">Item</th>
              <th className="py-3 px-2.5 w-24 text-right">Quantity</th>
              <th className="py-3 px-2.5 w-32 text-right">Price ({currency.symbol})</th>
              <th className="py-3 px-3 w-36 text-right">Total ({currency.symbol})</th>
              <th className="py-3 px-3 w-36 text-right">Paid Amount ({currency.symbol})</th>
              <th className="py-3 px-3 w-36 text-center">Payment Status</th>
              <th className="py-3 px-3 w-36 text-right">Remaining ({currency.symbol})</th>
              <th className="py-3 px-2.5 w-32">Date</th>
              <th className="py-3 px-2 w-20 text-center">Actions</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-[#262626] text-sm">
            {records.map((row, index) => {
              const totalVal = row.total || 0;
              const paidVal = row.paid_amount || 0;
              const remainingVal = row.remaining_amount ?? Math.max(0, totalVal - paidVal);
              const statusVal: PaymentStatus = row.payment_status === 'PAID' ? 'PAID' : 'UNPAID';

              return (
                <tr
                  key={row.id || index}
                  id={`ledger-row-${index}`}
                  className="hover:bg-[#111111] transition-colors group"
                >
                  {/* Index / Reorder */}
                  <td className="py-2 px-1.5 text-center text-xs font-mono text-[#525252]">
                    <span className="group-hover:hidden">{index + 1}</span>
                    <div className="hidden group-hover:flex items-center justify-center space-x-0.5">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => onMoveRecord(index, 'up')}
                        title="Move Up"
                        className="text-[#737373] hover:text-[#e5e5e5] disabled:opacity-20"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={index === records.length - 1}
                        onClick={() => onMoveRecord(index, 'down')}
                        title="Move Down"
                        className="text-[#737373] hover:text-[#e5e5e5] disabled:opacity-20"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>

                  {/* Customer Name */}
                  <td className="py-1.5 px-2">
                    <input
                      type="text"
                      id={`customer-input-${index}`}
                      ref={index === records.length - 1 ? lastRowCustomerRef : undefined}
                      value={row.customer_name}
                      onChange={(e) => onChangeRecord(index, 'customer_name', e.target.value)}
                      placeholder="e.g. Ali Traders"
                      className="w-full px-2.5 py-1.5 text-xs sm:text-sm rounded-md bg-transparent hover:bg-[#171717] focus:bg-[#171717] border border-transparent focus:border-emerald-600 text-[#e5e5e5] focus:outline-none transition-all placeholder:text-[#525252]"
                    />
                  </td>

                  {/* Item */}
                  <td className="py-1.5 px-2">
                    <input
                      type="text"
                      id={`item-input-${index}`}
                      value={row.item}
                      onChange={(e) => onChangeRecord(index, 'item', e.target.value)}
                      placeholder="e.g. Cement, Steel"
                      className="w-full px-2.5 py-1.5 text-xs sm:text-sm rounded-md bg-transparent hover:bg-[#171717] focus:bg-[#171717] border border-transparent focus:border-emerald-600 text-[#e5e5e5] focus:outline-none transition-all placeholder:text-[#525252]"
                    />
                  </td>

                  {/* Quantity */}
                  <td className="py-1.5 px-2">
                    <input
                      type="number"
                      id={`qty-input-${index}`}
                      min="0"
                      step="any"
                      value={row.quantity === 0 && row.price === 0 && !row.customer_name ? '' : row.quantity}
                      onChange={(e) => onChangeRecord(index, 'quantity', e.target.value)}
                      placeholder="0"
                      className="w-full px-2 py-1.5 text-xs sm:text-sm rounded-md bg-transparent hover:bg-[#171717] focus:bg-[#171717] border border-transparent focus:border-emerald-600 text-right text-[#e5e5e5] font-mono focus:outline-none transition-all placeholder:text-[#525252]"
                    />
                  </td>

                  {/* Price */}
                  <td className="py-1.5 px-2">
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[#525252] text-xs font-mono">
                        {currency.symbol}
                      </span>
                      <input
                        type="number"
                        id={`price-input-${index}`}
                        min="0"
                        step="any"
                        value={row.price === 0 && row.quantity === 0 && !row.customer_name ? '' : row.price}
                        onChange={(e) => onChangeRecord(index, 'price', e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-7 pr-2 py-1.5 text-xs sm:text-sm rounded-md bg-transparent hover:bg-[#171717] focus:bg-[#171717] border border-transparent focus:border-emerald-600 text-right text-[#e5e5e5] font-mono focus:outline-none transition-all placeholder:text-[#525252]"
                      />
                    </div>
                  </td>

                  {/* Total (Quantity x Price, calculated automatically) */}
                  <td className="py-1.5 px-3 text-right">
                    <div
                      id={`total-cell-${index}`}
                      className="py-1.5 px-2 text-xs sm:text-sm font-semibold text-white font-mono tabular-nums"
                    >
                      {formatCurrency(totalVal, currency.symbol)}
                    </div>
                  </td>

                  {/* Paid Amount (User inputs amount received) */}
                  <td className="py-1.5 px-2">
                    <div className="relative group/paid">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[#525252] text-xs font-mono">
                        {currency.symbol}
                      </span>
                      <input
                        type="number"
                        id={`paid-input-${index}`}
                        min="0"
                        step="any"
                        value={row.paid_amount === 0 && totalVal === 0 ? '' : row.paid_amount}
                        onChange={(e) => onChangeRecord(index, 'paid_amount', e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-7 pr-2 py-1.5 text-xs sm:text-sm rounded-md bg-transparent hover:bg-[#171717] focus:bg-[#171717] border border-transparent focus:border-emerald-600 text-right text-emerald-400 font-mono focus:outline-none transition-all placeholder:text-[#525252]"
                      />
                    </div>
                  </td>

                  {/* Payment Status (USER MANUALLY SELECTS: Paid or Unpaid) */}
                  <td className="py-1.5 px-2 text-center">
                    <div className="relative inline-flex items-center justify-center">
                      <select
                        id={`status-select-${index}`}
                        value={statusVal}
                        onChange={(e) => onChangeRecord(index, 'payment_status', e.target.value as PaymentStatus)}
                        className={`appearance-none cursor-pointer text-xs font-semibold py-1.5 pl-3 pr-7 rounded-lg border transition-all focus:outline-none focus:ring-1 ${
                          statusVal === 'PAID'
                            ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300 focus:ring-emerald-500 hover:bg-emerald-950'
                            : 'bg-rose-950/70 border-rose-500/50 text-rose-300 focus:ring-rose-500 hover:bg-rose-950'
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
                        className={`w-3.5 h-3.5 absolute right-2 pointer-events-none ${
                          statusVal === 'PAID' ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      />
                    </div>
                  </td>

                  {/* Remaining Amount (Total - Paid Amount, calculated automatically) */}
                  <td className="py-1.5 px-3 text-right">
                    <div
                      id={`remaining-cell-${index}`}
                      className={`py-1.5 px-2 text-xs sm:text-sm font-semibold font-mono tabular-nums ${
                        remainingVal > 0 ? 'text-rose-400' : 'text-[#737373]'
                      }`}
                    >
                      {formatCurrency(remainingVal, currency.symbol)}
                    </div>
                  </td>

                  {/* Date */}
                  <td className="py-1.5 px-2">
                    <input
                      type="date"
                      id={`date-input-${index}`}
                      value={row.date || ''}
                      onChange={(e) => onChangeRecord(index, 'date', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, index, 'date')}
                      className="w-full px-2 py-1.5 text-xs rounded-md bg-transparent hover:bg-[#171717] focus:bg-[#171717] border border-transparent focus:border-emerald-600 text-[#a3a3a3] focus:outline-none transition-all"
                    />
                  </td>

                  {/* Row Actions */}
                  <td className="py-1.5 px-1.5 text-center">
                    <div className="flex items-center justify-center space-x-1">
                      <button
                        type="button"
                        id={`duplicate-row-btn-${index}`}
                        onClick={() => onDuplicateRecord(index)}
                        title="Duplicate row"
                        className="p-1 rounded-md text-[#737373] hover:text-[#e5e5e5] hover:bg-[#1f1f1f] transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        id={`delete-row-btn-${index}`}
                        onClick={() => onDeleteRecord(index)}
                        title="Delete row"
                        className="p-1 rounded-md text-[#737373] hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {records.length === 0 && (
              <tr>
                <td colSpan={11} className="py-12 text-center text-[#737373]">
                  <p className="text-sm font-medium">No entries in this task spreadsheet yet.</p>
                  <button
                    type="button"
                    onClick={onAddRow}
                    className="mt-3 inline-flex items-center space-x-1.5 text-xs font-semibold text-emerald-400 hover:underline cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add your first entry</span>
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Bottom Action Row with live columns sum info */}
      <div className="p-3 bg-[#111111] border-t border-[#262626] flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          id="add-row-table-btn"
          onClick={onAddRow}
          className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-emerald-400 bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-800/40 font-bold text-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>+ Add Entry</span>
        </button>

        <div className="flex items-center space-x-4 text-[11px] text-[#737373]">
          <span>
            Press <kbd className="px-1.5 py-0.5 rounded bg-[#171717] border border-[#262626] font-mono text-[10px] text-[#a3a3a3]">Enter</kbd> in Date to auto-add entry.
          </span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline text-emerald-400/80 font-medium">
            Total & Remaining are automatically calculated
          </span>
        </div>
      </div>
    </div>
  );
};
