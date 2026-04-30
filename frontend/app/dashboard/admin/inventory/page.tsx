'use client';

import { useEffect, useMemo, useState } from 'react';

import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';

interface InventoryItem {
	id: string;
	itemName: string;
	currentStock: number;
	reorderThreshold: number;
	unit: string;
}

interface InventoryResponse {
	success: boolean;
	data: InventoryItem[];
}

type SortKey = 'itemName' | 'currentStock' | 'reorderThreshold';

function getStatus(item: InventoryItem): 'In Stock' | 'Low Stock' | 'Out of Stock' {
	if (item.currentStock <= 0) return 'Out of Stock';
	if (item.currentStock <= item.reorderThreshold) return 'Low Stock';
	return 'In Stock';
}

const STATUS_STYLE: Record<string, string> = {
	'In Stock': 'bg-green-50 text-green-600 border-green-100',
	'Low Stock': 'bg-yellow-50 text-yellow-600 border-yellow-100',
	'Out of Stock': 'bg-red-50 text-red-500 border-red-100',
};

function getStockLevelPercent(item: InventoryItem): number {
	if (item.currentStock <= 0) return 0;
	const relativeCap = Math.max(item.currentStock, item.reorderThreshold * 2, 1);
	const rawPercent = Math.round((item.currentStock / relativeCap) * 100);
	return Math.max(8, Math.min(100, rawPercent));
}

function getStockLevelClass(item: InventoryItem): string {
	const status = getStatus(item);
	if (status === 'Out of Stock') return 'bg-red-500';
	if (status === 'Low Stock') return 'bg-yellow-500';
	return 'bg-green-500';
}

function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
	return (
		<span className="inline-flex flex-col ml-1 gap-[1px]">
			<svg className={`w-2.5 h-2.5 ${active && dir === 'asc' ? 'text-teal-500' : 'text-gray-300'}`} viewBox="0 0 10 6" fill="currentColor"><path d="M5 0l5 6H0z" /></svg>
			<svg className={`w-2.5 h-2.5 ${active && dir === 'desc' ? 'text-teal-500' : 'text-gray-300'}`} viewBox="0 0 10 6" fill="currentColor"><path d="M5 6l5-6H0z" /></svg>
		</span>
	);
}

export default function AdminInventoryPage() {
	const [items, setItems] = useState<InventoryItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	const [search, setSearch] = useState('');
	const [sortKey, setSortKey] = useState<SortKey>('itemName');
	const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

	async function loadInventory() {
		const token = getToken();
		if (!token) {
			setError('You are not logged in. Please sign in again.');
			setLoading(false);
			return;
		}

		try {
			setError('');
			const response = await api.get<InventoryResponse>('/inventory', token);
			setItems(response.data ?? []);
		} catch (err) {
			if (err instanceof ApiError) {
				setError(err.message);
			} else {
				setError('Failed to load inventory.');
			}
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		void loadInventory();
	}, []);

	function toggleSort(key: SortKey) {
		if (sortKey === key) {
			setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'));
			return;
		}
		setSortKey(key);
		setSortDir('asc');
	}

	const withStatus = useMemo(
		() => items.map((item) => ({ ...item, status: getStatus(item) })),
		[items],
	);

	const q = search.toLowerCase().trim();
	const filtered = useMemo(() => {
		const rows = q
			? withStatus.filter((item) => item.itemName.toLowerCase().includes(q) || item.unit.toLowerCase().includes(q))
			: [...withStatus];

		rows.sort((a, b) => {
			let cmp = 0;
			if (sortKey === 'itemName') cmp = a.itemName.localeCompare(b.itemName);
			if (sortKey === 'currentStock') cmp = a.currentStock - b.currentStock;
			if (sortKey === 'reorderThreshold') cmp = a.reorderThreshold - b.reorderThreshold;
			return sortDir === 'asc' ? cmp : -cmp;
		});

		return rows;
	}, [withStatus, q, sortKey, sortDir]);

	const lowStock = withStatus.filter((item) => item.status === 'Low Stock').length;
	const outOfStock = withStatus.filter((item) => item.status === 'Out of Stock').length;

	return (
		<div className="p-4 sm:p-6 space-y-5">
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
				<div>
					<h1 className="text-xl font-bold text-gray-900">Medicine Inventory</h1>
					<p className="text-xs text-gray-400 mt-0.5">Read-only inventory view for admin</p>
				</div>
			</div>

			{error && (
				<div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
					{error}
				</div>
			)}

			<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
				<div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
					<p className="text-xs text-gray-400 font-medium">Total Items</p>
					<p className="text-2xl font-bold text-teal-500 mt-1">{items.length}</p>
				</div>
				<div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
					<p className="text-xs text-gray-400 font-medium">Low Stock</p>
					<p className="text-2xl font-bold text-yellow-500 mt-1">{lowStock}</p>
				</div>
				<div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
					<p className="text-xs text-gray-400 font-medium">Out of Stock</p>
					<p className="text-2xl font-bold text-red-500 mt-1">{outOfStock}</p>
				</div>
				<div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
					<p className="text-xs text-gray-400 font-medium">Threshold Alerts</p>
					<p className="text-2xl font-bold text-orange-500 mt-1">{lowStock + outOfStock}</p>
				</div>
			</div>

			<div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
				<div className="p-4 border-b border-gray-50">
					<div className="relative max-w-xs flex-1">
						<svg className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
						</svg>
						<input
							type="text"
							value={search}
							onChange={(event) => setSearch(event.target.value)}
							placeholder="Search item name or unit..."
							className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-300 placeholder-gray-300"
						/>
					</div>
				</div>

				<div className="overflow-x-auto">
					<table className="w-full text-xs">
						<thead>
							<tr className="border-b border-gray-100 text-gray-400">
								<th
									className="text-left px-4 py-3 font-semibold cursor-pointer select-none hover:text-teal-500 transition-colors"
									onClick={() => toggleSort('itemName')}
								>
									Item Name
									<SortIcon active={sortKey === 'itemName'} dir={sortDir} />
								</th>
								<th
									className="text-right px-4 py-3 font-semibold cursor-pointer select-none hover:text-teal-500 transition-colors"
									onClick={() => toggleSort('currentStock')}
								>
									Stock Level
									<SortIcon active={sortKey === 'currentStock'} dir={sortDir} />
								</th>
								<th
									className="text-right px-4 py-3 font-semibold cursor-pointer select-none hover:text-teal-500 transition-colors"
									onClick={() => toggleSort('reorderThreshold')}
								>
									Reorder Threshold
									<SortIcon active={sortKey === 'reorderThreshold'} dir={sortDir} />
								</th>
								<th className="text-left px-4 py-3 font-semibold">Unit</th>
								<th className="text-left px-4 py-3 font-semibold">Status</th>
							</tr>
						</thead>
						<tbody>
							{loading ? (
								<tr>
									<td colSpan={5} className="px-4 py-10 text-center text-gray-400">Loading inventory...</td>
								</tr>
							) : filtered.length === 0 ? (
								<tr>
									<td colSpan={5} className="px-4 py-10 text-center text-gray-300">No inventory items found.</td>
								</tr>
							) : (
								filtered.map((item) => (
									<tr key={item.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
										<td className="px-4 py-3 font-semibold text-gray-800">{item.itemName}</td>
										<td className="px-4 py-3 text-right text-gray-700">
											<div className="space-y-1.5 max-w-[180px] ml-auto">
												<p className="text-xs text-gray-700 text-right">{item.currentStock} {item.unit}</p>
												<div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
													<div
														className={`h-full rounded-full ${getStockLevelClass(item)}`}
														style={{ width: `${getStockLevelPercent(item)}%` }}
													/>
												</div>
											</div>
										</td>
										<td className="px-4 py-3 text-right text-gray-600">{item.reorderThreshold}</td>
										<td className="px-4 py-3 text-gray-600">{item.unit}</td>
										<td className="px-4 py-3">
											<span className={`text-[11px] font-semibold border px-2.5 py-0.5 rounded-full ${STATUS_STYLE[item.status]}`}>
												{item.status}
											</span>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
