import { useQuery } from '@tanstack/react-query';
import { reportApi } from '../../services/apiServices';
import { PageHeader, Spinner, EmptyState, SearchInput, inr } from '../../components/ui';
import { useState } from 'react';
import { AlertTriangle, Package } from 'lucide-react';

export default function InventoryPage() {
  const [search,setSearch]=useState('');
  const {data:inventory=[],isLoading}=useQuery({queryKey:['inventory'],queryFn:()=>reportApi.inventory()});

  const filtered=inventory.filter((i:any)=>i.materialName.toLowerCase().includes(search.toLowerCase())||i.hsnCode?.includes(search));
  const totalValue=filtered.reduce((s:number,i:any)=>s+i.stockValue,0);
  const lowStock=filtered.filter((i:any)=>i.isLow);

  return (
    <div className="space-y-4">
      {/* Desktop Only */}
<div className="hidden lg:block">
  <PageHeader
    title="Inventory"
    subtitle="Inventory Manager"
    actions={
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search Material..."
      />
    }
  />
</div>


{/* Mobile Header */}
<div className="lg:hidden space-y-3">

  <div>
    <h1 className="text-3xl font-bold text-slate-900">
      Inventory
    </h1>

    <p className="text-gray-500 mt-1">
      Inventory Manager
    </p>
  </div>

  <div className="w-full">
    <input
      type="text"
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      placeholder="Search Materials..."
      className="input w-full"
    />
  </div>

</div>
      {lowStock.length>0&&(
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2"><AlertTriangle size={16} className="text-amber-600"/><span className="font-semibold text-amber-800 dark:text-amber-300 text-sm">Low Stock Alert — {lowStock.length} item{lowStock.length>1?'s':''}</span></div>
          <div className="flex flex-wrap gap-2">{lowStock.map((i:any)=><span key={i.materialName} className="badge-yellow text-xs">{i.materialName}: {i.stock} {i.unit}</span>)}</div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="card p-3 text-center"><p className="text-xs text-gray-500">Total Materials</p><p className="text-xl font-bold text-brand-600">{filtered.length}</p></div>
        <div className="card p-3 text-center"><p className="text-xs text-gray-500">Stock Value</p><p className="text-xl font-bold text-emerald-600">{inr(totalValue)}</p></div>
        <div className="card p-3 text-center"><p className="text-xs text-gray-500">Low Stock Items</p><p className="text-xl font-bold text-amber-600">{lowStock.length}</p></div>
      </div>

      <div className="table-container">

  {isLoading ? (
    <Spinner />
  ) : filtered.length === 0 ? (
    <EmptyState message="No inventory data. Add purchases first." />
  ) : (
    <>
      {/* Desktop */}
      <div className="hidden lg:block">
        <table className="table">
          <thead>
            <tr>
              <th>Material</th>
              <th>HSN</th>
              <th>Unit</th>
              <th className="text-right">Purchased</th>
              <th className="text-right">Sold</th>
              <th className="text-right">Stock</th>
              <th className="text-right">Avg Cost</th>
              <th className="text-right">Stock Value</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((i:any) => (
              <tr
                key={i.materialName}
                className={i.isLow ? 'bg-amber-50/40 dark:bg-amber-900/10' : ''}
              >
                <td className="font-medium">{i.materialName}</td>
                <td className="font-mono text-xs">{i.hsnCode || '—'}</td>
                <td>{i.unit}</td>
                <td className="text-right">{i.purchased}</td>
                <td className="text-right">{i.sold}</td>
                <td className={`text-right font-bold ${
                  i.stock <= 0
                    ? 'text-red-600'
                    : i.isLow
                    ? 'text-amber-600'
                    : 'text-emerald-600'
                }`}>
                  {i.stock}
                </td>
                <td className="text-right">{inr(i.avgCost)}</td>
                <td className="text-right font-semibold">
                  {inr(i.stockValue)}
                </td>
                <td>
                  {i.stock <= 0 ? (
                    <span className="badge-red text-xs">Out of Stock</span>
                  ) : i.isLow ? (
                    <span className="badge-yellow text-xs">Low Stock</span>
                  ) : (
                    <span className="badge-green text-xs">In Stock</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>

          <tfoot>
            <tr className="bg-gray-50 dark:bg-gray-800/50 font-bold">
              <td colSpan={7} className="px-4 py-2">
                TOTAL STOCK VALUE
              </td>
              <td className="px-4 py-2 text-right text-emerald-600">
                {inr(totalValue)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Mobile + Tablet */}
      <div className="lg:hidden space-y-3">

        {filtered.map((i:any) => (
          <div
            key={i.materialName}
            className="card overflow-hidden"
          >

            {/* Header */}
            <div className="p-4 bg-slate-50 dark:bg-gray-800 border-b">
              <div className="font-semibold text-base">
                {i.materialName}
              </div>

              <div className="text-xs font-mono text-gray-500 mt-1">
                HSN: {i.hsnCode || '—'}
              </div>
            </div>

            {/* Details */}
            <div className="p-4 space-y-3">

              <div className="grid grid-cols-2 gap-3 text-sm">

                <div>
                  <p className="text-gray-500">Unit</p>
                  <p className="font-medium">{i.unit}</p>
                </div>

                <div>
                  <p className="text-gray-500">Stock</p>
                  <p
                    className={`font-bold ${
                      i.stock <= 0
                        ? 'text-red-600'
                        : i.isLow
                        ? 'text-amber-600'
                        : 'text-emerald-600'
                    }`}
                  >
                    {i.stock}
                  </p>
                </div>

                <div>
                  <p className="text-gray-500">Purchased</p>
                  <p>{i.purchased}</p>
                </div>

                <div>
                  <p className="text-gray-500">Sold</p>
                  <p>{i.sold}</p>
                </div>

                <div>
                  <p className="text-gray-500">Avg Cost</p>
                  <p>{inr(i.avgCost)}</p>
                </div>

                <div>
                  <p className="text-gray-500">Stock Value</p>
                  <p className="font-semibold text-emerald-600">
                    {inr(i.stockValue)}
                  </p>
                </div>

              </div>

              <div>
                {i.stock <= 0 ? (
                  <span className="badge-red text-xs">
                    Out of Stock
                  </span>
                ) : i.isLow ? (
                  <span className="badge-yellow text-xs">
                    Low Stock
                  </span>
                ) : (
                  <span className="badge-green text-xs">
                    In Stock
                  </span>
                )}
              </div>

            </div>
          </div>
        ))}

      </div>
    </>
  )}

</div>
    </div>
  );
}
