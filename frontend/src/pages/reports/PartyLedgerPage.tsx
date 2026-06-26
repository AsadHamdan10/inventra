/**
 * PartyLedgerPage.tsx
 *
 * Customer / Vendor account statement.
 * Shows Sales (credits) and Purchases (debits) for a selected party.
 * Running balance is computed in the frontend.
 *
 * Route: /reports/party-ledger
 */

import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportApi, customerApi, vendorApi } from '../../services/apiServices';
import { PageHeader, Spinner, inr } from '../../components/ui';
import { format, startOfYear } from 'date-fns';
import {
  Users, TrendingUp, TrendingDown, Wallet, Printer,
  BookOpen, ChevronDown, AlertCircle,
} from 'lucide-react';

import { useNavigate } from 'react-router-dom';

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface LedgerEntry {
  date: string;
  type: 'Sale' | 'Purchase' | 'Receipt';
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



/* ═══════════════════════════════════════════════════════════════════════════ */
export default function PartyLedgerPage() {
  const td = format(new Date(), 'yyyy-MM-dd');
  const navigate = useNavigate();
  const sy = format(startOfYear(new Date()), 'yyyy-MM-dd');

  const [from, setFrom]     = useState(sy);
  const [to, setTo]         = useState(td);
  const [active, setActive] = useState({ from: sy, to: td });
  const [party, setParty]   = useState('');
  const [search, setSearch] = useState('');

  /* ── Load party options from Customers + Vendors ── */
  const { data: customers } = useQuery<{ name?: string; companyName?: string }[]>({
    queryKey: ['customers-list'],
    queryFn: () => customerApi.list(),
  });
  const { data: vendors } = useQuery<{ vendorName?: string; name?: string }[]>({
    queryKey: ['vendors-list'],
    queryFn: () => vendorApi.list(),
  });

  const partyOptions = useMemo(() => {
    const names = new Set<string>();
    (customers || []).forEach(c => { const n = c.companyName || c.name; if (n) names.add(n); });
    (vendors   || []).forEach(v => { const n = v.vendorName  || v.name; if (n) names.add(n); });
    return Array.from(names).sort();
  }, [customers, vendors]);

  /* ── Fetch ledger only when party is selected ── */
  const { data, isLoading } = useQuery<LedgerResponse>({
    queryKey: ['party-ledger', active.from, active.to, party],
    queryFn:  () => reportApi.ledger({ from: active.from, to: active.to, party }),
    enabled:  Boolean(party),
  });

  /* ── Derived rows ── */
  const rows = useMemo<LedgerEntry[]>(() => data?.ledger || [], [data]);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(r =>
      r.ref?.toLowerCase().includes(q) ||
      r.party?.toLowerCase().includes(q) ||
      r.type?.toLowerCase().includes(q)
    );
  }, [rows, search]);

  /* running balance computed in frontend */
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
  const resetFilter = () => { setFrom(sy); setTo(td); setActive({ from: sy, to: td }); setSearch(''); };

 const handlePrint = () => {
  if (!party) return;

  navigate(
    `/party-ledger-print?party=${encodeURIComponent(
      party
    )}&from=${active.from}&to=${active.to}`
  );
};

  /* ── render ── */
  return (
    <div className="space-y-4">

      
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="hidden lg:block">
        <PageHeader
          title="Party Ledger"
          subtitle="Customer & vendor account statement"
          actions={
            party ? (
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search reference, type…"
                className="input w-64"
              />
            ) : undefined
          }
        />
      </div>
      <div className="lg:hidden">
        <h1 className="text-2xl font-bold text-slate-900">Party Ledger</h1>
        <p className="text-sm text-gray-500 mt-0.5">Customer &amp; vendor account statement</p>
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
          <div>
            <label className="block text-xs text-gray-500 mb-1">Party</label>
            <div className="relative">
              <select
                className="input w-64 pr-8 appearance-none"
                value={party}
                onChange={e => setParty(e.target.value)}
              >
                <option value="">— Select Customer / Vendor —</option>
                {partyOptions.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <button className="btn-primary h-10 px-5" onClick={applyFilter}>Apply</button>
          <button className="btn-secondary h-10 px-5" onClick={resetFilter}>Reset</button>
          {party && (
            <button
  className="h-10 px-4 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-medium transition-colors"
  onClick={handlePrint}
>
  Download Ledger
</button>
          )}
        </div>

        {/* Mobile */}
        <div className="lg:hidden space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Party</label>
            <select className="input w-full" value={party} onChange={e => setParty(e.target.value)}>
              <option value="">— Select Customer / Vendor —</option>
              {partyOptions.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
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
          {party && (
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search reference, type…"
              className="input w-full"
            />
          )}
          <button className="btn-primary w-full h-11" onClick={applyFilter}>Apply Filter</button>
          <div className="grid grid-cols-2 gap-3">
            <button className="btn-secondary h-10" onClick={resetFilter}>Reset</button>
            {party && (
              <button
  className="h-16 px-4 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-medium transition-colors"
  onClick={handlePrint}
>
  Download Ledger
</button>
            )}
          </div>
        </div>
      </div>

      {/* ── Empty state: no party selected ─────────────────────────────────── */}
      {!party && (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 py-16 flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
            <Users size={24} className="text-slate-400" />
          </div>
          <div>
            <p className="text-slate-700 font-semibold text-base">No party selected</p>
            <p className="text-slate-400 text-sm mt-1">Select a customer or vendor above to view their ledger.</p>
          </div>
        </div>
      )}

      {/* ── Summary Cards (only when party selected + data loaded) ─────────── */}
      {party && !isLoading && data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <PLSummaryCard
            label="Opening Balance"
            value={inr(openingBal)}
            icon={<BookOpen size={16} />}
            colorClass="text-slate-600"
          />
          <PLSummaryCard
            label="Total Credits"
            value={inr(totalCredit)}
            icon={<TrendingUp size={16} />}
            colorClass="text-emerald-600"
            bgClass="bg-emerald-50/60 border-emerald-200"
          />
          <PLSummaryCard
            label="Total Debits"
            value={inr(totalDebit)}
            icon={<TrendingDown size={16} />}
            colorClass="text-red-600"
            bgClass="bg-red-50/60 border-red-200"
          />
          <PLSummaryCard
            label="Closing Balance"
            value={inr(closingBal)}
            icon={<Wallet size={16} />}
            colorClass={closingBal >= 0 ? 'text-emerald-700' : 'text-red-700'}
            bgClass={closingBal >= 0 ? 'bg-emerald-50 border-emerald-300' : 'bg-red-50 border-red-300'}
            highlight
          />
        </div>
      )}

      {/* ── Table / Cards ──────────────────────────────────────────────────── */}
      {party && (
        <div>
          {isLoading ? (
            <div className="flex items-center justify-center py-20"><Spinner /></div>
          ) : rowsWithBalance.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 py-14 flex flex-col items-center gap-2 text-center">
              <AlertCircle size={28} className="text-slate-300" />
              <p className="text-slate-600 font-medium">No transactions found</p>
              <p className="text-slate-400 text-sm">No sales or purchases for <b>{party}</b> in this period.</p>
            </div>
          ) : (
            <>
              {/* ── Desktop: Accounting ledger table ── */}
              <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-[12px] table-fixed">
                  <thead className="bg-slate-950 text-white sticky top-0 z-10">
                    <tr>
                      <th className="w-[9%]  px-3 py-3 text-left font-semibold tracking-wide">Date</th>
                      <th className="w-[10%] px-3 py-3 text-left font-semibold tracking-wide">Type</th>
                      <th className="w-[17%] px-3 py-3 text-left font-semibold tracking-wide">Reference</th>
                      <th className="w-[22%] px-3 py-3 text-left font-semibold tracking-wide">Party</th>
                      <th className="w-[13%] px-3 py-3 text-right font-semibold tracking-wide">Credit</th>
                      <th className="w-[13%] px-3 py-3 text-right font-semibold tracking-wide">Debit</th>
                      <th className="w-[14%] px-3 py-3 text-right font-semibold tracking-wide">Running Bal.</th>
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
                        className={`border-b border-slate-100 hover:bg-indigo-50/50 transition-colors ${
                          i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                        }`}
                      >
                        <td className="px-3 py-2.5 text-slate-500 tabular-nums">
                          {format(new Date(r.date), 'dd/MM/yyyy')}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
  r.type === 'Sale'
    ? 'bg-emerald-100 text-emerald-700'
    : r.type === 'Receipt'
    ? 'bg-purple-100 text-purple-700'
    : 'bg-blue-100 text-blue-700'
}`}>
                            {r.type}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 truncate">{r.ref || '—'}</td>
                        <td className="px-3 py-2.5 font-medium text-slate-800 truncate">{r.party || '—'}</td>
                        <td className="px-3 py-2.5 text-right text-emerald-600 font-semibold tabular-nums">
                          {r.credit > 0 ? inr(r.credit) : <span className="text-slate-200">—</span>}
                        </td>
                        <td className="px-3 py-2.5 text-right text-red-500 font-semibold tabular-nums">
                          {r.debit > 0 ? inr(r.debit) : <span className="text-slate-200">—</span>}
                        </td>
                        <td className={`px-3 py-2.5 text-right font-bold tabular-nums ${
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

              {/* ── Mobile: Modern accounting cards ── */}
              <div className="md:hidden rounded-2xl border border-slate-200 overflow-hidden bg-white">
                {/* Opening balance strip */}
                <div className="px-4 py-3 bg-slate-100 border-b border-slate-200 flex justify-between items-center">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Opening Balance</span>
                  <span className="font-bold text-slate-700">{inr(openingBal)}</span>
                </div>

                {rowsWithBalance.map((r, i) => {
                  const isCredit =
  r.type === 'Sale';
                  const amount   = isCredit ? r.credit : r.debit;
                  return (
                    <div key={i} className="border-b border-slate-100 last:border-0 flex items-stretch">
                      {/* Color stripe */}
                      <div className={`w-1 flex-shrink-0 ${isCredit ? 'bg-emerald-400' : 'bg-red-400'}`} />
                      <div className="flex-1 px-4 py-3.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] text-slate-400 font-medium tabular-nums">
                              {format(new Date(r.date), 'dd MMM yyyy')}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
  r.type === 'Sale'
    ? 'bg-emerald-100 text-emerald-700'
    : r.type === 'Receipt'
    ? 'bg-purple-100 text-purple-700'
    : 'bg-blue-100 text-blue-700'
}`}>
                              {r.type}
                            </span>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className={`text-[10px] font-bold uppercase tracking-wide ${
  r.type === 'Sale'
    ? 'text-emerald-600'
    : 'text-red-500'
}`}>
  {r.type === 'Sale' ? '+ Credit' : '− Debit'}
</p>
                            <p className={`text-sm font-bold tabular-nums ${
                              isCredit ? 'text-emerald-700' : 'text-red-600'
                            }`}>
                              {inr(amount)}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 flex items-end justify-between gap-2">
                          <div>
                            {r.ref && (
                              <p className="text-[12px] font-semibold text-slate-700">{r.ref}</p>
                            )}
                            {r.party && (
                              <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{r.party}</p>
                            )}
                          </div>
                          <p className={`text-[11px] font-semibold flex-shrink-0 ${
                            r.runningBalance >= 0 ? 'text-slate-600' : 'text-red-500'
                          }`}>
                            Bal: {inr(r.runningBalance)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Closing balance strip */}
                <div className={`px-4 py-3.5 flex justify-between items-center border-t-2 ${
                  closingBal >= 0 ? 'bg-emerald-50 border-emerald-300' : 'bg-red-50 border-red-300'
                }`}>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Closing Balance</span>
                  <span className={`font-bold text-base tabular-nums ${
                    closingBal >= 0 ? 'text-emerald-700' : 'text-red-700'
                  }`}>
                    {inr(closingBal)}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Summary Card helper ────────────────────────────────────────────────── */
function PLSummaryCard({
  label, value, icon, colorClass, bgClass, highlight,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  colorClass: string;
  bgClass?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-3 text-center shadow-sm ${
      highlight && bgClass ? bgClass : 'bg-white border-gray-200'
    }`}>
      <div className={`flex justify-center mb-1 ${colorClass}`}>{icon}</div>
      <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-base font-bold mt-0.5 tabular-nums ${colorClass}`}>{value}</p>
    </div>
  );
}