'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';

import { api, ApiError } from '@/lib/api';
import { getToken, getNormalizedUserRole } from '@/lib/auth';
import PaginationControls from '@/components/ui/PaginationControls';

type StockStatus = 'In Stock' | 'Low Stock' | 'Out of Stock';
type ExpiryStatus = 'Good' | 'Expiring Soon' | 'Expired' | 'No Expiration';

interface InventoryItem {
	id: string;
	itemName: string;
	currentStock: number;
	reorderThreshold: number;
	unit: string;
	expirationDate?: string | null;
	status?: 'NORMAL' | 'LOW_STOCK' | 'OUT_OF_STOCK';
	expiryStatus?: 'GOOD' | 'EXPIRING_SOON' | 'EXPIRED';
}

interface InventoryResponse {
	success: boolean;
	data: InventoryItem[];
}

interface InventoryMutationResponse {
	success: boolean;
	message?: string;
	data?: InventoryItem;
}

interface MedicineFormState {
	itemName: string;
	currentStock: string;
	reorderThreshold: string;
	unit: string;
	expirationDate: string;
}

type SortKey = 'itemName' | 'currentStock' | 'reorderThreshold' | 'expirationDate';

function getStatus(item: InventoryItem): StockStatus {
	if (item.status === 'OUT_OF_STOCK') return 'Out of Stock';
	if (item.status === 'LOW_STOCK') return 'Low Stock';
	if (item.status === 'NORMAL') return 'In Stock';

	if (item.currentStock <= 0) return 'Out of Stock';
	if (item.currentStock <= item.reorderThreshold) return 'Low Stock';
	return 'In Stock';
}

function getExpiryStatus(item: InventoryItem): ExpiryStatus {
	if (item.expiryStatus === 'EXPIRED') return 'Expired';
	if (item.expiryStatus === 'EXPIRING_SOON') return 'Expiring Soon';
	if (item.expiryStatus === 'GOOD') return 'Good';

	if (!item.expirationDate) return 'No Expiration';

	const exp = new Date(item.expirationDate);
	if (Number.isNaN(exp.getTime())) return 'No Expiration';

	const now = new Date();
	const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));

	if (exp < now) return 'Expired';
	if (exp <= thirtyDaysFromNow) return 'Expiring Soon';
	return 'Good';
}

function formatExpirationDate(value?: string | null): string {
	if (!value) return 'N/A';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return 'N/A';
	return date.toLocaleDateString();
}

const STATUS_STYLE: Record<string, string> = {
	'In Stock': 'bg-green-50 text-green-600 border-green-100',
	'Low Stock': 'bg-yellow-50 text-yellow-600 border-yellow-100',
	'Out of Stock': 'bg-red-50 text-red-500 border-red-100',
};

const EXPIRY_STYLE: Record<ExpiryStatus, string> = {
	Good: 'bg-green-50 text-green-600 border-green-100',
	'Expiring Soon': 'bg-yellow-50 text-yellow-600 border-yellow-100',
	Expired: 'bg-red-50 text-red-500 border-red-100',
	'No Expiration': 'bg-gray-100 text-gray-500 border-gray-200',
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
	const role = getNormalizedUserRole();
	const isDental = role === 'DENTAL';
	const itemNameLabel = isDental ? 'Supply' : 'Medicine';
	const titleText = isDental ? 'Dental Inventory' : 'Medicine Inventory';
	const subtitleText = isDental ? 'Dental Supply Inventory: track stock levels and expiration dates.' : 'Medicine Supply Inventory: track stock levels and expiration dates.';
	
	const [items, setItems] = useState<InventoryItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [updating, setUpdating] = useState(false);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [error, setError] = useState('');
	const [successMessage, setSuccessMessage] = useState('');
	const [isAddModalOpen, setIsAddModalOpen] = useState(false);
	const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
	const [deletingItem, setDeletingItem] = useState<InventoryItem | null>(null);
	const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

	const [search, setSearch] = useState('');
	const [sortKey, setSortKey] = useState<SortKey>('itemName');
	const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(20);
	const [form, setForm] = useState<MedicineFormState>({
		itemName: '',
		currentStock: '',
		reorderThreshold: '',
		unit: '',
		expirationDate: '',
	});
	const [editForm, setEditForm] = useState<MedicineFormState>({
		itemName: '',
		currentStock: '',
		reorderThreshold: '',
		unit: '',
		expirationDate: '',
	});

	async function loadInventory(showLoader = true) {
		const token = getToken();
		if (!token) {
			setError('You are not logged in. Please sign in again.');
			setLoading(false);
			return;
		}

		try {
			if (showLoader) setLoading(true);
			setError('');
			
			let endpoint = '/inventory';
			if (isDental) endpoint += '?category=DENTAL';
			else if (role === 'CLINIC_STAFF' || role === 'DOCTOR') endpoint += '?category=MEDICINE';

			const response = await api.get<InventoryResponse>(endpoint, token);
			setItems(response.data ?? []);
		} catch (err) {
			if (err instanceof ApiError) {
				setError(err.message);
			} else {
				setError('Failed to load inventory.');
			}
		} finally {
			if (showLoader) setLoading(false);
		}
	}

	useEffect(() => {
		void loadInventory();
	}, []);

	useEffect(() => {
		function handleGlobalClick() {
			setOpenActionMenuId(null);
		}

		window.addEventListener('click', handleGlobalClick);
		return () => window.removeEventListener('click', handleGlobalClick);
	}, []);

	function resetForm() {
		setForm({
			itemName: '',
			currentStock: '',
			reorderThreshold: '',
			unit: '',
			expirationDate: '',
		});
	}

	function openEditModal(item: InventoryItem) {
		setEditingItem(item);
		setEditForm({
			itemName: item.itemName,
			currentStock: String(item.currentStock),
			reorderThreshold: String(item.reorderThreshold),
			unit: item.unit,
			expirationDate: item.expirationDate ? item.expirationDate.slice(0, 10) : '',
		});
		setOpenActionMenuId(null);
	}

	async function handleAddMedicine(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const token = getToken();
		if (!token) {
			setError('You are not logged in. Please sign in again.');
			return;
		}

		try {
			setSaving(true);
			setError('');
			setSuccessMessage('');

			const role = getNormalizedUserRole();
			let categoryPayload = {};
			if (role === 'DENTAL') categoryPayload = { category: 'DENTAL' };
			else if (role === 'CLINIC_STAFF' || role === 'DOCTOR') categoryPayload = { category: 'MEDICINE' };

			const payload = {
				itemName: form.itemName.trim(),
				currentStock: Number(form.currentStock),
				reorderThreshold: Number(form.reorderThreshold),
				unit: form.unit.trim(),
				expirationDate: form.expirationDate || null,
				...categoryPayload
			};

			const response = await api.post<InventoryMutationResponse>('/inventory', payload, token);
			setSuccessMessage(response.message || `${itemNameLabel} added successfully.`);
			resetForm();
			setIsAddModalOpen(false);
			await loadInventory(false);
		} catch (err) {
			if (err instanceof ApiError) {
				setError(err.message);
			} else {
				setError(`Failed to add ${itemNameLabel.toLowerCase()}.`);
			}
		} finally {
			setSaving(false);
		}
	}

	async function handleUpdateMedicine(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!editingItem) return;

		const token = getToken();
		if (!token) {
			setError('You are not logged in. Please sign in again.');
			return;
		}

		try {
			setUpdating(true);
			setError('');
			setSuccessMessage('');

			let categoryPayload = {};
			if (isDental) categoryPayload = { category: 'DENTAL' };
			else if (role === 'CLINIC_STAFF' || role === 'DOCTOR') categoryPayload = { category: 'MEDICINE' };

			const payload = {
				itemName: editForm.itemName.trim(),
				currentStock: Number(editForm.currentStock),
				reorderThreshold: Number(editForm.reorderThreshold),
				unit: editForm.unit.trim(),
				expirationDate: editForm.expirationDate || null,
				...categoryPayload
			};

			const response = await api.put<InventoryMutationResponse>(`/inventory/${editingItem.id}`, payload, token);
			setSuccessMessage(response.message || `${itemNameLabel} updated successfully.`);
			setEditingItem(null);
			await loadInventory(false);
		} catch (err) {
			if (err instanceof ApiError) {
				setError(err.message);
			} else {
				setError(`Failed to update ${itemNameLabel.toLowerCase()}.`);
			}
		} finally {
			setUpdating(false);
		}
	}

	async function handleDeleteMedicine(item: InventoryItem) {
		const token = getToken();
		if (!token) {
			setError('You are not logged in. Please sign in again.');
			return;
		}

		try {
			setDeletingId(item.id);
			setError('');
			setSuccessMessage('');
			const response = await api.del<InventoryMutationResponse>(`/inventory/${item.id}`, token);
			setSuccessMessage(response.message || `${item.itemName} removed from inventory.`);
			setDeletingItem(null);
			await loadInventory(false);
		} catch (err) {
			if (err instanceof ApiError) {
				setError(err.message);
			} else {
				setError(`Failed to remove ${itemNameLabel.toLowerCase()}.`);
			}
		} finally {
			setDeletingId(null);
		}
	}

	function toggleSort(key: SortKey) {
		if (sortKey === key) {
			setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'));
			return;
		}
		setSortKey(key);
		setSortDir('asc');
	}

	const withStatus = useMemo(
		() => items.map((item) => ({
			...item,
			statusLabel: getStatus(item),
			expiryLabel: getExpiryStatus(item),
		})),
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
			if (sortKey === 'expirationDate') {
				const aTime = a.expirationDate ? new Date(a.expirationDate).getTime() : Number.MAX_SAFE_INTEGER;
				const bTime = b.expirationDate ? new Date(b.expirationDate).getTime() : Number.MAX_SAFE_INTEGER;
				cmp = aTime - bTime;
			}
			return sortDir === 'asc' ? cmp : -cmp;
		});

		return rows;
	}, [withStatus, q, sortKey, sortDir]);

	useEffect(() => {
		setPage(1);
	}, [search, sortKey, sortDir, items.length]);

	const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
	const currentPage = Math.min(page, totalPages);
	const pagedItems = useMemo(() => {
		const start = (currentPage - 1) * pageSize;
		return filtered.slice(start, start + pageSize);
	}, [filtered, currentPage, pageSize]);

	const lowStock = withStatus.filter((item) => item.statusLabel === 'Low Stock').length;
	const outOfStock = withStatus.filter((item) => item.statusLabel === 'Out of Stock').length;
	const expiredCount = withStatus.filter((item) => item.expiryLabel === 'Expired').length;
	const expiringSoonCount = withStatus.filter((item) => item.expiryLabel === 'Expiring Soon').length;

	return (
		<div className="p-4 sm:p-6 space-y-5">
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
				<div>
					<h1 className="text-xl font-bold text-gray-900">{titleText}</h1>
					<p className="text-xs text-gray-400 mt-0.5">{subtitleText}</p>
				</div>
				<button
					type="button"
					onClick={() => {
						setError('');
						setSuccessMessage('');
						setIsAddModalOpen(true);
					}}
					className="px-4 py-2 text-xs font-semibold rounded-xl bg-teal-500 hover:bg-teal-600 text-white"
				>
					Add {itemNameLabel}
				</button>
			</div>

			{error && (
				<div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
					{error}
				</div>
			)}

			{successMessage && (
				<div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
					{successMessage}
				</div>
			)}

			<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
				<div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
					<p className="text-xs text-gray-400 font-medium">Total Items</p>
					<p className="text-2xl font-bold text-teal-500 mt-1">{items.length}</p>
				</div>
				<div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
					<p className="text-xs text-gray-400 font-medium">Out of Stock</p>
					<p className="text-2xl font-bold text-red-500 mt-1">{outOfStock}</p>
				</div>
				<div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
					<p className="text-xs text-gray-400 font-medium">Expiring Soon / Expired</p>
					<p className="text-2xl font-bold text-orange-500 mt-1">{expiringSoonCount} / {expiredCount}</p>
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
								<th
									className="text-left px-4 py-3 font-semibold cursor-pointer select-none hover:text-teal-500 transition-colors"
									onClick={() => toggleSort('expirationDate')}
								>
									Expiration Date
									<SortIcon active={sortKey === 'expirationDate'} dir={sortDir} />
								</th>
								<th className="text-left px-4 py-3 font-semibold">Status</th>
								<th className="text-left px-4 py-3 font-semibold">Expiry Status</th>
								<th className="text-right px-4 py-3 font-semibold">Actions</th>
							</tr>
						</thead>
						<tbody>
							{loading ? (
								<tr>
									<td colSpan={8} className="px-4 py-10 text-center text-gray-400">Loading inventory...</td>
								</tr>
							) : filtered.length === 0 ? (
								<tr>
									<td colSpan={8} className="px-4 py-10 text-center text-gray-300">No inventory items found.</td>
								</tr>
							) : (
								pagedItems.map((item) => (
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
										<td className="px-4 py-3 text-gray-600">{formatExpirationDate(item.expirationDate)}</td>
										<td className="px-4 py-3">
											<span className={`text-[11px] font-semibold border px-2.5 py-0.5 rounded-full ${STATUS_STYLE[item.statusLabel]}`}>
												{item.statusLabel}
											</span>
										</td>
										<td className="px-4 py-3">
											<span className={`text-[11px] font-semibold border px-2.5 py-0.5 rounded-full ${EXPIRY_STYLE[item.expiryLabel]}`}>
												{item.expiryLabel}
											</span>
										</td>
										<td className="px-4 py-3 text-right">
											<div className="relative inline-block text-left" onClick={(event) => event.stopPropagation()}>
												<button
													type="button"
													onClick={(event) => {
														event.stopPropagation();
														setOpenActionMenuId((current) => (current === item.id ? null : item.id));
													}}
													className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50"
												>
													<span className="text-base leading-none">...</span>
												</button>
												{openActionMenuId === item.id && (
													<div className="absolute right-0 z-20 mt-1 w-28 rounded-lg border border-gray-200 bg-white shadow-md">
														<button
															type="button"
															onClick={() => openEditModal(item)}
															className="block w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50"
														>
															Edit
														</button>
														<button
															type="button"
															onClick={() => {
																setDeletingItem(item);
																setOpenActionMenuId(null);
															}}
															className="block w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50"
														>
															Delete
														</button>
													</div>
												)}
											</div>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
				{!loading && filtered.length > 0 && (
					<PaginationControls
						page={currentPage}
						totalPages={totalPages}
						totalItems={filtered.length}
						pageSize={pageSize}
						pageSizeOptions={[10, 20, 30, 50]}
						itemLabel="inventory items"
						onPageChange={setPage}
						onPageSizeChange={(next) => {
							setPageSize(next);
							setPage(1);
						}}
					/>
				)}
			</div>

			{isAddModalOpen && (
				<div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4">
					<div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
						<div className="border-b border-gray-100 px-5 py-4 flex items-center justify-between">
							<h2 className="text-sm font-semibold text-gray-900">Add {itemNameLabel}</h2>
							<button type="button" onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600">x</button>
						</div>
						<form className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={handleAddMedicine}>
							<input type="text" value={form.itemName} onChange={(event) => setForm((prev) => ({ ...prev, itemName: event.target.value }))} placeholder={`${itemNameLabel} name`} required className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-300" />
							<input type="number" min={1} value={form.currentStock} onChange={(event) => setForm((prev) => ({ ...prev, currentStock: event.target.value }))} placeholder="Current stock" required className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-300" />
							<input type="number" min={1} value={form.reorderThreshold} onChange={(event) => setForm((prev) => ({ ...prev, reorderThreshold: event.target.value }))} placeholder="Reorder threshold" required className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-300" />
							<input type="text" value={form.unit} onChange={(event) => setForm((prev) => ({ ...prev, unit: event.target.value }))} placeholder="Unit (e.g. tablets, bottles)" required className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-300" />
							<input type="date" value={form.expirationDate} onChange={(event) => setForm((prev) => ({ ...prev, expirationDate: event.target.value }))} className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-300 md:col-span-2" />
							<div className="md:col-span-2 flex items-center justify-end gap-2 pt-1">
								<button type="button" onClick={() => setIsAddModalOpen(false)} className="px-3 py-2 text-xs font-semibold rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
								<button type="submit" disabled={saving} className="px-4 py-2 text-xs font-semibold rounded-xl bg-teal-500 hover:bg-teal-600 text-white disabled:opacity-60">{saving ? 'Adding...' : `Add ${itemNameLabel}`}</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{editingItem && (
				<div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4">
					<div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
						<div className="border-b border-gray-100 px-5 py-4 flex items-center justify-between">
							<h2 className="text-sm font-semibold text-gray-900">Edit {itemNameLabel}</h2>
							<button type="button" onClick={() => setEditingItem(null)} className="text-gray-400 hover:text-gray-600">x</button>
						</div>
						<form className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={handleUpdateMedicine}>
							<div>
								<label className="block mb-1 text-xs font-semibold text-gray-600">{itemNameLabel} Name</label>
								<input type="text" value={editForm.itemName} onChange={(event) => setEditForm((prev) => ({ ...prev, itemName: event.target.value }))} placeholder={`${itemNameLabel} name`} required className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-300" />
							</div>
							<div>
								<label className="block mb-1 text-xs font-semibold text-gray-600">Current Stock</label>
								<input type="number" min={0} value={editForm.currentStock} onChange={(event) => setEditForm((prev) => ({ ...prev, currentStock: event.target.value }))} placeholder="Current stock" required className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-300" />
							</div>
							<div>
								<label className="block mb-1 text-xs font-semibold text-gray-600">Reorder Threshold</label>
								<input type="number" min={1} value={editForm.reorderThreshold} onChange={(event) => setEditForm((prev) => ({ ...prev, reorderThreshold: event.target.value }))} placeholder="Reorder threshold" required className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-300" />
							</div>
							<div>
								<label className="block mb-1 text-xs font-semibold text-gray-600">Unit</label>
								<input type="text" value={editForm.unit} onChange={(event) => setEditForm((prev) => ({ ...prev, unit: event.target.value }))} placeholder="Unit" required className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-300" />
							</div>
							<div className="md:col-span-2">
								<label className="block mb-1 text-xs font-semibold text-gray-600">Expiration Date (Optional)</label>
								<input type="date" value={editForm.expirationDate} onChange={(event) => setEditForm((prev) => ({ ...prev, expirationDate: event.target.value }))} className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-300" />
							</div>
							<div className="md:col-span-2 flex items-center justify-end gap-2 pt-1">
								<button type="button" onClick={() => setEditingItem(null)} className="px-3 py-2 text-xs font-semibold rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
								<button type="submit" disabled={updating} className="px-4 py-2 text-xs font-semibold rounded-xl bg-teal-500 hover:bg-teal-600 text-white disabled:opacity-60">{updating ? 'Saving...' : 'Save Changes'}</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{deletingItem && (
				<div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4">
					<div className="w-full max-w-md rounded-2xl bg-white shadow-xl p-5 space-y-4">
						<h2 className="text-sm font-semibold text-gray-900">Delete {itemNameLabel}</h2>
						<p className="text-xs text-gray-600">Are you sure you want to delete <span className="font-semibold text-gray-800">{deletingItem.itemName}</span>?</p>
						<div className="flex items-center justify-end gap-2">
							<button type="button" onClick={() => setDeletingItem(null)} className="px-3 py-2 text-xs font-semibold rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
							<button type="button" disabled={deletingId === deletingItem.id} onClick={() => void handleDeleteMedicine(deletingItem)} className="px-4 py-2 text-xs font-semibold rounded-xl bg-red-500 hover:bg-red-600 text-white disabled:opacity-60">{deletingId === deletingItem.id ? 'Deleting...' : 'Delete'}</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
