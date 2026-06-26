import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bankApi, authApi } from '../../services/apiServices';
import { Confirm, Spinner, EmptyState, inr } from '../../components/ui';
import { format, startOfMonth } from 'date-fns';
import toast from 'react-hot-toast';
import { Plus, Save, Pencil, Trash2, X, Landmark, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const emptyAcct = () => ({
  accountName: '',
  accountNumber: '',
  bankName: '',
  ifscCode: '',
  branchName: '',
  openingBalance: 0,
  isDefault: false,
});
const emptyStmt = (accountId = '') => ({
  accountId: accountId as any, txnDate: format(new Date(), 'yyyy-MM-dd'),
  txnType: 'credit' as 'credit' | 'debit', description: '', amount: '' as any, category: '', notes: '',
});

export default function BankStatementsPage() {
  const qc = useQueryClient();
  const currentDate = new Date();

const [fromDate, setFromDate] = useState(
  format(startOfMonth(currentDate), 'yyyy-MM-dd')
);

const [toDate, setToDate] = useState(
  format(currentDate, 'yyyy-MM-dd')
);

const [activeFrom, setActiveFrom] = useState(
  format(startOfMonth(currentDate), 'yyyy-MM-dd')
);

const [activeTo, setActiveTo] = useState(
  format(currentDate, 'yyyy-MM-dd')
);

const navigate = useNavigate();

const handlePrint = () => {
  navigate(
    `/bank-statement-print?accountId=${selectedAccountId}&from=${activeFrom}&to=${activeTo}`
  );
};

  // Account form state
  const [acctForm, setAcctForm] = useState<{
  accountName: string;
  accountNumber: string;
  bankName: string;
  ifscCode: string;
  branchName: string;
  openingBalance: number;
  isDefault: boolean;
}>(emptyAcct());
  const [editAcct, setEditAcct] = useState<number | null>(null);
  const [delAcct, setDelAcct] = useState<number | null>(null);

  // Statement form state
  const [selectedAccountId, setSelectedAccountId] = useState<number | ''>('');
  const [stmtForm, setStmtForm] = useState(emptyStmt());
  const [editStmt, setEditStmt] = useState<number | null>(null);
  const [delStmt, setDelStmt] = useState<number | null>(null);
  const [stmtModalOpen, setStmtModalOpen] = useState(false);
  const [txnTypeTab, setTxnTypeTab] = useState<'credit' | 'debit'>('credit');
  const [showAccountForm, setShowAccountForm] = useState(false);

  // Data queries
  const { data: accounts = [], isLoading: loadingAccts, refetch: refetchAccts } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: () => bankApi.accounts(),
  });

  const { data: statements = [], isLoading: loadingStmts } = useQuery({
  queryKey: [
    'bank-statements',
    selectedAccountId,
    activeFrom,
    activeTo,
  ],

  queryFn: () =>
    bankApi.statements({
      accountId: selectedAccountId || undefined,
      from: activeFrom,
      to: activeTo,
    }),
});

  const { data: summary } = useQuery({
    queryKey: ['bank-summary'],
    queryFn: () => bankApi.summary(),
  });
  const { data: currentUser } = useQuery({
  queryKey: ['current-user'],
  queryFn: () => authApi.me(),
});

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['bank-accounts'] });
    qc.invalidateQueries({ queryKey: ['bank-statements'] });
    qc.invalidateQueries({ queryKey: ['bank-summary'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };

  // Account mutations
  const saveAcct = useMutation({
    mutationFn: () => {
      if (!acctForm.accountName.trim()) throw new Error('Account Name is required.');
      return editAcct
  ? bankApi.updateAccount(editAcct, {
      ...acctForm,
      isDefault: !!acctForm.isDefault,
    })
  : bankApi.createAccount({
      ...acctForm,
      isDefault: !!acctForm.isDefault,
    });
    },
    onSuccess: () => {
      invalidateAll();
      setAcctForm(emptyAcct());
      setEditAcct(null);
      setShowAccountForm(false);
      toast.success(editAcct ? 'Account updated.' : 'Bank account created successfully.');
    },
    onError: (e: any) => toast.error(e.message || e.response?.data?.error || 'Failed to save account.'),
  });

  const removeAcct = useMutation({
    mutationFn: (id: number) => bankApi.deleteAccount(id),
    onSuccess: () => {
      invalidateAll();
      if (selectedAccountId === delAcct) setSelectedAccountId('');
      setDelAcct(null);
      toast.success('Account deleted.');
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to delete.'),
  });

  // Statement mutations
  const saveStmt = useMutation({
    mutationFn: () => {
      if (!stmtForm.amount || +stmtForm.amount <= 0) throw new Error('Amount must be greater than zero.');
      if (!stmtForm.txnDate) throw new Error('Transaction date is required.');
      const payload = { ...stmtForm, amount: +stmtForm.amount, accountId: stmtForm.accountId ? +stmtForm.accountId : null };
      return editStmt ? bankApi.updateStatement(editStmt, payload) : bankApi.createStatement(payload);
    },
    onSuccess: () => {
      invalidateAll();
      setStmtModalOpen(false);
      setStmtForm(emptyStmt(String(selectedAccountId)));
      setEditStmt(null);
      toast.success('Transaction saved.');
    },
    onError: (e: any) => toast.error(e.message || e.response?.data?.error || 'Failed to save transaction.'),
  });

  const removeStmt = useMutation({
    mutationFn: (id: number) => bankApi.deleteStatement(id),
    onSuccess: () => { invalidateAll(); setDelStmt(null); toast.success('Transaction deleted.'); },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to delete.'),
  });

  // Helpers
  const saf = (k: string) => (e: any) =>
    setAcctForm(p => ({ ...p, [k]: e.target.type === 'number' ? +e.target.value : e.target.value }));

  const openNewStmt = (type: 'credit' | 'debit') => {
    setStmtForm({ ...emptyStmt(String(selectedAccountId)), txnType: type });
    setTxnTypeTab(type);
    setEditStmt(null);
    setStmtModalOpen(true);
  };

  const openEditStmt = (s: any) => {
    setStmtForm({
      accountId: s.accountId || '',
      txnDate: format(new Date(s.txnDate), 'yyyy-MM-dd'),
      txnType: s.txnType,
      description: s.description || '',
      amount: +s.amount,
      category: s.category || '',
      notes: s.notes || '',
    });
    setTxnTypeTab(s.txnType);
    setEditStmt(s.id);
    setStmtModalOpen(true);
  };

  const openEditAcct = (a: any) => {
    setShowAccountForm(true);
  setAcctForm({
    accountName: a.accountName,
    accountNumber: a.accountNumber || '',
    bankName: a.bankName || '',
    ifscCode: a.ifscCode || '',
    branchName: a.branchName || '',
    openingBalance: +a.openingBalance || 0,
    isDefault: a.isDefault || false
  });
    setEditAcct(a.id);
  };

  const cancelEditAcct = () => { setAcctForm(emptyAcct()); setEditAcct(null);setShowAccountForm(false); };

  // Filtered data
  const filteredStmts = selectedAccountId
    ? statements.filter((s: any) => s.accountId === +selectedAccountId)
    : statements;

  const credits = filteredStmts.filter((s: any) => s.txnType === 'credit').reduce((a: number, s: any) => a + +s.amount, 0);
  const debits = filteredStmts.filter((s: any) => s.txnType === 'debit').reduce((a: number, s: any) => a + +s.amount, 0);
  const selectedAccount: any = accounts.find((a: any) => a.id === +selectedAccountId);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 md:px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg md:text-xl font-bold text-gray-900 dark:text-gray-100">Bank Statement</h1>
        <span className="text-xs md:text-sm text-gray-500">{format(new Date(), 'dd MMM yyyy')}</span>
      </div>

      <div className="p-4 md:p-6 space-y-5">

        {/* ── Summary Cards ──────────────────────────────────────────────── */}
        {/* Desktop: 4-column row */}
        <div className="hidden lg:grid lg:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 text-center shadow-sm">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Accounts</p>
            <p className="text-2xl font-bold text-brand-600 mt-1">{accounts.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 text-center shadow-sm">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Net Balance</p>
            <p className={`text-2xl font-bold mt-1 ${(summary?.currentBalance || 0) >= 0 ? 'text-brand-600' : 'text-red-600'}`}>
              {inr(summary?.currentBalance || 0)}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 text-center shadow-sm">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Total Credits</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{inr(summary?.totalCredits || 0)}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 text-center shadow-sm">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Total Debits</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{inr(summary?.totalDebits || 0)}</p>
          </div>
        </div>

        {/* Tablet: 2 cards per row */}
        <div className="hidden md:grid lg:hidden grid-cols-2 gap-3">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 text-center shadow-sm">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Accounts</p>
            <p className="text-2xl font-bold text-brand-600 mt-1">{accounts.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 text-center shadow-sm">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Net Balance</p>
            <p className={`text-2xl font-bold mt-1 ${(summary?.currentBalance || 0) >= 0 ? 'text-brand-600' : 'text-red-600'}`}>
              {inr(summary?.currentBalance || 0)}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 text-center shadow-sm">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Total Credits</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{inr(summary?.totalCredits || 0)}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 text-center shadow-sm">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Total Debits</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{inr(summary?.totalDebits || 0)}</p>
          </div>
        </div>

        {/* Mobile: full-width stacked cards */}
        <div className="md:hidden space-y-3">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm flex items-center justify-between">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Accounts</p>
            <p className="text-2xl font-bold text-brand-600">{accounts.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm flex items-center justify-between">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Net Balance</p>
            <p className={`text-2xl font-bold ${(summary?.currentBalance || 0) >= 0 ? 'text-brand-600' : 'text-red-600'}`}>
              {inr(summary?.currentBalance || 0)}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm flex items-center justify-between">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Total Credits</p>
            <p className="text-2xl font-bold text-green-600">{inr(summary?.totalCredits || 0)}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm flex items-center justify-between">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Total Debits</p>
            <p className="text-2xl font-bold text-red-600">{inr(summary?.totalDebits || 0)}</p>
          </div>
        </div>

        {/* Main two-column layout (desktop/tablet) — stacks to single column on mobile via grid-cols-1 */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* LEFT — Accounts panel (2/5 width on desktop) */}
          <div className="lg:col-span-2 space-y-4">
{/* Mobile Add Account Button */}
{!showAccountForm && (
  <div className="md:hidden">
    <button
      className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold shadow-md"
      onClick={() => {
        setAcctForm(emptyAcct());
        setEditAcct(null);
        setShowAccountForm(true);
      }}
    >
      + Add Bank Account
    </button>
  </div>
)}
            {/* Account form */}
            <div
  className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 md:p-5 ${
    !showAccountForm && window.innerWidth < 768
      ? 'hidden'
      : ''
  }`}
>
              <div className="flex items-center gap-2 mb-4">
                <Plus size={16} className="text-brand-600" />
                <span className="font-semibold text-gray-800 dark:text-gray-200">
                  {editAcct ? 'Edit Account' : 'Add New Bank Account'}
                </span>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">ACCOUNT NAME <span className="text-red-500">*</span></label>
                  <input className="input w-full" value={acctForm.accountName} onChange={saf('accountName')} placeholder="e.g. HDFC Current A/c" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">ACCOUNT NUMBER <span className="text-red-500">*</span></label>
                    <input className="input font-mono text-sm w-full" value={acctForm.accountNumber} onChange={saf('accountNumber')} placeholder="50100123456789" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">BANK NAME</label>
                    <input className="input text-sm w-full" value={acctForm.bankName} onChange={saf('bankName')} placeholder="HDFC Bank" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
  <div>
    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
      IFSC CODE
    </label>
    <input
      className="input font-mono uppercase text-sm w-full"
      value={acctForm.ifscCode}
      onChange={saf('ifscCode')}
      placeholder="HDFC0001234"
    />
  </div>

  <div>
    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
      BRANCH
    </label>
    <input
      className="input text-sm w-full"
      value={acctForm.branchName}
      onChange={saf('branchName')}
      placeholder="Ranipet Branch"
    />
  </div>

  <div>
    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
      OPENING BAL (₹)
    </label>
                    <input className="input text-sm w-full" type="number" min="0" step="0.01" value={acctForm.openingBalance} onChange={saf('openingBalance')} />
                  </div>
                </div>
                <div className="flex flex-col md:flex-row gap-2">
                  <button className="btn-primary flex-1 py-2 w-full md:w-auto" onClick={() => saveAcct.mutate()} disabled={saveAcct.isPending || !acctForm.accountName.trim()}>
                    <Save size={14} />{saveAcct.isPending ? 'Saving…' : editAcct ? 'Update Account' : 'Save Account'}
                  </button>
                  {editAcct && <button className="btn-secondary px-3 w-full md:w-auto" onClick={cancelEditAcct}>Cancel</button>}
                </div>
              </div>
            </div>

            {/* Account list */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <Landmark size={15} className="text-brand-600" />
                  <span className="font-semibold text-sm text-gray-700 dark:text-gray-300">Bank Account</span>
                  <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full">{accounts.length}</span>
                </div>
                <button onClick={() => refetchAccts()} className="text-gray-400 hover:text-brand-500 transition-colors" title="Refresh">
                  <RefreshCw size={13} />
                </button>
              </div>

              {loadingAccts ? <Spinner /> : accounts.length === 0 ? (
                <div className="py-10 text-center text-gray-400">
                  <Landmark size={36} className="mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No accounts yet. Add one above.</p>
                </div>
              ) : (
                <>
                  {/* Desktop/Tablet: compact list rows */}
                  <div className="hidden md:block divide-y divide-gray-100 dark:divide-gray-800">
                    {accounts.map((a: any) => (
                      <div key={a.id}
                        onClick={() => setSelectedAccountId(a.id === selectedAccountId ? '' : a.id)}
                        className={`px-4 py-3 cursor-pointer flex items-center justify-between transition-colors
                          ${selectedAccountId === a.id
                            ? 'bg-brand-50 dark:bg-brand-900/20 border-l-2 border-brand-500'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'}`}
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-gray-800 dark:text-gray-200 truncate">{a.accountName}</p>
                          <p className="text-xs text-gray-400 truncate">
                            {a.bankName || '—'} {a.accountNumber ? `· ${a.accountNumber}` : ''}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-3">
                          <p className={`font-bold text-sm ${(a.currentBalance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {inr(a.currentBalance || 0)}
                          </p>
                          <div className="flex gap-1 mt-1 justify-end">
                            <button onClick={e => { e.stopPropagation(); openEditAcct(a); }}
                              className="w-6 h-6 flex items-center justify-center bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded hover:bg-amber-200 transition-colors">
                              <Pencil size={11} />
                            </button>
                            <button onClick={e => { e.stopPropagation(); setDelAcct(a.id); }}
                              className="w-6 h-6 flex items-center justify-center bg-red-100 dark:bg-red-900/30 text-red-500 rounded hover:bg-red-200 transition-colors">
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Mobile: account cards */}
                  <div className="md:hidden p-3 space-y-3">
                    {accounts.map((a: any) => {
                      const isSelected = selectedAccountId === a.id;
                      return (
                        <div
                          key={a.id}
                          onClick={() => setSelectedAccountId(a.id === selectedAccountId ? '' : a.id)}
                          className={`rounded-2xl border p-4 transition-colors ${
                            isSelected
                              ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                              : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900'
                          }`}
                        >
                          <p className="font-bold text-gray-900 dark:text-gray-100">{a.accountName}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {a.bankName || '—'}
                          </p>
                          <p className="text-xs text-gray-400 font-mono mt-0.5">
                            {a.accountNumber || '—'}
                          </p>

                          <div className="mt-3 flex items-center justify-between">
                            <div>
                              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Balance</p>
                              <p className={`text-lg font-bold ${(a.currentBalance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {inr(a.currentBalance || 0)}
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <button
                              onClick={e => { e.stopPropagation(); openEditAcct(a); }}
                              className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-sm font-medium"
                            >
                              <Pencil size={13} /> Edit
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); setDelAcct(a.id); }}
                              className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm font-medium"
                            >
                              <Trash2 size={13} /> Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* RIGHT — Transactions panel (3/5 width on desktop) */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden h-full">

              {/* Filter section */}
              <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4">
                {/* Desktop */}
                <div className="hidden md:grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                      From
                    </label>
                    <input
                      type="date"
                      className="input w-full"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                      To
                    </label>
                    <input
                      type="date"
                      className="input w-full"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      className="btn-primary"
                      onClick={() => {
                        setActiveFrom(fromDate);
                        setActiveTo(toDate);
                      }}
                    >
                      Apply
                    </button>
                  </div>
                </div>

                {/* Mobile */}
                <div className="md:hidden space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                      From
                    </label>
                    <input
                      type="date"
                      className="input w-full"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                      To
                    </label>
                    <input
                      type="date"
                      className="input w-full"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                    />
                  </div>
                  <button
                    className="btn-primary w-full"
                    onClick={() => {
                      setActiveFrom(fromDate);
                      setActiveTo(toDate);
                    }}
                  >
                    Apply
                  </button>
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      className="btn-secondary w-full"
                      onClick={() => {
                        const now = new Date();
                        const f = format(startOfMonth(now), 'yyyy-MM-dd');
                        const t = format(now, 'yyyy-MM-dd');
                        setFromDate(f); setToDate(t); setActiveFrom(f); setActiveTo(t);
                      }}
                    >
                      This Month
                    </button>
                    <button
                      className="btn-secondary w-full"
                      onClick={() => {
                        const now = new Date();
                        const f = `${now.getFullYear()}-01-01`;
                        const t = `${now.getFullYear()}-12-31`;
                        setFromDate(f); setToDate(t); setActiveFrom(f); setActiveTo(t);
                      }}
                    >
                      This Year
                    </button>
                    <button
                      className="btn-secondary w-full"
                      onClick={() => {
                        const f = format(startOfMonth(currentDate), 'yyyy-MM-dd');
                        const t = format(currentDate, 'yyyy-MM-dd');
                        setFromDate(f); setToDate(t); setActiveFrom(f); setActiveTo(t);
                      }}
                    >
                      All Records
                    </button>
                  </div>
                </div>
              </div>

              {/* Transaction header */}
              <div className="px-4 md:px-5 py-4 border-b border-gray-200 dark:border-gray-800">
                {/* Desktop */}
                <div className="hidden md:flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h2 className="font-semibold text-gray-800 dark:text-gray-200">
                      {selectedAccount ? `${selectedAccount.accountName} — Statement` : 'Transactions'}
                    </h2>
                    {selectedAccount && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Balance: <strong className={`${(selectedAccount.currentBalance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{inr(selectedAccount.currentBalance || 0)}</strong>
                        &nbsp;·&nbsp;Credits: <strong className="text-green-600">{inr(credits)}</strong>
                        &nbsp;·&nbsp;Debits: <strong className="text-red-600">{inr(debits)}</strong>
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="h-10 px-4 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-medium transition-colors"
                      onClick={handlePrint}
                    >
                      Print Statement
                    </button>
                    <button className="btn-primary btn-sm bg-green-600 hover:bg-green-700" onClick={() => openNewStmt('credit')}>
                      <Plus size={13} /> Credit
                    </button>
                    <button className="btn-primary btn-sm bg-red-500 hover:bg-red-600" onClick={() => openNewStmt('debit')}>
                      <Plus size={13} /> Debit
                    </button>
                  </div>
                </div>

                {/* Mobile: stacked, full-width */}
                <div className="md:hidden space-y-3">
                  <div>
                    <h2 className="font-semibold text-gray-800 dark:text-gray-200">
                      {selectedAccount ? `${selectedAccount.accountName} — Statement` : 'Transactions'}
                    </h2>
                    {selectedAccount && (
                      <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                        Balance: <strong className={`${(selectedAccount.currentBalance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{inr(selectedAccount.currentBalance || 0)}</strong>
                        <br />
                        Credits: <strong className="text-green-600">{inr(credits)}</strong>
                        &nbsp;·&nbsp;Debits: <strong className="text-red-600">{inr(debits)}</strong>
                      </p>
                    )}
                  </div>
                  <button
                    className="w-full h-11 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-medium transition-colors"
                    onClick={handlePrint}
                  >
                    Print Statement
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <button className="btn-primary w-full bg-green-600 hover:bg-green-700" onClick={() => openNewStmt('credit')}>
                      <Plus size={13} /> Credit
                    </button>
                    <button className="btn-primary w-full bg-red-500 hover:bg-red-600" onClick={() => openNewStmt('debit')}>
                      <Plus size={13} /> Debit
                    </button>
                  </div>
                </div>
              </div>

              {/* No account selected */}
              {!selectedAccountId ? (
                <div className="py-20 text-center text-gray-400">
                  <Landmark size={52} className="mx-auto mb-4 opacity-20" />
                  <p className="font-semibold text-gray-500 text-sm">No Account Selected</p>
                  <p className="text-xs mt-1 text-gray-400">Select a bank account from the left to view its statement.</p>
                </div>
              ) : loadingStmts ? <Spinner /> : filteredStmts.length === 0 ? (
                <EmptyState message="No transactions yet. Click Credit or Debit to add one." />
              ) : (
                <>
                  {/* Desktop/Tablet: table with horizontal scroll on tablet */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-800 dark:bg-gray-700 text-white">
                          <th className="px-4 py-2.5 text-left text-xs font-semibold">#</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold">DATE</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold">DESCRIPTION</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold">CATEGORY</th>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold text-red-400">
                            DEBIT (₹)
                          </th>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold text-green-400">
                            CREDIT (₹)
                          </th>
                          <th className="px-4 py-2.5 text-center text-xs font-semibold">
                            ACTIONS
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStmts.map((s: any, idx: number) => (
                          <tr key={s.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40">
                            <td className="px-4 py-2.5 text-gray-400 text-xs">{idx + 1}</td>
                            <td className="px-4 py-2.5 text-sm text-black dark:text-gray-200 whitespace-nowrap">{format(new Date(s.txnDate), 'dd/MM/yyyy')}</td>
                            <td className="px-4 py-2.5 max-w-[160px] truncate text-black dark:text-gray-200">{s.description || '—'}</td>
                            <td className="px-4 py-2.5 text-black dark:text-gray-200">
                              {s.category ? <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-full">{s.category}</span> : <span className="text-gray-300 dark:text-gray-600">—</span>}
                            </td>
                            <td className="px-4 py-2.5 text-right font-semibold text-red-600">
                              {s.txnType === 'debit' ? inr(s.amount) : '—'}
                            </td>
                            <td className="px-4 py-2.5 text-right font-semibold text-green-600">
                              {s.txnType === 'credit' ? inr(s.amount) : '—'}
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center justify-center gap-1">
                                <button onClick={() => openEditStmt(s)} className="w-7 h-7 flex items-center justify-center bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded hover:bg-amber-200 transition-colors"><Pencil size={13} /></button>
                                <button onClick={() => setDelStmt(s.id)} className="w-7 h-7 flex items-center justify-center bg-red-500 text-white rounded hover:bg-red-600 transition-colors"><Trash2 size={13} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-100 dark:bg-gray-800 font-bold text-sm">
                          <td colSpan={4} className="px-4 py-2">TOTAL ({filteredStmts.length})</td>
                          <td className="px-4 py-2 text-right text-red-600">
                            {inr(debits)}
                          </td>
                          <td className="px-4 py-2 text-right text-green-600">
                            {inr(credits)}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Mobile: transaction cards */}
                  <div className="md:hidden p-3 space-y-3">
                    {filteredStmts.map((s: any) => {
                      const isCredit = s.txnType === 'credit';
                      return (
                        <div
                          key={s.id}
                          className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden"
                        >
                          <div className="flex items-stretch">
                            <div className={`w-1 flex-shrink-0 ${isCredit ? 'bg-emerald-400' : 'bg-red-400'}`} />
                            <div className="flex-1 p-4">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="text-xs text-gray-400 font-medium">
                                    {format(new Date(s.txnDate), 'dd/MM/yyyy')}
                                  </p>
                                  <p className="font-semibold text-gray-900 dark:text-gray-100 mt-0.5">
                                    {s.description || '—'}
                                  </p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <p className={`text-[10px] font-bold uppercase ${isCredit ? 'text-emerald-600' : 'text-red-500'}`}>
                                    {isCredit ? 'Credit' : 'Debit'}
                                  </p>
                                  <p className={`text-base font-bold ${isCredit ? 'text-emerald-700' : 'text-red-600'}`}>
                                    {inr(s.amount)}
                                  </p>
                                </div>
                              </div>

                              {s.category && (
                                <p className="text-xs text-gray-400 mt-2">
                                  Category: <span className="text-gray-600 dark:text-gray-300 font-medium">{s.category}</span>
                                </p>
                              )}

                              <div className="mt-3 grid grid-cols-2 gap-2">
                                <button
                                  onClick={() => openEditStmt(s)}
                                  className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-sm font-medium"
                                >
                                  <Pencil size={13} /> Edit
                                </button>
                                <button
                                  onClick={() => setDelStmt(s.id)}
                                  className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm font-medium"
                                >
                                  <Trash2 size={13} /> Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Mobile totals strip */}
                    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4 flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                        Total ({filteredStmts.length})
                      </span>
                      <div className="text-right text-sm">
                        <p className="text-red-600 font-bold">Debit: {inr(debits)}</p>
                        <p className="text-green-600 font-bold">Credit: {inr(credits)}</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Modal */}
      {stmtModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => { setStmtModalOpen(false); setEditStmt(null); }} />
          <div className="relative bg-white dark:bg-gray-900 shadow-2xl w-full h-full md:h-auto md:max-w-md md:rounded-2xl overflow-y-auto animate-slide-in">
            {/* Modal header with Credit/Debit tabs */}
            <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => { setTxnTypeTab('credit'); setStmtForm(p => ({ ...p, txnType: 'credit' })); }}
                  className={`px-3 md:px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${txnTypeTab === 'credit' ? 'bg-green-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                  Credit (Money In)
                </button>
                <button
                  onClick={() => { setTxnTypeTab('debit'); setStmtForm(p => ({ ...p, txnType: 'debit' })); }}
                  className={`px-3 md:px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${txnTypeTab === 'debit' ? 'bg-red-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                  Debit (Money Out)
                </button>
              </div>
              <button onClick={() => { setStmtModalOpen(false); setEditStmt(null); }} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>

            <div className="p-4 md:p-6 space-y-4">
              {/* Account selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">ACCOUNT</label>
                <select className="input w-full" value={stmtForm.accountId} onChange={e => setStmtForm(p => ({ ...p, accountId: e.target.value }))}>
                  <option value="">— Select Account —</option>
                  {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.accountName}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">DATE <span className="text-red-500">*</span></label>
                  <input className="input w-full" type="date" value={stmtForm.txnDate} onChange={e => setStmtForm(p => ({ ...p, txnDate: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    AMOUNT (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    className={`input w-full font-semibold ${txnTypeTab === 'credit' ? 'text-green-600 border-green-300 focus:border-green-500' : 'text-red-600 border-red-300 focus:border-red-500'}`}
                    type="number" min="0.01" step="0.01"
                    value={stmtForm.amount}
                    onChange={e => setStmtForm(p => ({ ...p, amount: e.target.value as any }))}
                    placeholder="0.00"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">DESCRIPTION / REFERENCE</label>
                <input className="input w-full" value={stmtForm.description} onChange={e => setStmtForm(p => ({ ...p, description: e.target.value }))} placeholder="e.g. Payment from customer / Vendor payment" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">CATEGORY</label>
                <input className="input w-full" value={stmtForm.category} onChange={e => setStmtForm(p => ({ ...p, category: e.target.value }))} placeholder="e.g. Sales Receipt, Vendor Payment, Salary" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">NOTES</label>
                <textarea className="input w-full" rows={2} value={stmtForm.notes} onChange={e => setStmtForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>

            <div className="flex flex-col-reverse md:flex-row gap-3 justify-end px-4 md:px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 md:rounded-b-2xl">
              <button className="btn-secondary w-full md:w-auto" onClick={() => { setStmtModalOpen(false); setEditStmt(null); }}>Cancel</button>
              <button
                className={`btn-primary px-6 w-full md:w-auto ${txnTypeTab === 'credit' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-500 hover:bg-red-600'}`}
                onClick={() => saveStmt.mutate()}
                disabled={saveStmt.isPending || !stmtForm.amount || +stmtForm.amount <= 0}
              >
                <Save size={14} />
                {saveStmt.isPending ? 'Saving…' : editStmt ? 'Update' : `Save ${txnTypeTab === 'credit' ? 'Credit' : 'Debit'}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Account Modal — currently the account form is inline above; if a
          modal variant is later introduced for mobile, apply the same
          width:100% + no-overflow pattern used in the Transaction Modal. */}

      <Confirm open={delAcct !== null} onConfirm={() => removeAcct.mutate(delAcct!)} onCancel={() => setDelAcct(null)}
        title="Delete Bank Account" message="Delete this account and all its transactions? This cannot be undone." danger />
      <Confirm open={delStmt !== null} onConfirm={() => removeStmt.mutate(delStmt!)} onCancel={() => setDelStmt(null)}
        title="Delete Transaction" message="Delete this transaction?" danger />
    </div>
  );
}