import { useQuery } from '@tanstack/react-query';
import { TrendingUp, ShoppingCart, FileText, Wallet, AlertCircle, Package, PlusCircle, Receipt, CreditCard, BarChart3} from 'lucide-react';
import { dashboardApi } from '../../services/apiServices';
import { StatCard, Spinner, inr } from '../../components/ui';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

const COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4'];

export default function DashboardPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ['dashboard'], queryFn: dashboardApi.get });
  
  if (isLoading) return <Spinner />;
  if (!data) return null;

  const { summary, charts, recentSales, recentPurchases } = data;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Year-to-date business overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="YTD Sales" value={inr(summary.ytd.sales.total)} icon={TrendingUp} color="green" sub={`${summary.ytd.sales.count} invoices`} />
        <StatCard label="YTD Purchases" value={inr(summary.ytd.purchases.total)} icon={ShoppingCart} color="blue" sub={`${summary.ytd.purchases.count} bills`} />
        <StatCard label="Gross Profit" value={inr(summary.ytd.sales.profit)} icon={TrendingUp} color="indigo" />
        <StatCard label="YTD Expenses" value={inr(summary.ytd.expenses)} icon={Wallet} color="red" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Month Sales" value={inr(summary.mtd.sales.total)} icon={FileText} color="green" />
        <StatCard label="Month Purchases" value={inr(summary.mtd.purchases.total)} icon={ShoppingCart} color="blue" />
        <StatCard label="Receivables" value={inr(summary.outstanding.receivables)} icon={AlertCircle} color="amber" />
        <StatCard label="Payables" value={inr(summary.outstanding.payables)} icon={AlertCircle} color="red" />
      </div>
     {/* Mobile & Tablet Quick Links */}
<div className="lg:hidden card p-5">
  <h3 className="font-semibold text-sm mb-4 text-gray-700 dark:text-gray-300">
    Quick Links
  </h3>

  <div className="grid grid-cols-3 gap-3">

    {/* Sales */}
    <button
      onClick={() => navigate('/sales')}
      className="flex flex-col items-center justify-center p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 active:scale-95 transition"
    >
      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mb-2">
        <FileText size={18} className="text-emerald-600" />
      </div>
      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
        Sales
      </span>
    </button>

    {/* Purchases */}
    <button
      onClick={() => navigate('/purchases')}
      className="flex flex-col items-center justify-center p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 active:scale-95 transition"
    >
      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mb-2">
        <ShoppingCart size={18} className="text-blue-600" />
      </div>
      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
        Purchases
      </span>
    </button>

    {/* Receivables */}
    <button
      onClick={() => navigate('/receivables')}
      className="flex flex-col items-center justify-center p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 active:scale-95 transition"
    >
      <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mb-2">
        <AlertCircle size={18} className="text-amber-600" />
      </div>
      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
        Receivable
      </span>
    </button>

    {/* Payables */}
    <button
      onClick={() => navigate('/payables')}
      className="flex flex-col items-center justify-center p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 active:scale-95 transition"
    >
      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mb-2">
        <Wallet size={18} className="text-red-600" />
      </div>
      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
        Payables
      </span>
    </button>

    {/* Expenses */}
    <button
      onClick={() => navigate('/expenses')}
      className="flex flex-col items-center justify-center p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 active:scale-95 transition"
    >
      <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center mb-2">
        <Wallet size={18} className="text-orange-600" />
      </div>
      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
        Expenses
      </span>
    </button>

    {/* Inventory */}
    <button
      onClick={() => navigate('/inventory')}
      className="flex flex-col items-center justify-center p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 active:scale-95 transition"
    >
      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mb-2">
        <Package size={18} className="text-purple-600" />
      </div>
      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
        Inventory
      </span>
    </button>

  </div>
</div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-4 lg:col-span-2">
          <h3 className="font-semibold text-sm mb-3 text-gray-700 dark:text-gray-300">Monthly Revenue & Profit</h3>
          <ResponsiveContainer width="100%" height={170}>
            <AreaChart data={charts.monthlyRevenue}>
              <defs>
                <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gProf" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: any) => inr(v)} />
              <Legend />
              <Area type="monotone" dataKey="revenue" stroke="#6366f1" fill="url(#gRev)" name="Revenue" strokeWidth={2} />
              <Area type="monotone" dataKey="profit" stroke="#10b981" fill="url(#gProf)" name="Profit" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="card p-4">
          <h3 className="font-semibold text-sm mb-3 text-gray-700 dark:text-gray-300">Expenses by Category</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={charts.expensesByCategory} dataKey="amount" nameKey="category" cx="50%" cy="50%" outerRadius={75}>
                {charts.expensesByCategory.map((_: any, i: number) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: any) => inr(v)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 font-semibold text-sm">
    Recent Sales
  </div>

  {/* Mobile */}
  <div className="lg:hidden">
  {recentSales.map((s: any) => (
    <button
      key={s.id}
      onClick={() => navigate('/sales')}
      className="w-full p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between text-left"
    >
      <div>
        <div className="font-semibold text-sm">
          {s.invoiceNo}
        </div>

        <div className="text-xs text-gray-500 mt-1">
          {s.companyName}
        </div>

        <div className="mt-2 font-bold text-emerald-600">
          {inr(s.grandTotal)}
        </div>
      </div>

      <ChevronRight
        size={18}
        className="text-gray-400 flex-shrink-0"
      />
    </button>
  ))}
</div>

  {/* Desktop */}
  <div className="hidden lg:block">
    <table className="table">
      <thead>
        <tr>
          <th>Invoice</th>
          <th>Customer</th>
          <th className="text-right">Amount</th>
        </tr>
      </thead>
      <tbody>
        {recentSales.map((s: any) => (
          <tr key={s.id}>
            <td className="font-mono text-xs">
              {s.invoiceNo}
            </td>
            <td className="truncate max-w-[140px]">
              {s.companyName}
            </td>
            <td className="text-right font-semibold text-emerald-600">
              {inr(s.grandTotal)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>
        <div className="card">
  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 font-semibold text-sm">
    Recent Purchases
  </div>

  {/* Mobile */}
  <div className="lg:hidden">
  {recentPurchases.map((p: any) => (
    <button
      key={p.id}
      onClick={() => navigate('/purchases')}
      className="w-full p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between text-left"
    >
      <div>
        <div className="font-semibold text-sm">
          {p.billNo}
        </div>

        <div className="text-xs text-gray-500 mt-1">
          {p.vendorName}
        </div>

        <div className="mt-2 font-bold text-blue-600">
          {inr(p.grandTotal)}
        </div>
      </div>

      <ChevronRight
        size={18}
        className="text-gray-400 flex-shrink-0"
      />
    </button>
  ))}
</div>

  {/* Desktop */}
  <div className="hidden lg:block">
    <table className="table">
      <thead>
        <tr>
          <th>Bill No</th>
          <th>Vendor</th>
          <th className="text-right">Amount</th>
        </tr>
      </thead>
      <tbody>
        {recentPurchases.map((p: any) => (
          <tr key={p.id}>
            <td className="font-mono text-xs">
              {p.billNo}
            </td>
            <td className="truncate max-w-[140px]">
              {p.vendorName}
            </td>
            <td className="text-right font-semibold text-blue-600">
              {inr(p.grandTotal)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>
      </div>
    </div>
  );
}
