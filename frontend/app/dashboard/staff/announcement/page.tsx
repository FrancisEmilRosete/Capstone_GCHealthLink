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

export default function StaffAnnouncementPage() {
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
		<div className="p-6 space-y-6 max-w-5xl mx-auto">
			<div>
				<h1 className="text-2xl font-bold text-gray-900">Announcements & Advisories</h1>
				<p className="text-sm text-gray-500 mt-1">Publish clinic advisories to students and staff.</p>
			</div>

			{error && (
				<div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
					{error}
				</div>
			)}

			<div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col md:flex-row">
				<div className="w-full md:w-1/3 bg-gray-50 border-b md:border-b-0 md:border-r border-gray-100 p-6 space-y-6">
					<div>
						<h2 className="text-sm font-bold text-gray-900 mb-3">Target Audience</h2>
						<div className="flex flex-col gap-2">
							{AUDIENCE_OPTIONS.map((option) => {
								const checked = targetAudience.includes(option.value);
								return (
									<label
										key={option.value}
										className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold cursor-pointer transition-all ${
											checked
												? 'bg-teal-500 border-teal-600 text-white shadow-md transform scale-[1.02]'
												: 'bg-white border-gray-200 text-gray-600 hover:border-teal-300'
										}`}
									>
										<input
											type="checkbox"
											className="sr-only"
											checked={checked}
											onChange={() => handleAudienceToggle(option.value)}
										/>
										<div className={`w-4 h-4 rounded border flex items-center justify-center ${checked ? 'border-white bg-teal-600' : 'border-gray-300'}`}>
											{checked && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
										</div>
										{option.label}
									</label>
								);
							})}
						</div>
					</div>

					<div>
						<h2 className="text-sm font-bold text-gray-900 mb-3">Severity Level</h2>
						<div className="flex flex-col gap-2">
							{SEVERITY_OPTIONS.map((option) => (
								<button
									type="button"
									key={option}
									onClick={() => setSeverity(option)}
									className={`px-4 py-3 rounded-xl border text-sm font-bold tracking-wide transition-all text-left ${
										severity === option
											? `${SEVERITY_BADGE_CLASS[option]} shadow-sm ring-2 ring-offset-1 ring-${option === 'CRITICAL' ? 'red' : option === 'WARNING' ? 'amber' : 'blue'}-300`
											: 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
									}`}
								>
									{option}
								</button>
							))}
						</div>
					</div>
				</div>

				<div className="w-full md:w-2/3 p-6">
					<form onSubmit={(event) => { void handleSubmit(event); }} className="space-y-5 h-full flex flex-col">
						<div className="space-y-1.5">
							<label className="text-sm font-bold text-gray-900">Announcement Title</label>
							<input
								type="text"
								value={title}
								onChange={(event) => setTitle(event.target.value)}
								placeholder="Enter a clear, concise title..."
								className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 focus:bg-white transition-all"
							/>
						</div>

						<div className="space-y-1.5 flex-1 flex flex-col">
							<label className="text-sm font-bold text-gray-900">Message Content</label>
							<textarea
								value={message}
								onChange={(event) => setMessage(event.target.value)}
								placeholder="Type your announcement message here..."
								className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-sm resize-none flex-1 min-h-[150px] focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 focus:bg-white transition-all"
							/>
						</div>

						<div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-100">
							{feedback ? (
								<p className={`text-sm font-medium ${feedback.toLowerCase().includes('failed') || feedback.toLowerCase().includes('required') ? 'text-red-600' : 'text-teal-600'}`}>
									{feedback}
								</p>
							) : <span className="text-xs text-gray-400">Posted announcements appear instantly.</span>}

							<button
								type="submit"
								disabled={submitting}
								className="w-full sm:w-auto text-sm font-bold px-6 py-3 rounded-xl bg-teal-500 hover:bg-teal-600 text-white shadow-md disabled:opacity-70 transition-all transform active:scale-95"
							>
								{submitting ? 'Publishing...' : 'Publish Announcement'}
							</button>
						</div>
					</form>
				</div>
			</div>

			<div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mt-8">
				<div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
					<h2 className="text-base font-bold text-gray-900">Announcement History</h2>
					<input
						type="text"
						value={search}
						onChange={(event) => setSearch(event.target.value)}
						placeholder="Search history..."
						className="w-full sm:w-64 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-gray-50 focus:bg-white"
					/>
				</div>

				{loadingHistory ? (
					<div className="p-10 text-center text-sm text-gray-400">Loading history...</div>
				) : filteredHistory.length === 0 ? (
					<div className="p-10 text-center text-sm text-gray-400">No announcement logs found.</div>
				) : (
					<div className="divide-y divide-gray-100">
						{filteredHistory.map((item) => {
							const normalizedSeverity = (item.severity || 'INFO').toUpperCase();
							return (
								<div key={item.id} className="p-5 hover:bg-gray-50/50 transition-colors">
									<div className="flex items-center justify-between gap-3 flex-wrap">
										<p className="text-base font-bold text-gray-900">{item.title}</p>
										<div className="flex items-center gap-2">
											<span className="text-[10px] font-bold tracking-wider uppercase rounded-lg border px-2 py-1 text-gray-700 bg-gray-50 border-gray-200 shadow-sm">
												{(item.targetDept || 'ALL')}
											</span>
											<span className={`text-[10px] font-bold tracking-wider uppercase rounded-lg border px-2 py-1 shadow-sm ${SEVERITY_BADGE_CLASS[normalizedSeverity] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
												{normalizedSeverity}
											</span>
										</div>
									</div>
									<p className="text-sm text-gray-600 mt-2 leading-relaxed">{item.message}</p>
									<p className="text-xs font-medium text-gray-400 mt-3">{formatDateTime(item.createdAt)}</p>
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}
