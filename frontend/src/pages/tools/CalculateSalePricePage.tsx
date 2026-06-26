import { useState } from 'react';
import { Calculator, Percent, TrendingUp, ArrowRight, RefreshCw } from 'lucide-react';
import { PageHeader } from '../../components/ui';
import { inr } from '../../components/ui';

function pct(val: number): string {
  return val.toFixed(2) + '%';
}

// ── Mode 1: Calculate Sale Price ──────────────────────────────────────────

function SalePriceCalculator() {
  const [purchasePrice, setPurchasePrice] = useState('');
  const [profitPercent, setProfitPercent] = useState('');
  const [result, setResult] = useState<number | null>(null);
  const [errors, setErrors] = useState<{ purchasePrice?: string; profitPercent?: string }>({});

  const validate = (): boolean => {
    const errs: typeof errors = {};
    const pp = parseFloat(purchasePrice);
    const p  = parseFloat(profitPercent);
    if (!purchasePrice || isNaN(pp) || pp <= 0)
      errs.purchasePrice = 'Please enter a valid purchase price.';
    if (!profitPercent || isNaN(p) || p < 0)
      errs.profitPercent = 'Please enter a valid profit percentage.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const calculate = () => {
    if (!validate()) { setResult(null); return; }
    setResult(parseFloat(purchasePrice) * (1 + parseFloat(profitPercent) / 100));
  };

  const reset = () => {
    setPurchasePrice('');
    setProfitPercent('');
    setResult(null);
    setErrors({});
  };

  return (
    <div className="card p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
        <div className="w-9 h-9 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center flex-shrink-0">
          <Calculator size={18} className="text-brand-600 dark:text-brand-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Calculate Sale Price</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500">Enter cost and margin to find the selling price</p>
        </div>
      </div>

      {/* Fields */}
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Purchase Price (₹)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            className={`input ${errors.purchasePrice ? 'input-error' : ''}`}
            placeholder="e.g. 150.00"
            value={purchasePrice}
            onChange={(e) => {
              setPurchasePrice(e.target.value);
              setErrors((p) => ({ ...p, purchasePrice: undefined }));
              setResult(null);
            }}
          />
          {errors.purchasePrice && <p className="text-xs text-red-500 mt-1">{errors.purchasePrice}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Expected Profit %
          </label>
          <div className="relative">
            <input
              type="number"
              min="0"
              step="0.01"
              className={`input pr-8 ${errors.profitPercent ? 'input-error' : ''}`}
              placeholder="e.g. 15"
              value={profitPercent}
              onChange={(e) => {
                setProfitPercent(e.target.value);
                setErrors((p) => ({ ...p, profitPercent: undefined }));
                setResult(null);
              }}
            />
            <Percent size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
          {errors.profitPercent && <p className="text-xs text-red-500 mt-1">{errors.profitPercent}</p>}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-2">
        <button className="btn-primary btn-sm w-full sm:flex-1" onClick={calculate}>
          <Calculator size={13} /> Calculate Sale Price
        </button>
        <button className="btn-secondary btn-sm w-full sm:w-auto flex items-center justify-center gap-1.5" onClick={reset}>
          <RefreshCw size={13} /> Reset
        </button>
      </div>

      {/* Result */}
      {result !== null && (
        <div className="rounded-lg bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold text-brand-500 dark:text-brand-400 uppercase tracking-wider mb-0.5">
              Calculated Sale Price
            </p>
            <p className="text-2xl font-bold text-brand-700 dark:text-brand-300">{inr(result)}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center flex-shrink-0">
            <TrendingUp size={18} className="text-brand-600 dark:text-brand-400" />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Mode 2: Calculate Profit Margin ───────────────────────────────────────

function ProfitMarginCalculator() {
  const [purchasePrice, setPurchasePrice] = useState('');
  const [salePrice, setSalePrice]         = useState('');
  const [result, setResult]               = useState<{ amount: number; margin: number } | null>(null);
  const [errors, setErrors]               = useState<{ purchasePrice?: string; salePrice?: string }>({});

  const validate = (): boolean => {
    const errs: typeof errors = {};
    const pp = parseFloat(purchasePrice);
    const sp = parseFloat(salePrice);
    if (!purchasePrice || isNaN(pp) || pp <= 0)
      errs.purchasePrice = 'Please enter a valid purchase price.';
    if (!salePrice || isNaN(sp) || sp <= 0)
      errs.salePrice = 'Sale price must be greater than zero.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const calculate = () => {
    if (!validate()) { setResult(null); return; }
    const pp = parseFloat(purchasePrice);
    const sp = parseFloat(salePrice);
    setResult({ amount: sp - pp, margin: ((sp - pp) / pp) * 100 });
  };

  const reset = () => {
    setPurchasePrice('');
    setSalePrice('');
    setResult(null);
    setErrors({});
  };

  const isProfit = result !== null && result.amount >= 0;

  return (
    <div className="card p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
        <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
          <Percent size={18} className="text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Calculate Profit Margin</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500">Know the margin from any purchase-sale pair</p>
        </div>
      </div>

      {/* Fields */}
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Purchase Price (₹)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            className={`input ${errors.purchasePrice ? 'input-error' : ''}`}
            placeholder="e.g. 150.00"
            value={purchasePrice}
            onChange={(e) => {
              setPurchasePrice(e.target.value);
              setErrors((p) => ({ ...p, purchasePrice: undefined }));
              setResult(null);
            }}
          />
          {errors.purchasePrice && <p className="text-xs text-red-500 mt-1">{errors.purchasePrice}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Sale Price (₹)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            className={`input ${errors.salePrice ? 'input-error' : ''}`}
            placeholder="e.g. 175.00"
            value={salePrice}
            onChange={(e) => {
              setSalePrice(e.target.value);
              setErrors((p) => ({ ...p, salePrice: undefined }));
              setResult(null);
            }}
          />
          {errors.salePrice && <p className="text-xs text-red-500 mt-1">{errors.salePrice}</p>}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-2">
        <button className="btn-primary btn-sm w-full sm:flex-1" onClick={calculate}>
          <Percent size={13} /> Calculate Profit Margin
        </button>
        <button className="btn-secondary btn-sm w-full sm:w-auto flex items-center justify-center gap-1.5" onClick={reset}>
          <RefreshCw size={13} /> Reset
        </button>
      </div>

      {/* Result */}
      {result !== null && (
        <div className={`rounded-lg border p-4
          ${isProfit
            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          }`}
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className={`text-[10px] font-semibold uppercase tracking-wider mb-0.5
                ${isProfit ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                {isProfit ? 'Profit Amount' : 'Loss Amount'}
              </p>
              <p className={`text-xl font-bold
                ${isProfit ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
                {inr(Math.abs(result.amount))}
              </p>
            </div>
            <div>
              <p className={`text-[10px] font-semibold uppercase tracking-wider mb-0.5
                ${isProfit ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                {isProfit ? 'Profit Margin' : 'Loss %'}
              </p>
              <p className={`text-xl font-bold
                ${isProfit ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
                {pct(Math.abs(result.margin))}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function CalculateSalePricePage() {
  return (
    <div>
      <PageHeader
        title="Calculate Sale Price"
        subtitle="Quickly calculate selling price or profit margin."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <SalePriceCalculator />
        <ProfitMarginCalculator />
      </div>

      {/* Formula reference */}
      <div className="mt-5 card p-4">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
          Formula Reference
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-start gap-2">
            <ArrowRight size={13} className="mt-0.5 flex-shrink-0 text-brand-400" />
            <span>
              <span className="font-semibold text-gray-700 dark:text-gray-300">Sale Price</span>
              {' = Purchase Price × (1 + Profit% ÷ 100)'}
            </span>
          </div>
          <div className="flex items-start gap-2">
            <ArrowRight size={13} className="mt-0.5 flex-shrink-0 text-emerald-400" />
            <span>
              <span className="font-semibold text-gray-700 dark:text-gray-300">Profit Margin</span>
              {' = ((Sale − Purchase) ÷ Purchase) × 100'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}