'use client';

import { useEffect, useMemo, useState } from 'react';

import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';

interface AdvisoryItem {
	id: string;
	title: string;
	message: string;
	severity: 'INFO' | 'WARNING' | 'CRITICAL' | string;
	targetDept: string;
	createdAt: string;
}

interface AdvisoryResponse {
	success: boolean;
	data: AdvisoryItem[];
	message?: string;
}

interface BroadcastResponse {
	success: boolean;
	message: string;
}

const AUDIENCE_OPTIONS = [
	{ value: 'ALL', label: 'ALL' },
	{ value: 'NURSE', label: 'Nurse' },
	{ value: 'DOCTOR', label: 'Doctor' },
	{ value: 'DENTAL', label: 'Dental' },
	{ value: 'STUDENT', label: 'Student' },
] as const;

const SEVERITY_OPTIONS = ['INFO', 'WARNING', 'CRITICAL'] as const;

const SEVERITY_BADGE_CLASS: Record<string, string> = {
	INFO: 'bg-blue-100 text-blue-700 border-blue-200',
	WARNING: 'bg-amber-100 text-amber-700 border-amber-200',
	CRITICAL: 'bg-red-100 text-red-700 border-red-200',
};

function formatDateTime(iso: string) {
	return new Date(iso).toLocaleString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
	});
}

export default function AdminAnnouncementPage() {
	const [title, setTitle] = useState('');
	const [message, setMessage] = useState('');
	const [targetAudience, setTargetAudience] = useState<Array<(typeof AUDIENCE_OPTIONS)[number]['value']>>(['ALL']);
	const [severity, setSeverity] = useState<(typeof SEVERITY_OPTIONS)[number]>('INFO');

	const [history, setHistory] = useState<AdvisoryItem[]>([]);
	const [loadingHistory, setLoadingHistory] = useState(true);
	const [submitting, setSubmitting] = useState(false);

	const [error, setError] = useState('');
	const [feedback, setFeedback] = useState('');
	const [search, setSearch] = useState('');

	async function loadHistory() {
		const token = getToken();
		if (!token) {
			setError('You are not logged in. Please sign in again.');
			setLoadingHistory(false);
			return;
		}

		try {
			setError('');
			const response = await api.get<AdvisoryResponse>('/advisories', token);
			setHistory(response.data || []);
		} catch (err) {
			if (err instanceof ApiError) {
				setError(err.message);
			} else {
				setError('Failed to load announcement history logs.');
			}
		} finally {
			setLoadingHistory(false);
		}
	}

	useEffect(() => {
		void loadHistory();
	}, []);

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();

		const token = getToken();
		if (!token) {
			setError('You are not logged in. Please sign in again.');
			return;
		}

		const normalizedTitle = title.trim();
		const normalizedMessage = message.trim();
		const selectedTargets = targetAudience.length ? targetAudience : ['ALL'];
		const fallbackTargetDept = selectedTargets.includes('ALL') ? 'ALL' : selectedTargets.join(',');

		if (!normalizedTitle || !normalizedMessage) {
			setFeedback('Title and message are required.');
			return;
		}

		try {
			setSubmitting(true);
			setError('');
			setFeedback('');

			const response = await api.post<BroadcastResponse>(
				'/advisories/broadcast',
				{
					title: normalizedTitle,
					message: normalizedMessage,
					targetDepts: selectedTargets,
					targetDept: fallbackTargetDept,
					severity,
				},
				token,
			);

			setTitle('');
			setMessage('');
			setTargetAudience(['ALL']);
			setSeverity('INFO');
			setFeedback(response.message || 'Announcement posted successfully.');
			await loadHistory();
		} catch (err) {
			if (err instanceof ApiError) {
				setFeedback(err.message);
			} else {
				setFeedback('Failed to publish announcement.');
			}
		} finally {
			setSubmitting(false);
		}
	}

	const filteredHistory = useMemo(() => {
		const q = search.toLowerCase().trim();
		if (!q) return history;

		return history.filter((item) => {
			return item.title.toLowerCase().includes(q)
				|| item.message.toLowerCase().includes(q)
				|| (item.targetDept || 'ALL').toLowerCase().includes(q)
				|| (item.severity || '').toLowerCase().includes(q);
		});
	}, [history, search]);

	function handleAudienceToggle(value: (typeof AUDIENCE_OPTIONS)[number]['value']) {
		if (value === 'ALL') {
			setTargetAudience(['ALL']);
			return;
		}

		setTargetAudience((prev) => {
			const withoutAll = prev.filter((item) => item !== 'ALL');
			const exists = withoutAll.includes(value);
			const next = exists
				? withoutAll.filter((item) => item !== value)
				: [...withoutAll, value];

			return next.length ? next : ['ALL'];
		});
	}

	return (
		<div className="p-6 space-y-5 max-w-4xl mx-auto">
			<div>
				<h1 className="text-xl font-bold text-gray-900">Announcement</h1>
				<p className="text-sm text-gray-500 mt-0.5">Publish advisories to all users or a selected group.</p>
			</div>

			{error && (
				<div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
					{error}
				</div>
			)}

			<div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
				<div>
					<h2 className="text-sm font-bold text-gray-900">Create Announcement</h2>
					<p className="text-xs text-gray-500 mt-0.5">Select one or multiple groups using checkboxes.</p>
				</div>

				<form onSubmit={(event) => { void handleSubmit(event); }} className="space-y-2.5">
					<input
						type="text"
						value={title}
						onChange={(event) => setTitle(event.target.value)}
						placeholder="Announcement title"
						className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
					/>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
						<div className="border border-gray-200 rounded-xl px-3 py-2 space-y-2">
							{AUDIENCE_OPTIONS.map((option) => {
								const checked = targetAudience.includes(option.value);
								return (
									<label key={option.value} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
										<input
											type="checkbox"
											checked={checked}
											onChange={() => handleAudienceToggle(option.value)}
											className="accent-teal-500"
										/>
										<span>{option.label}</span>
									</label>
								);
							})}
						</div>

						<select
							value={severity}
							onChange={(event) => setSeverity(event.target.value as (typeof SEVERITY_OPTIONS)[number])}
							className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
						>
							{SEVERITY_OPTIONS.map((option) => (
								<option key={option} value={option}>{option}</option>
							))}
						</select>
					</div>

					<textarea
						rows={4}
						value={message}
						onChange={(event) => setMessage(event.target.value)}
						placeholder="Announcement message"
						className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-400"
					/>

					<div className="flex items-center justify-between gap-3">
						{feedback ? (
							<p className={`text-xs ${feedback.toLowerCase().includes('failed') || feedback.toLowerCase().includes('required') ? 'text-red-600' : 'text-teal-600'}`}>
								{feedback}
							</p>
						) : <span className="text-xs text-gray-400">Posted announcements appear in the history log below.</span>}

						<button
							type="submit"
							disabled={submitting}
							className="text-xs font-semibold px-3.5 py-2 rounded-xl bg-teal-500 hover:bg-teal-600 text-white disabled:opacity-70"
						>
							{submitting ? 'Posting...' : 'Post Announcement'}
						</button>
					</div>
				</form>
			</div>

			<div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
				<div className="p-4 border-b border-gray-100 space-y-2">
					<h2 className="text-sm font-bold text-gray-900">Announcement History Logs</h2>
					<input
						type="text"
						value={search}
						onChange={(event) => setSearch(event.target.value)}
						placeholder="Search history by title, message, audience, or severity..."
						className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
					/>
				</div>

				{loadingHistory ? (
					<div className="p-10 text-center text-sm text-gray-400">Loading announcement history...</div>
				) : filteredHistory.length === 0 ? (
					<div className="p-10 text-center text-sm text-gray-400">No announcement logs found.</div>
				) : (
					<div className="divide-y divide-gray-100">
						{filteredHistory.map((item) => {
							const normalizedSeverity = (item.severity || 'INFO').toUpperCase();
							return (
								<div key={item.id} className="p-4">
									<div className="flex items-center justify-between gap-3 flex-wrap">
										<p className="text-sm font-semibold text-gray-900">{item.title}</p>
										<div className="flex items-center gap-2">
											<span className="text-[11px] font-semibold rounded-full border px-2 py-0.5 text-gray-700 bg-gray-50 border-gray-200">
												{(item.targetDept || 'ALL').toUpperCase()}
											</span>
											<span className={`text-[11px] font-semibold rounded-full border px-2 py-0.5 ${SEVERITY_BADGE_CLASS[normalizedSeverity] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
												{normalizedSeverity}
											</span>
										</div>
									</div>
									<p className="text-sm text-gray-600 mt-1 leading-relaxed">{item.message}</p>
									<p className="text-xs text-gray-400 mt-2">{formatDateTime(item.createdAt)}</p>
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}
