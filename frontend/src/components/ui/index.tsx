import { ReactNode, useState } from 'react';
import { Search, Filter, X, ChevronUp, ChevronDown, Printer, Download } from 'lucide-react';
import { format } from 'date-fns';

// ── INR formatter ─────────────────────────────────────────────
export function inr(val: number | string | null | undefined): string {
  const n = Number(val ?? 0);
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Page Header ───────────────────────────────────────────────
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}
export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6 gap-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color?: 'blue' | 'green' | 'red' | 'amber' | 'purple' | 'indigo';
  sub?: string;
}
const colorMap = {
  blue:   { icon: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400', val: 'text-blue-700 dark:text-blue-300' },
  green:  { icon: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400', val: 'text-emerald-700 dark:text-emerald-300' },
  red:    { icon: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400', val: 'text-red-700 dark:text-red-300' },
  amber:  { icon: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400', val: 'text-amber-700 dark:text-amber-300' },
  purple: { icon: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400', val: 'text-purple-700 dark:text-purple-300' },
  indigo: { icon: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400', val: 'text-indigo-700 dark:text-indigo-300' },
};
export function StatCard({ label, value, icon: Icon, color = 'blue', sub }: StatCardProps) {
  const c = colorMap[color];
  return (
    <div className="card p-4 flex items-start gap-3">
      <div className={`kpi-icon ${c.icon}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="stat-label">{label}</p>
        <p className={`stat-value mt-0.5 ${c.val}`}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Filter Bar ────────────────────────────────────────────────
interface FilterBarProps {
  from: string;
  to: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  onFilter: () => void;
  onReset: () => void;
  onPrint?: () => void;
  extra?: ReactNode;
}
export function FilterBar({ from, to, onFromChange, onToChange, onFilter, onReset, onPrint, extra }: FilterBarProps) {
  return (
    <div className="card p-3 mb-4 no-print">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">From</label>
          <input type="date" className="input w-36 text-sm" value={from} onChange={(e) => onFromChange(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">To</label>
          <input type="date" className="input w-36 text-sm" value={to} onChange={(e) => onToChange(e.target.value)} />
        </div>
        <button className="btn-primary btn-sm" onClick={onFilter}>
          <Filter size={13} /> Filter
        </button>
        <button className="btn-secondary btn-sm" onClick={onReset}>
          <X size={13} /> Reset
        </button>
        {onPrint && (
          <button className="btn-secondary btn-sm" onClick={onPrint}>
            <Printer size={13} /> Print
          </button>
        )}
        {extra}
      </div>
    </div>
  );
}

// ── Search Input ──────────────────────────────────────────────
interface SearchInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}
export function SearchInput({ value, onChange, placeholder = 'Search…' }: SearchInputProps) {
  return (
    <div className="relative">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        className="input pl-8 w-56 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────
type BadgeVariant = 'green' | 'red' | 'yellow' | 'blue' | 'gray' | 'purple';
export function Badge({ children, variant = 'gray' }: { children: ReactNode; variant?: BadgeVariant }) {
  return <span className={`badge-${variant}`}>{children}</span>;
}

// ── Status badge for user approval ───────────────────────────
export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = {
    approved: 'green', pending: 'yellow', rejected: 'red', suspended: 'gray', active: 'green', inactive: 'gray',
  };
  return <Badge variant={map[status] ?? 'gray'}>{status}</Badge>;
}

// ── Modal ─────────────────────────────────────────────────────
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}
const modalSize = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-4xl' };
export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative bg-white dark:bg-gray-900 rounded-xl shadow-elevated w-full ${modalSize[size]} max-h-[90vh] flex flex-col animate-slide-in`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

// ── Confirm Dialog ────────────────────────────────────────────
interface ConfirmProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  message?: string;
  danger?: boolean;
}
export function Confirm({ open, onConfirm, onCancel, title = 'Confirm', message = 'Are you sure?', danger = false }: ConfirmProps) {
  return (
    <Modal open={open} onClose={onCancel} title={title} size="sm">
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{message}</p>
      <div className="flex gap-2 justify-end">
        <button className="btn-secondary btn-sm" onClick={onCancel}>Cancel</button>
        <button className={`${danger ? 'btn-danger' : 'btn-primary'} btn-sm`} onClick={onConfirm}>Confirm</button>
      </div>
    </Modal>
  );
}

// ── Empty state ───────────────────────────────────────────────
export function EmptyState({ message = 'No records found.' }: { message?: string }) {
  return (
    <div className="py-12 text-center text-gray-400 dark:text-gray-600">
      <div className="text-4xl mb-3">📋</div>
      <p className="text-sm">{message}</p>
    </div>
  );
}

// ── Loading spinner ───────────────────────────────────────────
export function Spinner({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center py-10 ${className}`}>
      <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
    </div>
  );
}

// ── Form field wrapper ────────────────────────────────────────
export function Field({ label, required, children, error }: {
  label: string; required?: boolean; children: ReactNode; error?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
