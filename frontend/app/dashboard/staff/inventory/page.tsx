/**
 * MEDICINE INVENTORY PAGE
 * ──────────────────────────────────────────────────────────────
 * Route: /dashboard/staff/inventory
 * TODO: Replace MOCK_MEDICINES with GET /api/inventory
 */

'use client';

import { useState, useMemo } from 'react';

// ── Types ─────────────────────────────────────────────────────
interface Medicine {
  id:          string;
  brand:       string;
  generic:     string;
  category:    string;
  qty:         number;
  unit:        string;
  expiration:  string; // ISO date
  supplier:    string;
}

type SortKey = 'brand' | 'generic' | 'category' | 'qty' | 'expiration';

// ── Helpers ───────────────────────────────────────────────────
const LOW_STOCK_THRESHOLD = 50;

function getStatus(m: Medicine): 'In Stock' | 'Low Stock' | 'Out of Stock' | 'Expired' {
  const expired = new Date(m.expiration) < new Date();
  if (expired)    return 'Expired';
  if (m.qty === 0) return 'Out of Stock';
  if (m.qty <= LOW_STOCK_THRESHOLD) return 'Low Stock';
  return 'In Stock';
}

const STATUS_STYLE: Record<string, string> = {
  'In Stock':    'bg-green-50  text-green-600  border-green-100',
  'Low Stock':   'bg-yellow-50 text-yellow-600 border-yellow-100',
  'Out of Stock':'bg-red-50    text-red-500    border-red-100',
  'Expired':     'bg-pink-50   text-pink-500   border-pink-100',
};

function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

// ── Mock data ─────────────────────────────────────────────────
const INITIAL_MEDICINES: Medicine[] = [
  { id: 'm1', brand: 'Biogesic',      generic: 'Paracetamol',                                               category: 'Analgesic',     qty: 500, unit: 'tablets',  expiration: '2025-12-31', supplier: 'Unilab' },
  { id: 'm2', brand: 'Neozep',        generic: 'Phenylephrine HCl + Chlorphenamine Maleate + Paracetamol', category: 'Cold/Flu',      qty: 45,  unit: 'tablets',  expiration: '2024-10-15', supplier: 'United Lab' },
  { id: 'm3', brand: 'Kremil-S',      generic: 'Aluminum Hydroxide + Magnesium Hydroxide + Simeticone',   category: 'Antacid',       qty: 200, unit: 'tablets',  expiration: '2025-06-30', supplier: 'Wyeth' },
  { id: 'm4', brand: 'Amoxicillin',   generic: 'Amoxicillin',                                               category: 'Antibiotic',    qty: 0,   unit: 'capsules', expiration: '2024-05-20', supplier: 'GSK' },
  { id: 'm5', brand: 'Mefenamic Acid',generic: 'Mefenamic Acid',                                            category: 'Pain Reliever', qty: 20,  unit: 'capsules', expiration: '2023-12-01', supplier: 'Generics Pharma' },
  { id: 'm6', brand: 'Cetirizine',    generic: 'Cetirizine HCl',                                            category: 'Antihistamine', qty: 150, unit: 'tablets',  expiration: '2026-03-15', supplier: 'Interphil' },
  { id: 'm7', brand: 'Salbutamol',    generic: 'Salbutamol Sulfate',                                        category: 'Bronchodilator',qty: 30,  unit: 'puffs',    expiration: '2026-01-10', supplier: 'GlaxoSmithKline' },
];

const CATEGORIES = ['Analgesic','Cold/Flu','Antacid','Antibiotic','Pain Reliever','Antihistamine','Bronchodilator','Vitamins','Other'];

// ── Sort icon ─────────────────────────────────────────────────
function SortIcon({ active, dir }: { active: boolean; dir: 'asc'|'desc' }) {
  return (
    <span className="inline-flex flex-col ml-1 gap-[1px]">
      <svg className={`w-2.5 h-2.5 ${active && dir === 'asc' ? 'text-teal-500' : 'text-gray-300'}`} viewBox="0 0 10 6" fill="currentColor"><path d="M5 0l5 6H0z"/></svg>
      <svg className={`w-2.5 h-2.5 ${active && dir === 'desc' ? 'text-teal-500' : 'text-gray-300'}`} viewBox="0 0 10 6" fill="currentColor"><path d="M5 6l5-6H0z"/></svg>
    </span>
  );
}

// ── Add Medicine Modal ────────────────────────────────────────
interface AddModalProps { onClose: () => void; onAdd: (m: Medicine) => void; }
function AddMedicineModal({ onClose, onAdd }: AddModalProps) {
  const blank = { brand:'', generic:'', category:'Analgesic', qty:'', unit:'', expiration:'', supplier:'' };
  const [form, setForm] = useState(blank);
  const set = (k: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.brand || !form.generic || !form.qty || !form.unit || !form.expiration) return;
    onAdd({
      id: `m${Date.now()}`, brand: form.brand, generic: form.generic,
      category: form.category, qty: parseInt(form.qty), unit: form.unit,
      expiration: form.expiration, supplier: form.supplier,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor:'rgba(0,0,0,0.4)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Add New Medicine</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">Brand Name</label>
            <input value={form.brand} onChange={set('brand')} placeholder="e.g. Biogesic" required
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300 placeholder-gray-300"/>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">Generic Name</label>
            <input value={form.generic} onChange={set('generic')} placeholder="e.g. Paracetamol" required
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300 placeholder-gray-300"/>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">Category</label>
            <select value={form.category} onChange={set('category')}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300">
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Quantity</label>
              <input type="number" min={0} value={form.qty} onChange={set('qty')} required
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Unit</label>
              <input value={form.unit} onChange={set('unit')} placeholder="e.g. tablets" required
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300 placeholder-gray-300"/>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">Expiration Date</label>
            <input type="date" value={form.expiration} onChange={set('expiration')} required
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"/>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">Supplier</label>
            <input value={form.supplier} onChange={set('supplier')} placeholder="e.g. Unilab"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300 placeholder-gray-300"/>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-semibold border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
            <button type="submit"
              className="px-5 py-2 text-sm font-semibold bg-teal-500 hover:bg-teal-600 text-white rounded-xl transition-colors">Add Medicine</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────
export default function InventoryPage() {
  const [medicines, setMedicines] = useState<Medicine[]>(INITIAL_MEDICINES);
  const [search,    setSearch]    = useState('');
  const [sortKey,   setSortKey]   = useState<SortKey>('brand');
  const [sortDir,   setSortDir]   = useState<'asc'|'desc'>('asc');
  const [showAdd,   setShowAdd]   = useState(false);

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir('asc'); }
  }

  const withStatus = useMemo(() => medicines.map((m) => ({ ...m, status: getStatus(m) })), [medicines]);
  const lowStock  = withStatus.filter((m) => m.status === 'Low Stock').length;
  const expired   = withStatus.filter((m) => m.status === 'Expired').length;
  const outOfStock= withStatus.filter((m) => m.status === 'Out of Stock').length;

  const q = search.toLowerCase();
  const filtered = useMemo(() => {
    const rows = q
      ? withStatus.filter((m) => m.brand.toLowerCase().includes(q) || m.generic.toLowerCase().includes(q) || m.category.toLowerCase().includes(q))
      : [...withStatus];
    rows.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'brand')      cmp = a.brand.localeCompare(b.brand);
      if (sortKey === 'generic')    cmp = a.generic.localeCompare(b.generic);
      if (sortKey === 'category')   cmp = a.category.localeCompare(b.category);
      if (sortKey === 'qty')        cmp = a.qty - b.qty;
      if (sortKey === 'expiration') cmp = a.expiration.localeCompare(b.expiration);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return rows;
  }, [withStatus, q, sortKey, sortDir]);

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {showAdd && <AddMedicineModal onClose={() => setShowAdd(false)} onAdd={(m) => { setMedicines((prev) => [...prev, m]); setShowAdd(false); }} />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Medicine Inventory</h1>
          <p className="text-xs text-gray-400 mt-0.5">Track stock levels and expiration dates</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 text-sm font-semibold bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-xl transition-colors self-start sm:self-auto">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
          Add Medicine
        </button>
      </div>

      {/* Analytics stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-400 font-medium">Total Medicines</p>
          <p className="text-2xl font-bold text-teal-500 mt-1">{medicines.length}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Items in inventory</p>
        </div>
        <div className={`bg-white rounded-2xl border shadow-sm p-4 ${lowStock > 0 ? 'border-yellow-200' : 'border-gray-100'}`}>
          <p className="text-xs text-gray-400 font-medium">Low Stock</p>
          <p className={`text-2xl font-bold mt-1 ${lowStock > 0 ? 'text-yellow-500' : 'text-gray-300'}`}>{lowStock}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {lowStock > 0 ? `${lowStock} item${lowStock > 1 ? 's' : ''} below threshold` : 'All items sufficient'}
          </p>
        </div>
        <div className={`bg-white rounded-2xl border shadow-sm p-4 ${outOfStock > 0 ? 'border-red-200' : 'border-gray-100'}`}>
          <p className="text-xs text-gray-400 font-medium">Out of Stock</p>
          <p className={`text-2xl font-bold mt-1 ${outOfStock > 0 ? 'text-red-500' : 'text-gray-300'}`}>{outOfStock}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {outOfStock > 0 ? `${outOfStock} item${outOfStock > 1 ? 's' : ''} need restocking` : 'No items empty'}
          </p>
        </div>
        <div className={`bg-white rounded-2xl border shadow-sm p-4 ${expired > 0 ? 'border-red-200' : 'border-gray-100'}`}>
          <p className="text-xs text-gray-400 font-medium">Expired</p>
          <p className={`text-2xl font-bold mt-1 ${expired > 0 ? 'text-pink-500' : 'text-gray-300'}`}>{expired}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {expired > 0 ? `${expired} item${expired > 1 ? 's' : ''} past expiry date` : 'No expired items'}
          </p>
        </div>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-50">
          <div className="relative max-w-xs">
            <svg className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/></svg>
            <input type="text" placeholder="Search medicine..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-300 placeholder-gray-300"/>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400">
                {([['brand','Name'],['generic','Generic Name'],['category','Category'],['qty','Stock'],['expiration','Expiration']] as [SortKey,string][]).map(([k,label]) => (
                  <th key={k} onClick={() => toggleSort(k)}
                    className="text-left px-4 py-3 font-semibold cursor-pointer select-none hover:text-teal-500 transition-colors whitespace-nowrap">
                    {label}<SortIcon active={sortKey===k} dir={sortDir}/>
                  </th>
                ))}
                <th className="text-left px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
                  <td className="px-4 py-3 font-semibold text-gray-800">{m.brand}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-[260px] truncate">{m.generic}</td>
                  <td className="px-4 py-3 text-gray-600">{m.category}</td>
                  <td className="px-4 py-3">
                    <span className={`font-bold ${
                      m.status === 'In Stock' ? 'text-gray-800' : 'text-red-500'
                    }`}>{m.qty} {m.unit}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(m.expiration)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-semibold border px-2.5 py-0.5 rounded-full ${STATUS_STYLE[m.status]}`}>{m.status}</span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-300">No medicines match your search.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-50 text-[11px] text-gray-400">
          Showing {filtered.length} of {medicines.length} medicines
        </div>
      </div>
    </div>
  );
}
