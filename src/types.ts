export interface TaskSummary {
  id: string;
  task_name: string;
  record_count: number;
  grand_total: number;
  total_paid?: number;
  total_remaining?: number;
  paid_count?: number;
  unpaid_count?: number;
  created_at: string;
  updated_at: string;
  last_opened_at: string;
  is_protected: boolean;
  password_hash?: string;
  password_salt?: string;
  password_version?: string;
  anonymous_installation_id?: string;
}

export type PaymentStatus = 'PAID' | 'UNPAID';

export type TaskSortOption =
  | 'updated_desc'
  | 'updated_asc'
  | 'name_asc'
  | 'name_desc'
  | 'total_desc'
  | 'records_desc';

export interface TaskRecord {
  id: string;
  task_id: string;
  customer_name: string;
  item: string;
  quantity: number;
  price: number;
  total: number;
  paid_amount: number;
  remaining_amount: number;
  payment_status: PaymentStatus;
  date: string;
  created_at: string;
  updated_at: string;
  order_index?: number;
  anonymous_installation_id?: string;
}

export interface CustomerKhataSummary {
  customer_name: string;
  total_amount: number;
  total_paid: number;
  total_remaining: number;
  transaction_count: number;
  paid_count: number;
  unpaid_count: number;
  records: TaskRecord[];
}

export function normalizePaymentStatus(status?: string): PaymentStatus {
  if (!status) return 'UNPAID';
  const s = status.toUpperCase().trim();
  return s === 'PAID' ? 'PAID' : 'UNPAID';
}

export function calculateRemainingAmount(total: number, paidAmount: number): number {
  const safeTotal = Number(total || 0);
  const safePaid = Number(paidAmount || 0);
  const remaining = Math.round((safeTotal - safePaid) * 100) / 100;
  return remaining < 0 ? 0 : remaining;
}

export type AutoSaveStatus = 'saved' | 'saving' | 'error' | 'unsaved';

export interface CurrencyConfig {
  code: string;
  symbol: string;
  label: string;
  locale: string;
}

export const CURRENCIES: CurrencyConfig[] = [
  { code: 'PKR', symbol: 'Rs.', label: 'Pakistani Rupee (Rs.)', locale: 'en-PK' },
  { code: 'USD', symbol: '$', label: 'US Dollar ($)', locale: 'en-US' },
  { code: 'EUR', symbol: '€', label: 'Euro (€)', locale: 'de-DE' },
  { code: 'GBP', symbol: '£', label: 'British Pound (£)', locale: 'en-GB' },
  { code: 'INR', symbol: '₹', label: 'Indian Rupee (₹)', locale: 'en-IN' },
  { code: 'AED', symbol: 'AED', label: 'UAE Dirham (AED)', locale: 'en-AE' },
  { code: 'SAR', symbol: 'SAR', label: 'Saudi Riyal (SAR)', locale: 'en-SA' },
];

export interface Note {
  id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  is_archived: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  anonymous_installation_id?: string;
}

export type NoteSection = 'all' | 'pinned' | 'archived' | 'trash';

export type NoteSortOption =
  | 'updated_desc'
  | 'updated_asc'
  | 'created_desc'
  | 'title_asc'
  | 'title_desc';

export interface NoteCounts {
  all: number;
  pinned: number;
  archived: number;
  trash: number;
}

export type AppLockTimeout = 'immediately' | '1m' | '5m' | '15m' | 'closed';

export interface AppLockStatus {
  isSetup: boolean;
  enabled: boolean;
  timeout: AppLockTimeout;
  isUnlocked: boolean;
}
