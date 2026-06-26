/**
 * LedgerPage.tsx  →  Day Book
 *
 * Complete business transaction register.
 * Shows: Sales, Purchases, Expenses, Bank Credits, Bank Debits.
 * NO party/firm filter — that lives in PartyLedgerPage.
 *
 * Route: /reports/day-book
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { reportApi } from '../../services/apiServices';
import { PageHeader, Spinner, EmptyState, inr, SearchInput } from '../../components/ui';
import { format, startOfYear } from 'date-fns';
import { BookOpen, TrendingUp, TrendingDown, Wallet, Printer } from 'lucide-react';

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface LedgerEntry {
  date: string;
  type: 'Sale' | 'Purchase' | 'Expense' | 'Bank credit' | 'Bank debit';
  ref: string;
  party: string;
  credit: number;
  debit: number;
}

interface LedgerResponse {
  openingBalance: number;
  totalCredit: number;
  totalDebit: number;
  ledger: LedgerEntry[];
}

/* ─── Badge colours ─────────────────────────────────────────────────────── */
const TYPE_COLORS: Record<string, string> = {
  Sale:          'badge-green',
  Purchase:      'badge-blue',
  Expense:       'badge-red',
  'Bank credit': 'badge-green',
  'Bank debit':  'badge-red',
};



/* ═══════════════════════════════════════════════════════════════════════════ */
export default function LedgerPage() {
  const td = format(new Date(), 'yyyy-MM-dd');
  const sy = format(startOfYear(new Date()), 'yyyy-MM-dd');
  const navigate = useNavigate();

  const [from, setFrom]     = useState(sy);
  const [to, setTo]         = useState(td);
  const [active, setActive] = useState({ from: sy, to: td });
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery<LedgerResponse>({
    queryKey: ['daybook', active.from, active.to],
    queryFn: () => reportApi.ledger({ from: active.from, to: active.to }),
  });

  const rows = useMemo<LedgerEntry[]>(() => data?.ledger || [], [data]);

  /* search filter */
  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(r =>
      r.ref?.toLowerCase().includes(q) ||
      r.party?.toLowerCase().includes(q) ||
      r.type?.toLowerCase().includes(q)
    );
  }, [rows, search]);

  /* running balance */
  const rowsWithBalance = useMemo(() => {
    let bal = data?.openingBalance ?? 0;
    return filtered.map(r => {
      bal += r.credit - r.debit;
      return { ...r, runningBalance: bal };
    });
  }, [filtered, data?.openingBalance]);

  const openingBal  = data?.openingBalance ?? 0;
  const totalCredit = filtered.reduce((s, r) => s + (r.credit || 0), 0);
  const totalDebit  = filtered.reduce((s, r) => s + (r.debit  || 0), 0);
  const closingBal  = openingBal + totalCredit - totalDebit;

  const applyFilter = () => setActive({ from, to });
  const resetFilter = () => { setFrom(sy); setTo(td); setActive({ from: sy, to: td }); };

  const handlePrint = () => {
  navigate(
    `/ledger-print?from=${active.from}&to=${active.to}`
  );
};

  /* ─────────────────────────────────────────────────────────────── render */
  return (
    <div className="space-y-4">

      

      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="hidden lg:block">
        <PageHeader
          title="Day Book"
          subtitle="Complete business transaction register"
          actions={
            <SearchInput value={search} onChange={setSearch} placeholder="Search reference, party, type…" />
          }
        />
      </div>
      <div className="lg:hidden space-y-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Day Book</h1>
          <p className="text-sm text-gray-500 mt-0.5">Complete business transaction register</p>
        </div>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search reference, party, type…"
          className="input w-full"
        />
      </div>

      {/* ── Filter Bar ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
        {/* Desktop */}
        <div className="hidden lg:flex items-end gap-3 flex-wrap">
          <div>
            <label className="block text-xs text-gray-500 mb-1">From</label>
            <input type="date" className="input w-40" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">To</label>
            <input type="date" className="input w-40" value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <button className="btn-primary h-10 px-5" onClick={applyFilter}>Apply</button>
          <button className="btn-secondary h-10 px-5" onClick={resetFilter}>Reset</button>
          <button
  className="h-10 px-4 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-medium transition-colors"
  onClick={handlePrint}
>
  Download Day Book
</button>
        </div>

        {/* Mobile */}
        <div className="lg:hidden space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">From</label>
              <input type="date" className="input w-full" value={from} onChange={e => setFrom(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">To</label>
              <input type="date" className="input w-full" value={to} onChange={e => setTo(e.target.value)} />
            </div>
          </div>
          <button className="btn-primary w-full h-11" onClick={applyFilter}>Apply Filter</button>
          <div className="grid grid-cols-2 gap-3">
            <button className="btn-secondary h-10" onClick={resetFilter}>Reset</button>
            <button
  className="h-15 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-medium transition-colors"
  onClick={handlePrint}
>
  Download Day Book
</button>
          </div>
        </div>
      </div>

      {/* ── Summary Cards ──────────────────────────────────────────────────── */}
      {!isLoading && data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SummaryCard
            label="Opening Balance"
            value={inr(openingBal)}
            icon={<BookOpen size={16} className="text-slate-400" />}
            color="slate"
          />
          <SummaryCard
            label="Total Credits"
            value={inr(totalCredit)}
            icon={<TrendingUp size={16} className="text-emerald-500" />}
            color="emerald"
          />
          <SummaryCard
            label="Total Debits"
            value={inr(totalDebit)}
            icon={<TrendingDown size={16} className="text-red-500" />}
            color="red"
          />
          <SummaryCard
            label="Closing Balance"
            value={inr(closingBal)}
            icon={<Wallet size={16} className={closingBal >= 0 ? 'text-emerald-600' : 'text-red-600'} />}
            color={closingBal >= 0 ? 'emerald' : 'red'}
            highlight
          />
        </div>
      )}

      {/* ── Table / Cards ──────────────────────────────────────────────────── */}
      <div className="table-container">
        {isLoading ? (
          <div className="flex items-center justify-center py-20"><Spinner /></div>
        ) : rowsWithBalance.length === 0 ? (
          <EmptyState message="No transactions found for this period." />
        ) : (
          <>
            {/* ── Desktop: Tally-style sticky table ── */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-[12px] table-fixed">
                <thead className="bg-slate-950 text-white sticky top-0 z-10">
                  <tr>
                    <th className="w-[9%]  px-3 py-3 text-left font-semibold tracking-wide">Date</th>
                    <th className="w-[11%] px-3 py-3 text-left font-semibold tracking-wide">Type</th>
                    <th className="w-[16%] px-3 py-3 text-left font-semibold tracking-wide">Reference</th>
                    <th className="w-[24%] px-3 py-3 text-left font-semibold tracking-wide">Party / Category</th>
                    <th className="w-[12%] px-3 py-3 text-right font-semibold tracking-wide">Credit</th>
                    <th className="w-[12%] px-3 py-3 text-right font-semibold tracking-wide">Debit</th>
                    <th className="w-[13%] px-3 py-3 text-right font-semibold tracking-wide">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Opening balance row */}
                  <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                    <td className="px-3 py-2.5" colSpan={6}>Opening Balance</td>
                    <td className="px-3 py-2.5 text-right font-bold text-slate-700">{inr(openingBal)}</td>
                  </tr>

                  {rowsWithBalance.map((r, i) => (
                    <tr
                      key={i}
                      className={`border-b border-slate-100 hover:bg-blue-50/60 transition-colors ${
                        i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                      }`}
                    >
                      <td className="px-3 py-2.5 text-slate-500 tabular-nums">
                        {format(new Date(r.date), 'dd/MM/yyyy')}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`${TYPE_COLORS[r.type] || 'badge-gray'} text-[10px]`}>
                          {r.type}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 truncate">{r.ref || '—'}</td>
                      <td className="px-3 py-2.5 font-medium text-slate-800 truncate">{r.party || '—'}</td>
                      <td className="px-3 py-2.5 text-right text-emerald-600 font-medium tabular-nums">
                        {r.credit > 0 ? inr(r.credit) : <span className="text-slate-200">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-right text-red-500 font-medium tabular-nums">
                        {r.debit > 0 ? inr(r.debit) : <span className="text-slate-200">—</span>}
                      </td>
                      <td className={`px-3 py-2.5 text-right font-semibold tabular-nums ${
                        r.runningBalance >= 0 ? 'text-slate-800' : 'text-red-600'
                      }`}>
                        {inr(r.runningBalance)}
                      </td>
                    </tr>
                  ))}

                  {/* Closing balance row */}
                  <tr className="bg-slate-900 text-white font-bold">
                    <td className="px-3 py-3" colSpan={4}>Closing Balance</td>
                    <td className="px-3 py-3 text-right text-emerald-400 tabular-nums">{inr(totalCredit)}</td>
                    <td className="px-3 py-3 text-right text-red-400 tabular-nums">{inr(totalDebit)}</td>
                    <td className={`px-3 py-3 text-right tabular-nums ${
                      closingBal >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {inr(closingBal)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* ── Mobile: Day-book cards ── */}
            <div className="md:hidden rounded-2xl border border-slate-200 overflow-hidden bg-white">
              {/* Opening balance strip */}
              <div className="px-4 py-3 bg-slate-100 border-b border-slate-200 flex justify-between items-center">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Opening Balance</span>
                <span className="font-bold text-slate-700">{inr(openingBal)}</span>
              </div>

              {rowsWithBalance.map((r, i) => {
                const isCredit = r.credit > 0;
                const amount   = isCredit ? r.credit : r.debit;
                return (
                  <div key={i} className="border-b border-slate-100 last:border-0 flex items-stretch">
                    <div className={`w-1 flex-shrink-0 ${isCredit ? 'bg-emerald-400' : 'bg-red-400'}`} />
                    <div className="flex-1 px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] text-slate-400 font-medium tabular-nums">
                            {format(new Date(r.date), 'dd/MM/yyyy')}
                          </span>
                          <span className={`${TYPE_COLORS[r.type] || 'badge-gray'} text-[10px]`}>
                            {r.type}
                          </span>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={`text-[10px] font-semibold uppercase ${isCredit ? 'text-emerald-600' : 'text-red-500'}`}>
                            {isCredit ? 'Money In' : 'Money Out'}
                          </p>
                          <p className={`text-sm font-bold tabular-nums ${isCredit ? 'text-emerald-700' : 'text-red-600'}`}>
                            {inr(amount)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-1.5 flex items-end justify-between gap-2">
                        <div>
                          {r.party && (
                            <p className="text-[13px] font-semibold text-slate-800 leading-tight line-clamp-1">{r.party}</p>
                          )}
                          {r.ref && (
                            <p className="text-[11px] text-slate-400 mt-0.5">{r.ref}</p>
                          )}
                        </div>
                        <p className={`text-[11px] font-medium flex-shrink-0 ${
                          r.runningBalance >= 0 ? 'text-slate-500' : 'text-red-500'
                        }`}>
                          Bal: {inr(r.runningBalance)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Closing balance strip */}
              <div className={`px-4 py-3 flex justify-between items-center border-t-2 ${
                closingBal >= 0 ? 'bg-emerald-50 border-emerald-300' : 'bg-red-50 border-red-300'
              }`}>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Closing Balance</span>
                <span className={`font-bold text-base ${closingBal >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {inr(closingBal)}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Summary Card helper ────────────────────────────────────────────────── */
function SummaryCard({
  label, value, icon, color, highlight,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: 'slate' | 'emerald' | 'red';
  highlight?: boolean;
}) {
  const borderMap = { slate: 'border-slate-200', emerald: 'border-emerald-200 bg-emerald-50/50', red: 'border-red-200 bg-red-50/50' };
  const textMap   = { slate: 'text-slate-700',   emerald: 'text-emerald-700',                   red: 'text-red-700'                  };
  return (
    <div className={`bg-white rounded-xl border p-3 text-center shadow-sm ${highlight ? borderMap[color] : 'border-gray-200'}`}>
      <div className="flex justify-center mb-1">{icon}</div>
      <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-base font-bold mt-0.5 tabular-nums ${highlight ? textMap[color] : 'text-slate-700'}`}>{value}</p>
    </div>
  );
}