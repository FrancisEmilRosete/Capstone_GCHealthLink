'use client';

import React, { useEffect, useMemo, useState, type FormEvent } from 'react';

import { api, ApiError } from '@/lib/api';
import { getToken, getNormalizedUserRole } from '@/lib/auth';
import PaginationControls from '@/components/ui/PaginationControls';
import toast from 'react-hot-toast';

type StockStatus = 'In Stock' | 'Low Stock' | 'Out of Stock';
type ExpiryStatus = 'Good' | 'Expiring Soon' | 'Expired' | 'No Expiration';

interface InventoryBatch {
	id: string;
	inventoryId: string;
	batchNumber: string;
	currentStock: number;
	expirationDate?: string | null;
	expiryStatus?: 'GOOD' | 'EXPIRING_SOON' | 'EXPIRED';
}

interface InventoryItem {
	id: string;
	itemName: string;
	currentStock: number;
	reorderThreshold: number;
	unit: string;
	status?: 'NORMAL' | 'LOW_STOCK' | 'OUT_OF_STOCK';
	expiryStatus?: string;
	formDosage?: string | null;
	dosageValue?: string | null;
	batches: InventoryBatch[];
}

interface InventoryResponse {
	success: boolean;
	data: InventoryItem[];
}

interface AuditLog {
	id: string;
	action: string;
	description: string;
	timestamp: string;
	actionType?: string;
	targetId?: string;
	metadata?: any;
	user?: {
		email: string;
		role: string;
		studentProfile?: {
			firstName: string;
			lastName: string;
		};
	};
	User?: {
		email: string;
		role: string;
		StudentProfile?: {
			firstName: string;
			lastName: string;
		};
	};
}

interface InventoryMutationResponse {
	success: boolean;
	message?: string;
	data?: InventoryItem;
}

interface MedicineFormState {
	itemName: string;
	formDosage: string;
	dosageValue: string;
	lotNumber?: string;
	currentStock?: string;
	reorderThreshold: string;
	unit: string;
	expirationDate?: string;
}

type SortKey = 'itemName' | 'currentStock' | 'reorderThreshold';

function getStatus(item: InventoryItem): StockStatus {
	if (item.status === 'OUT_OF_STOCK') return 'Out of Stock';
	if (item.status === 'LOW_STOCK') return 'Low Stock';
	if (item.status === 'NORMAL') return 'In Stock';

	if (item.currentStock <= 0) return 'Out of Stock';
	if (item.currentStock <= item.reorderThreshold) return 'Low Stock';
	return 'In Stock';
}

function getExpiryStatus(item: InventoryItem): ExpiryStatus {
	if (item.expiryStatus && item.expiryStatus.includes('Expiring Soon')) return 'Expiring Soon';
	if (item.expiryStatus === 'EXPIRED') return 'Expired';
	if (item.expiryStatus === 'GOOD') return 'Good';
	if (item.expiryStatus?.includes('batches expiring soon')) return 'Expiring Soon';

	return 'Good';
}

function getBatchExpiryStatus(batch: InventoryBatch): ExpiryStatus {
	if (batch.expiryStatus === 'EXPIRED') return 'Expired';
	if (batch.expiryStatus === 'EXPIRING_SOON') return 'Expiring Soon';
	if (batch.expiryStatus === 'GOOD') return 'Good';

	if (!batch.expirationDate) return 'No Expiration';

	const exp = new Date(batch.expirationDate);
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
	const isStaff = role === 'CLINIC_STAFF';
	const isDoctor = role === 'DOCTOR';
	const isReadOnly = isDoctor || role === 'ADMIN';
	const itemNameLabel = isDental ? 'Supply' : 'Medicine';
	const titleText = isDental ? 'Dental Inventory' : 'Medicine Inventory';
	const subtitleText = isDental ? 'Dental Supply Inventory: track stock levels and expiration dates.' : 'Medicine Supply Inventory: track stock levels and expiration dates.';
	
	const [items, setItems] = useState<InventoryItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [updating, setUpdating] = useState(false);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [isAddModalOpen, setIsAddModalOpen] = useState(false);
	const [isAddBatchModalOpen, setIsAddBatchModalOpen] = useState(false);
	const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
	const [editingBatch, setEditingBatch] = useState<{ parent: InventoryItem, batch: InventoryBatch } | null>(null);
	const [deletingItem, setDeletingItem] = useState<InventoryItem | null>(null);
	const [deletingBatch, setDeletingBatch] = useState<{ parent: InventoryItem, batch: InventoryBatch } | null>(null);
	const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
	const [openBatchActionId, setOpenBatchActionId] = useState<string | null>(null);
	const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

	const [history, setHistory] = useState<AuditLog[]>([]);
	const [historyLoading, setHistoryLoading] = useState(false);
	const [historyPage, setHistoryPage] = useState(1);

	const userProfile = useMemo(() => {
		try {
			const token = getToken();
			if (!token) return 'Staff Member';
			const payload = JSON.parse(atob(token.split('.')[1]));
			return payload.email || 'Staff Member';
		} catch {
			return 'Staff Member';
		}
	}, []);

	const [search, setSearch] = useState('');
	const [statusFilter, setStatusFilter] = useState<'All' | 'Out of Stock' | 'Expiring Soon' | 'Expired' | 'Threshold Alerts'>('All');
	const [sortKey, setSortKey] = useState<SortKey>('itemName');
	const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(5);
	const [form, setForm] = useState<MedicineFormState>({
		itemName: '',
		formDosage: '',
		dosageValue: '',
		lotNumber: '',
		currentStock: '',
		reorderThreshold: '',
		unit: '',
		expirationDate: '',
	});
	const [editForm, setEditForm] = useState<MedicineFormState>({
		itemName: '',
		formDosage: '',
		dosageValue: '',
		lotNumber: '',
		currentStock: '',
		reorderThreshold: '',
		unit: '',
		expirationDate: '',
	});
	const [batchForm, setBatchForm] = useState({
		lotNumber: '',
		currentStock: '',
		expirationDate: '',
	});

	function toggleRow(id: string) {
		setExpandedRows(prev => {
			const newSet = new Set(prev);
			if (newSet.has(id)) newSet.delete(id);
			else newSet.add(id);
			return newSet;
		});
	}

	async function loadInventory(showLoader = true) {
		const token = getToken();
		if (!token) {
			toast.error('You are not logged in. Please sign in again.');
			setLoading(false);
			return;
		}

		try {
			if (showLoader) setLoading(true);
			
			let endpoint = '/inventory';
			if (isDental) endpoint += '?category=DENTAL';
			else if (role === 'CLINIC_STAFF' || role === 'DOCTOR') endpoint += '?category=MEDICINE';

			const response = await api.get<InventoryResponse>(endpoint, token);
			setItems(response.data ?? []);
		} catch (err) {
			if (err instanceof ApiError) {
				toast.error(err.message);
			} else {
				toast.error('Failed to load inventory.');
			}
		} finally {
			if (showLoader) setLoading(false);
		}
	}

	async function loadHistory() {
		const token = getToken();
		if (!token) return;
		try {
			setHistoryLoading(true);
			// Load sequentially to avoid database connection pool spikes on lower-tier databases
			const res1 = await api.get<{ data: AuditLog[] }>('/audit?search=INVENTORY&limit=100', token);
			const res2 = await api.get<{ data: AuditLog[] }>('/audit?search=DISPENSED_MEDICINE&limit=100', token);
			
			const combined = [...(res1.data || []), ...(res2.data || [])];
			combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
			setHistory(combined);
		} catch (err: any) {
			toast.error(err.message || 'Failed to load history');
		} finally {
			setHistoryLoading(false);
		}
	}

	useEffect(() => {
		void loadInventory();
		void loadHistory();
	}, []);

	useEffect(() => {
		function handleGlobalClick() {
			setOpenActionMenuId(null);
		}

		window.addEventListener('click', handleGlobalClick);
		return () => window.removeEventListener('click', handleGlobalClick);
	}, []);

	function getLogActionName(log: AuditLog) {
		if (log.action) return log.action;
		if (log.description && log.description.includes('_')) return log.description;
		return log.actionType || 'UNKNOWN_ACTION';
	}

	function getLogDescription(log: AuditLog) {
		const actionName = getLogActionName(log);
		let desc = log.description || '';
		const m = log.metadata || {};
		
		let relatedItem = items.find(i => i.id === log.targetId);
		let batchNumber = m.batchNumber || '';

		if (!relatedItem && m.path) {
			const match = m.path.match(/\/batches\/([^/?]+)/);
			if (match) {
				const batchId = match[1];
				relatedItem = items.find(i => i.batches?.some((b: any) => b.id === batchId));
				if (relatedItem && !batchNumber) {
					const batch = relatedItem.batches?.find((b: any) => b.id === batchId);
					if (batch) batchNumber = batch.batchNumber;
				}
			}
		}

		const itemName = m.itemName || relatedItem?.itemName;
		const dosageValue = m.dosageValue || relatedItem?.dosageValue;

		if (desc === actionName || !desc) {
			if (actionName === 'DISPENSED_MEDICINE') {
				desc = 'Dispensed medicine to student.';
			} else if (actionName === 'ADDED_INVENTORY_ITEM') {
				desc = itemName ? `Added ${itemName}${dosageValue && dosageValue !== 'N/A' ? ` (${dosageValue})` : ''} to inventory.` : 'Added new item to inventory.';
			} else if (actionName === 'UPDATED_INVENTORY_ITEM') {
				desc = itemName ? `Updated details for ${itemName}.` : 'Updated existing inventory item details.';
			} else if (actionName === 'REMOVED_INVENTORY_ITEM') {
				desc = itemName ? `Removed ${itemName} from inventory.` : 'Removed item from inventory.';
			} else if (actionName === 'ADDED_INVENTORY_BATCH') {
				desc = itemName ? `Added batch ${batchNumber} to ${itemName} (+${m.stockAdded || 0} stocks).` : 'Added a new batch to an inventory item.';
			} else if (actionName === 'UPDATED_INVENTORY_BATCH') {
				desc = itemName ? `Updated batch ${batchNumber} of ${itemName} (Stock: ${m.stock || 0}).` : 'Updated existing batch details.';
			} else if (actionName === 'REMOVED_INVENTORY_BATCH') {
				desc = itemName ? `Removed batch ${batchNumber} from ${itemName}.` : 'Removed a batch from an inventory item.';
			} else {
				desc = 'System logged action.';
			}
		}
		return desc;
	}

	function generateHistoryReport() {
		if (!history.length) return;
		const header = ['Date', 'User', 'Action', 'Description'];
		const rows = history.map(log => {
			const actionName = getLogActionName(log);
			let desc = getLogDescription(log);
			if (actionName === 'DISPENSED_MEDICINE' && log.metadata) {
				const m = log.metadata;
				desc = `Given to ${m.studentName || 'Unknown'} (${m.totalMedicinesDispensed || 0} meds). ${desc}`;
			}
			const userObj = log.User || log.user;
			const profile = (log.User?.StudentProfile) || (log.user?.studentProfile);
			return [
				new Date(log.timestamp).toLocaleString(),
				profile ? `${profile.firstName} ${profile.lastName}` : userObj?.email || 'Unknown',
				actionName,
				`"${desc.replace(/"/g, '""')}"`
			];
		});
		const csvContent = [header, ...rows].map(e => e.join(',')).join('\n');
		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.setAttribute('download', 'inventory_history_report.csv');
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}

	function resetForm() {
		setForm({
			itemName: '',
			formDosage: '',
			dosageValue: '',
			lotNumber: '',
			currentStock: '',
			reorderThreshold: '',
			unit: '',
			expirationDate: '',
		});
		setEditForm({
			itemName: '',
			formDosage: '',
			dosageValue: '',
			lotNumber: '',
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
			formDosage: item.formDosage || '',
			dosageValue: item.dosageValue || '',
			currentStock: String(item.currentStock),
			reorderThreshold: String(item.reorderThreshold),
			unit: item.unit,
		});
		setOpenActionMenuId(null);
	}

	async function handleAddMedicine(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const token = getToken();
		if (!token) {
			toast.error('You are not logged in. Please sign in again.');
			return;
		}

		try {
			setSaving(true);

			const role = getNormalizedUserRole();
			let categoryPayload = {};
			if (role === 'DENTAL') categoryPayload = { category: 'DENTAL' };
			else if (role === 'CLINIC_STAFF' || role === 'DOCTOR') categoryPayload = { category: 'MEDICINE' };

			const payload = {
				itemName: form.itemName.trim(),
				formDosage: form.formDosage.trim(),
				dosageValue: form.dosageValue.trim(),
				lotNumber: form.lotNumber?.trim() || '',
				currentStock: Number(form.currentStock),
				reorderThreshold: Number(form.reorderThreshold),
				unit: form.formDosage.trim() || 'pcs',
				expirationDate: form.expirationDate || null,
				...categoryPayload
			};

			const response = await api.post<InventoryMutationResponse>('/inventory', payload, token);
			toast.success(response.message || `${itemNameLabel} added successfully.`);
			resetForm();
			setIsAddModalOpen(false);
			await loadInventory(false);
		} catch (err) {
			if (err instanceof ApiError) {
				toast.error(err.message);
			} else {
				toast.error(`Failed to add ${itemNameLabel.toLowerCase()}.`);
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
			toast.error('You are not logged in. Please sign in again.');
			return;
		}

		try {
			setUpdating(true);

			let categoryPayload = {};
			if (isDental) categoryPayload = { category: 'DENTAL' };
			else if (role === 'CLINIC_STAFF' || role === 'DOCTOR') categoryPayload = { category: 'MEDICINE' };

			const payload = {
				itemName: editForm.itemName.trim(),
				formDosage: editForm.formDosage.trim(),
				dosageValue: editForm.dosageValue.trim(),
				reorderThreshold: Number(editForm.reorderThreshold),
				unit: editForm.formDosage.trim() || editForm.unit.trim() || 'pcs',
				...categoryPayload
			};

			const response = await api.put<InventoryMutationResponse>(`/inventory/${editingItem.id}`, payload, token);
			toast.success(response.message || `${itemNameLabel} updated successfully.`);
			setEditingItem(null);
			await loadInventory(false);
		} catch (err) {
			if (err instanceof ApiError) {
				toast.error(err.message);
			} else {
				toast.error(`Failed to update ${itemNameLabel.toLowerCase()}.`);
			}
		} finally {
			setUpdating(false);
		}
	}

	async function handleDeleteMedicine(item: InventoryItem) {
		const token = getToken();
		if (!token) {
			toast.error('You are not logged in. Please sign in again.');
			return;
		}

		try {
			setDeletingId(item.id);
			const response = await api.del<InventoryMutationResponse>(`/inventory/${item.id}`, token);
			toast.success(response.message || `${item.itemName} removed from inventory.`);
			setDeletingItem(null);
			await loadInventory(false);
		} catch (err) {
			if (err instanceof ApiError) {
				toast.error(err.message);
			} else {
				toast.error(`Failed to remove ${itemNameLabel.toLowerCase()}.`);
			}
		} finally {
			setDeletingId(null);
		}
	}

	async function handleAddBatch(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!editingItem) return;
		const token = getToken();
		if (!token) return;

		try {
			setSaving(true);

			const payload = {
				batchNumber: batchForm.lotNumber.trim() || 'NO-BATCH',
				currentStock: Number(batchForm.currentStock),
				expirationDate: batchForm.expirationDate || null,
			};

			const response = await api.post<InventoryMutationResponse>(`/inventory/${editingItem.id}/batches`, payload, token);
			toast.success(response.message || 'Batch added successfully.');
			setBatchForm({ lotNumber: '', currentStock: '', expirationDate: '' });
			setIsAddBatchModalOpen(false);
			setEditingItem(null);
			await loadInventory(false);
		} catch (err) {
			toast.error(err instanceof ApiError ? err.message : 'Failed to add batch.');
		} finally {
			setSaving(false);
		}
	}

	async function handleUpdateBatch(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!editingBatch) return;
		const token = getToken();
		if (!token) return;

		try {
			setUpdating(true);

			const payload = {
				batchNumber: batchForm.lotNumber.trim() || 'NO-BATCH',
				currentStock: Number(batchForm.currentStock),
				expirationDate: batchForm.expirationDate || null,
			};

			const response = await api.put<InventoryMutationResponse>(`/inventory/batches/${editingBatch.batch.id}`, payload, token);
			toast.success(response.message || 'Batch updated successfully.');
			setBatchForm({ lotNumber: '', currentStock: '', expirationDate: '' });
			setEditingBatch(null);
			await loadInventory(false);
		} catch (err) {
			toast.error(err instanceof ApiError ? err.message : 'Failed to update batch.');
		} finally {
			setUpdating(false);
		}
	}

	async function handleDeleteBatch() {
		if (!deletingBatch) return;
		const token = getToken();
		if (!token) return;

		try {
			setDeletingId(deletingBatch.batch.id);

			const response = await api.del<InventoryMutationResponse>(`/inventory/batches/${deletingBatch.batch.id}`, token);
			toast.success(response.message || 'Batch removed successfully.');
			setDeletingBatch(null);
			await loadInventory(false);
		} catch (err) {
			toast.error(err instanceof ApiError ? err.message : 'Failed to delete batch.');
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
		let rows = q
			? withStatus.filter((item) => item.itemName.toLowerCase().includes(q) || item.unit.toLowerCase().includes(q))
			: [...withStatus];

		if (statusFilter === 'Out of Stock') {
			rows = rows.filter((item) => item.statusLabel === 'Out of Stock');
		} else if (statusFilter === 'Expiring Soon') {
			rows = rows.filter((item) => item.expiryLabel === 'Expiring Soon');
		} else if (statusFilter === 'Expired') {
			rows = rows.filter((item) => item.expiryLabel === 'Expired');
		} else if (statusFilter === 'Threshold Alerts') {
			rows = rows.filter((item) => item.statusLabel === 'Low Stock' || item.statusLabel === 'Out of Stock');
		}

		rows.sort((a, b) => {
			let cmp = 0;
			if (sortKey === 'itemName') cmp = a.itemName.localeCompare(b.itemName);
			if (sortKey === 'currentStock') cmp = a.currentStock - b.currentStock;
			if (sortKey === 'reorderThreshold') cmp = a.reorderThreshold - b.reorderThreshold;
			return sortDir === 'asc' ? cmp : -cmp;
		});

		return rows;
	}, [withStatus, q, sortKey, sortDir, statusFilter]);

	useEffect(() => {
		setPage(1);
	}, [search, sortKey, sortDir, items.length, statusFilter]);

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

	const historyPageSize = 5;
	const historyTotalPages = Math.max(1, Math.ceil(history.length / historyPageSize));
	const historyCurrentPage = Math.min(historyPage, historyTotalPages);
	const pagedHistory = useMemo(() => {
		const start = (historyCurrentPage - 1) * historyPageSize;
		return history.slice(start, start + historyPageSize);
	}, [history, historyCurrentPage]);

	const existingMedicine = useMemo(() => {
		if (!form.itemName?.trim()) return null;
		const nameToMatch = form.itemName.trim().toLowerCase();

		return items.find((item) => {
			const itemNameMatch = item.itemName?.trim().toLowerCase() === nameToMatch;
			if (!itemNameMatch) return false;

			if (form.dosageValue && item.dosageValue) {
				return item.dosageValue === form.dosageValue;
			}
			return true;
		});
	}, [form.itemName, form.dosageValue, items]);

	return (
		<div className="p-4 sm:p-6 space-y-5">
			{!isStaff && (
				<div>
					<h1 className="text-xl font-bold text-gray-900">{titleText}</h1>
					<p className="text-xs text-gray-400 mt-0.5">{subtitleText}</p>
				</div>
			)}
			<div className="flex flex-wrap items-stretch gap-3">
				<div 
					onClick={() => setStatusFilter('All')}
					className={`flex-1 min-w-[140px] cursor-pointer bg-white rounded-2xl border shadow-sm p-4 transition-all ${statusFilter === 'All' ? 'border-teal-500 ring-1 ring-teal-500' : 'border-gray-100 hover:border-teal-300'}`}
				>
					<p className="text-xs text-gray-400 font-medium">Total Items</p>
					<p className="text-2xl font-bold text-teal-500 mt-1">{items.length}</p>
				</div>
				<div 
					onClick={() => setStatusFilter('Out of Stock')}
					className={`flex-1 min-w-[140px] cursor-pointer bg-white rounded-2xl border shadow-sm p-4 transition-all ${statusFilter === 'Out of Stock' ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-100 hover:border-red-300'}`}
				>
					<p className="text-xs text-gray-400 font-medium">Out of Stock</p>
					<p className="text-2xl font-bold text-red-500 mt-1">{outOfStock}</p>
				</div>
				<div 
					onClick={() => setStatusFilter('Expiring Soon')}
					className={`flex-1 min-w-[140px] cursor-pointer bg-white rounded-2xl border shadow-sm p-4 transition-all ${statusFilter === 'Expiring Soon' ? 'border-orange-500 ring-1 ring-orange-500' : 'border-gray-100 hover:border-orange-300'}`}
				>
					<p className="text-xs text-gray-400 font-medium">Expiring Soon</p>
					<p className="text-2xl font-bold text-orange-500 mt-1">{expiringSoonCount}</p>
				</div>
				<div 
					onClick={() => setStatusFilter('Expired')}
					className={`flex-1 min-w-[140px] cursor-pointer bg-white rounded-2xl border shadow-sm p-4 transition-all ${statusFilter === 'Expired' ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-100 hover:border-red-300'}`}
				>
					<p className="text-xs text-gray-400 font-medium">Expired</p>
					<p className="text-2xl font-bold text-red-500 mt-1">{expiredCount}</p>
				</div>
				<div 
					onClick={() => setStatusFilter('Threshold Alerts')}
					className={`flex-1 min-w-[140px] cursor-pointer bg-white rounded-2xl border shadow-sm p-4 transition-all ${statusFilter === 'Threshold Alerts' ? 'border-yellow-500 ring-1 ring-yellow-500' : 'border-gray-100 hover:border-yellow-300'}`}
				>
					<p className="text-xs text-gray-400 font-medium">Threshold Alerts</p>
					<p className="text-2xl font-bold text-yellow-500 mt-1">{lowStock + outOfStock}</p>
				</div>

				{!isReadOnly && (
				<div className="flex flex-col items-end ml-auto gap-2">
					<button
						type="button"
						onClick={() => {
							setIsAddModalOpen(true);
						}}
						className="h-[42px] px-5 w-full text-sm font-semibold rounded-xl bg-teal-500 hover:bg-teal-600 text-white shadow-sm transition-colors flex items-center justify-center gap-2"
					>
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
						Add {itemNameLabel}
					</button>
					{isStaff && !isDental && (
						<button
							type="button"
							onClick={() => {
								alert('Dispense medicine feature coming soon!');
							}}
							className="h-[42px] px-5 w-full text-sm font-semibold rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white shadow-sm transition-colors flex items-center justify-center gap-2"
						>
							<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
							Dispense a medicine
						</button>
					)}
				</div>
				)}
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

				<div className="overflow-auto h-[400px] pb-6 px-1">
					<table className="w-full text-xs border-separate" style={{ borderSpacing: '0 12px' }}>
						<thead>
							<tr className="text-gray-400 uppercase tracking-wider text-[10px]">
								<th className="w-8 px-2 py-3"></th>
								<th className="text-left px-4 py-3 font-semibold">
									Medicine Name
								</th>

								<th className="text-right px-4 py-3 font-semibold">
									Total Stocks
								</th>
								<th
									className="text-right px-4 py-3 font-semibold cursor-pointer select-none hover:text-teal-500 transition-colors"
									onClick={() => toggleSort('reorderThreshold')}
								>
									Reorder Threshold
									<SortIcon active={sortKey === 'reorderThreshold'} dir={sortDir} />
								</th>
								<th className="text-center px-4 py-3 font-semibold">Total Batches</th>
								<th className="text-left px-4 py-3 font-semibold">Stock Status</th>
								<th className="text-left px-4 py-3 font-semibold">Expiration Status</th>
								{!isReadOnly && <th className="text-right px-4 py-3 font-semibold">Actions</th>}
							</tr>
						</thead>
						<tbody>
							{loading ? (
								<tr>
									<td colSpan={isReadOnly ? 7 : 8} className="px-4 py-10 text-center text-gray-400">Loading inventory...</td>
								</tr>
							) : filtered.length === 0 ? (
								<tr>
									<td colSpan={isReadOnly ? 7 : 8} className="px-4 py-10 text-center text-gray-300">No inventory items found.</td>
								</tr>
							) : (
								pagedItems.map((item) => {
									const isExpanded = expandedRows.has(item.id);
									return (
									<React.Fragment key={item.id}>
										<tr 
											className={`bg-white cursor-pointer transition-all hover:shadow-md ${isExpanded ? 'shadow-md ring-1 ring-gray-200' : 'shadow-sm ring-1 ring-gray-100 hover:ring-gray-200'}`} 
											onClick={() => toggleRow(item.id)}
										>
											<td className={`px-2 py-4 text-center text-gray-400 ${isExpanded ? 'rounded-tl-xl' : 'rounded-l-xl'}`}>
												<svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
											</td>
											<td className="px-4 py-4">
												<span className="font-bold text-gray-900 text-[15px]">{item.itemName}</span>
												{item.dosageValue && <span className="ml-2 text-xs text-gray-500 font-medium">{item.dosageValue}</span>}
											</td>
											<td className="px-4 py-4 text-right text-gray-700">
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
											<td className="px-4 py-4 text-right text-gray-600">{item.reorderThreshold}</td>
											<td className="px-4 py-4 text-center text-gray-600">{item.batches?.length || 0}</td>
											<td className="px-4 py-4">
												<span className={`text-[11px] font-semibold border px-2.5 py-0.5 rounded-full ${STATUS_STYLE[item.statusLabel] || 'bg-gray-50'}`}>
													{item.statusLabel}
												</span>
											</td>
											<td className="px-4 py-4">
												<span className={`text-[11px] font-semibold border px-2.5 py-0.5 rounded-full ${EXPIRY_STYLE[item.expiryLabel] || 'bg-gray-50'}`}>
													{item.expiryLabel}
												</span>
											</td>
											{!isReadOnly && (
											<td className={`px-4 py-4 text-right ${isExpanded ? 'rounded-tr-xl' : 'rounded-r-xl'}`}>
												<div className="flex items-center justify-end gap-2" onClick={(event) => event.stopPropagation()}>
													<button
														type="button"
														onClick={() => {
															setEditingItem(item);
															setBatchForm({ lotNumber: '', currentStock: '', expirationDate: '' });
															setIsAddBatchModalOpen(true);
														}}
														className="text-xs font-semibold text-teal-600 hover:text-teal-700 bg-teal-50 px-2 py-1 rounded"
													>
														+ Batch
													</button>
													<div className="relative inline-block text-left">
														<button
															type="button"
															onClick={() => setOpenActionMenuId((current) => (current === item.id ? null : item.id))}
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
												</div>
											</td>
											)}
										</tr>
										{isExpanded && (
											<tr className="bg-white shadow-md ring-1 ring-gray-200">
												<td colSpan={isReadOnly ? 7 : 8} className="p-0 rounded-b-xl overflow-hidden">
													<div className="px-6 py-6 bg-slate-50 border-t border-gray-100">
														{item.batches?.length === 0 ? (
															<div className="text-center py-6 text-gray-400 text-sm">No batches available for this item.</div>
														) : (
															<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
																{item.batches?.map(batch => {
																	const batchExpiryLabel = getBatchExpiryStatus(batch);
																	return (
																		<div key={batch.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow relative group">
																			<div className="flex justify-between items-start mb-3">
																				<div>
																					<h4 className="text-sm font-bold text-slate-800">{batch.batchNumber || 'Unassigned'}</h4>
																					<span className={`mt-1 inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${EXPIRY_STYLE[batchExpiryLabel] || 'bg-gray-50'}`}>
																						{batchExpiryLabel}
																					</span>
																				</div>
																				{!isReadOnly && (
																					<div className="relative inline-block text-left">
																						<button
																							type="button"
																							onClick={() => setOpenBatchActionId((current) => (current === batch.id ? null : batch.id))}
																							className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
																						>
																							<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
																							</svg>
																						</button>
																						{openBatchActionId === batch.id && (
																							<div className="absolute right-0 z-30 mt-1 w-28 rounded-lg border border-gray-200 bg-white shadow-lg">
																								<button
																									type="button"
																									onClick={() => {
																										setEditingBatch({ parent: item, batch });
																										setBatchForm({
																											lotNumber: batch.batchNumber || '',
																											currentStock: String(batch.currentStock || ''),
																											expirationDate: batch.expirationDate ? new Date(batch.expirationDate).toISOString().split('T')[0] : ''
																										});
																										setOpenBatchActionId(null);
																									}}
																									className="block w-full px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-50 rounded-t-lg"
																								>
																									Edit Batch
																								</button>
																								<button
																									type="button"
																									onClick={() => {
																										setDeletingBatch({ parent: item, batch });
																										setOpenBatchActionId(null);
																									}}
																									className="block w-full px-3 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50 rounded-b-lg"
																								>
																									Delete Batch
																								</button>
																							</div>
																						)}
																					</div>
																				)}
																			</div>
																			<div className="space-y-1.5">
																				<div className="flex justify-between text-xs">
																					<span className="text-slate-500">Current Stock:</span>
																					<span className="font-semibold text-slate-700">{batch.currentStock} {item.unit}</span>
																				</div>
																				<div className="flex justify-between text-xs">
																					<span className="text-slate-500">Expires:</span>
																					<span className="font-medium text-slate-700">{formatExpirationDate(batch.expirationDate)}</span>
																				</div>
																			</div>
																		</div>
																	);
																})}
															</div>
														)}
													</div>
												</td>
											</tr>
										)}
									</React.Fragment>
								)})
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
						pageSizeOptions={[5, 10, 20, 30, 50]}
						itemLabel="inventory items"
						onPageChange={setPage}
						onPageSizeChange={(next) => {
							setPageSize(next);
							setPage(1);
						}}
					/>
				)}
			</div>

			<div className="card w-full mt-6 p-5">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-h3 text-gray-900">Inventory Operations History</h2>
				</div>
				<div className="overflow-x-auto rounded-xl border border-[hsl(var(--border))]">
					<table className="w-full text-sm text-left">
						<thead className="bg-[hsl(var(--surface))] text-[hsl(var(--muted-foreground))] uppercase text-[10px] tracking-wider">
							<tr>
								<th className="px-4 py-3 font-semibold">Date & Time</th>
								<th className="px-4 py-3 font-semibold">User</th>
								<th className="px-4 py-3 font-semibold">Action</th>
								<th className="px-4 py-3 font-semibold">Description</th>
							</tr>
						</thead>
						<tbody>
							{historyLoading ? (
								<tr>
									<td colSpan={4} className="px-4 py-6 text-center text-gray-400">Loading history...</td>
								</tr>
							) : history.length === 0 ? (
								<tr>
									<td colSpan={4} className="px-4 py-6 text-center text-gray-300">No operations history found.</td>
								</tr>
							) : (
								pagedHistory.map((log) => {
									const actionName = getLogActionName(log);
									const desc = getLogDescription(log);
									return (
									<tr key={log.id} className="border-b border-[hsl(var(--border))] last:border-0 hover:bg-gray-50/60 transition-colors">
										<td className="px-4 py-3 text-gray-600 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
										<td className="px-4 py-3 font-medium text-gray-800">
											{(() => {
												const userObj = log.User || log.user;
												const profile = (log.User?.StudentProfile) || (log.user?.studentProfile);
												return profile ? `${profile.firstName} ${profile.lastName}` : userObj?.email || 'System';
											})()}
										</td>
										<td className="px-4 py-3">
											<span className="text-[11px] font-semibold border px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border-blue-100">
												{actionName.replace(/_/g, ' ')}
											</span>
										</td>
										<td className="px-4 py-3 text-gray-600">
											{actionName === 'DISPENSED_MEDICINE' && log.metadata ? (
												<div>
													<p className="text-gray-800 font-medium text-[13px]">Given to: {log.metadata.studentName || 'Unknown'}</p>
													<p className="text-xs text-teal-600 mt-0.5 font-medium">{log.metadata.totalMedicinesDispensed || 0} meds involved</p>
													<p className="text-xs text-gray-500 mt-1">{desc}</p>
												</div>
											) : (
												desc
											)}
										</td>
									</tr>
								)})
							)}
						</tbody>
					</table>
				</div>
				{!historyLoading && history.length > 0 && (
					<div className="mt-4">
						<PaginationControls
							page={historyCurrentPage}
							totalPages={historyTotalPages}
							totalItems={history.length}
							pageSize={historyPageSize}
							pageSizeOptions={[5]}
							itemLabel="operations"
							onPageChange={setHistoryPage}
							onPageSizeChange={() => {}}
						/>
					</div>
				)}
			</div>

			{isAddModalOpen && (
				<div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4">
					<div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
						<div className="border-b border-gray-100 px-5 py-4 flex items-center justify-between">
							<h2 className="text-sm font-semibold text-gray-900">Add {itemNameLabel}</h2>
							<button type="button" onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600">x</button>
						</div>
						<form className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleAddMedicine}>
							<div className="space-y-1">
								<label className="text-xs font-semibold text-gray-700">Medicine Name</label>
								<input type="text" value={form.itemName} onChange={(event) => setForm((prev) => ({ ...prev, itemName: event.target.value }))} placeholder="Medicine Name" required className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]" />
							</div>
							
							<div className="space-y-1">
								<label className="text-xs font-semibold text-gray-700">Dosage Value</label>
								<input type="text" value={form.dosageValue} onChange={(event) => setForm((prev) => ({ ...prev, dosageValue: event.target.value }))} placeholder="ex. 500mg" className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]" />
							</div>

							<div className="space-y-1">
								<label className="text-xs font-semibold text-gray-700">Number of Medicines</label>
								<input type="number" min={1} value={form.currentStock} onChange={(event) => setForm((prev) => ({ ...prev, currentStock: event.target.value }))} placeholder="Stock level" required className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]" />
							</div>

							<div className="space-y-1">
								<label className="text-xs font-semibold text-gray-700">Dosage Form</label>
								<select value={form.formDosage} onChange={(event) => setForm((prev) => ({ ...prev, formDosage: event.target.value }))} required className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] bg-white">
									<option value="" disabled>Select Form</option>
									<option value="Tablets">Tablets</option>
									<option value="Capsules">Capsules</option>
									<option value="Syrup / Liquid">Syrup / Liquid</option>
									<option value="Suspension (liquids that need to be shaken)">Suspension (liquids that need to be shaken)</option>
									<option value="Lozenge / Chewable">Lozenge / Chewable</option>
									<option value="Injection (Vial)">Injection (Vial)</option>
									<option value="Injection (Ampoule)">Injection (Ampoule)</option>
									<option value="IV Infusion (Bags/Bottles)">IV Infusion (Bags/Bottles)</option>
									<option value="Cream / Ointment">Cream / Ointment</option>
									<option value="Gel">Gel</option>
									<option value="Lotion">Lotion</option>
									<option value="Patch (Transdermal)">Patch (Transdermal)</option>
									<option value="Drops (Eye)">Drops (Eye)</option>
									<option value="Drops (Ear/Nose)">Drops (Ear/Nose)</option>
									<option value="Inhaler / Nasal Spray">Inhaler / Nasal Spray</option>
									<option value="Suppository">Suppository</option>
									<option value="Powder">Powder</option>
								</select>
							</div>

							<div className="space-y-1">
								<label className="text-xs font-semibold text-gray-700">Reorder Treshold</label>
								<input type="number" min={1} value={form.reorderThreshold} onChange={(event) => setForm((prev) => ({ ...prev, reorderThreshold: event.target.value }))} placeholder="Reorder threshold" required className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]" />
							</div>

							<div className="space-y-1">
								<label className="text-xs font-semibold text-gray-700">Expiration Date</label>
								<input type="date" value={form.expirationDate} onChange={(event) => setForm((prev) => ({ ...prev, expirationDate: event.target.value }))} className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]" />
							</div>

							<div className="md:col-span-2 flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
								<button type="button" onClick={() => setIsAddModalOpen(false)} className="px-3 py-2 text-xs font-semibold rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
								<button type="submit" disabled={saving} className="px-4 py-2 text-xs font-semibold rounded-xl bg-teal-500 hover:bg-teal-600 text-white disabled:opacity-60">{saving ? 'Adding...' : `Add Medicine`}</button>
							</div>
						</form>
						{existingMedicine && (
							<div className="px-5 pb-5 text-center">
								<p className="text-sm text-gray-600">
									Medicine already exist.  
									<button 
										type="button" 
										onClick={() => {
											setIsAddModalOpen(false);
											setEditingItem(existingMedicine);
											setIsAddBatchModalOpen(true);
										}}
										className="text-teal-600 font-semibold hover:underline ml-1"
									>
										Add a batch to it?
									</button>
								</p>
							</div>
						)}
					</div>
				</div>
			)}

			{editingItem && !isAddBatchModalOpen && (
				<div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4">
					<div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
						<div className="border-b border-gray-100 px-5 py-4 flex items-center justify-between">
							<h2 className="text-sm font-semibold text-gray-900">Edit {itemNameLabel}</h2>
							<button type="button" onClick={() => setEditingItem(null)} className="text-gray-400 hover:text-gray-600">x</button>
						</div>
						<form className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleUpdateMedicine}>
							<div className="space-y-1">
								<label className="text-xs font-semibold text-gray-700">Medicine Name</label>
								<input type="text" value={editForm.itemName} onChange={(event) => setEditForm((prev) => ({ ...prev, itemName: event.target.value }))} placeholder="Medicine Name" required className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]" />
							</div>

							<div className="space-y-1">
								<label className="text-xs font-semibold text-gray-700">Dosage Value</label>
								<input type="text" value={editForm.dosageValue} onChange={(event) => setEditForm((prev) => ({ ...prev, dosageValue: event.target.value }))} placeholder="ex. 500mg" className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]" />
							</div>



							<div className="space-y-1">
								<label className="text-xs font-semibold text-gray-700">Reorder Treshold</label>
								<input type="number" min={1} value={editForm.reorderThreshold} onChange={(event) => setEditForm((prev) => ({ ...prev, reorderThreshold: event.target.value }))} placeholder="Reorder threshold" required className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]" />
							</div>

							<div className="md:col-span-2 flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
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

			{isAddBatchModalOpen && editingItem && (
				<div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4">
					<div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
						<div className="border-b border-gray-100 px-5 py-4 flex items-center justify-between">
							<h2 className="text-sm font-semibold text-gray-900">Add Batch for {editingItem.itemName}</h2>
							<button type="button" onClick={() => { setIsAddBatchModalOpen(false); setEditingItem(null); }} className="text-gray-400 hover:text-gray-600">x</button>
						</div>
						<form className="p-5 grid grid-cols-1 gap-4" onSubmit={handleAddBatch}>
							<div className="space-y-1">
								<label className="text-xs font-semibold text-gray-700">Batch Number / Lot</label>
								<input type="text" value={batchForm.lotNumber} onChange={(event) => setBatchForm((prev) => ({ ...prev, lotNumber: event.target.value }))} placeholder="ex. BATCH-001" className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]" />
							</div>
							<div className="space-y-1">
								<label className="text-xs font-semibold text-gray-700">Number of Stocks</label>
								<input type="number" min={1} value={batchForm.currentStock} onChange={(event) => setBatchForm((prev) => ({ ...prev, currentStock: event.target.value }))} placeholder="Stock amount" required className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]" />
							</div>
							<div className="space-y-1">
								<label className="text-xs font-semibold text-gray-700">Expiration Date</label>
								<input type="date" value={batchForm.expirationDate} onChange={(event) => setBatchForm((prev) => ({ ...prev, expirationDate: event.target.value }))} className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]" />
							</div>
							<div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
								<button type="button" onClick={() => { setIsAddBatchModalOpen(false); setEditingItem(null); }} className="px-3 py-2 text-xs font-semibold rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
								<button type="submit" disabled={saving} className="px-4 py-2 text-xs font-semibold rounded-xl bg-teal-500 hover:bg-teal-600 text-white disabled:opacity-60">{saving ? 'Adding...' : 'Add Batch'}</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{editingBatch && (
				<div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4">
					<div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
						<div className="border-b border-gray-100 px-5 py-4 flex items-center justify-between">
							<h2 className="text-sm font-semibold text-gray-900">Edit Batch for {editingBatch.parent.itemName}</h2>
							<button type="button" onClick={() => setEditingBatch(null)} className="text-gray-400 hover:text-gray-600">x</button>
						</div>
						<form className="p-5 grid grid-cols-1 gap-4" onSubmit={handleUpdateBatch}>
							<div className="space-y-1">
								<label className="text-xs font-semibold text-gray-700">Batch Number / Lot</label>
								<input type="text" value={batchForm.lotNumber} onChange={(event) => setBatchForm((prev) => ({ ...prev, lotNumber: event.target.value }))} placeholder="ex. BATCH-001" className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]" />
							</div>
							<div className="space-y-1">
								<label className="text-xs font-semibold text-gray-700">Number of Stocks</label>
								<input type="number" min={0} value={batchForm.currentStock} onChange={(event) => setBatchForm((prev) => ({ ...prev, currentStock: event.target.value }))} placeholder="Stock amount" required className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]" />
							</div>
							<div className="space-y-1">
								<label className="text-xs font-semibold text-gray-700">Expiration Date</label>
								<input type="date" value={batchForm.expirationDate} onChange={(event) => setBatchForm((prev) => ({ ...prev, expirationDate: event.target.value }))} className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]" />
							</div>
							<div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
								<button type="button" onClick={() => setEditingBatch(null)} className="px-3 py-2 text-xs font-semibold rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
								<button type="submit" disabled={updating} className="px-4 py-2 text-xs font-semibold rounded-xl bg-teal-500 hover:bg-teal-600 text-white disabled:opacity-60">{updating ? 'Saving...' : 'Save Changes'}</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{deletingBatch && (
				<div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4">
					<div className="w-full max-w-md rounded-2xl bg-white shadow-xl p-5 space-y-4">
						<h2 className="text-sm font-semibold text-gray-900">Delete Batch</h2>
						<p className="text-xs text-gray-600">Are you sure you want to delete batch <span className="font-semibold text-gray-800">{deletingBatch.batch.batchNumber}</span> for <span className="font-semibold text-gray-800">{deletingBatch.parent.itemName}</span>?</p>
						<div className="flex items-center justify-end gap-2">
							<button type="button" onClick={() => setDeletingBatch(null)} className="px-3 py-2 text-xs font-semibold rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
							<button type="button" disabled={deletingId === deletingBatch.batch.id} onClick={() => void handleDeleteBatch()} className="px-4 py-2 text-xs font-semibold rounded-xl bg-red-500 hover:bg-red-600 text-white disabled:opacity-60">{deletingId === deletingBatch.batch.id ? 'Deleting...' : 'Delete'}</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
