'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';

interface UserEntry {
	id: string;
	email: string;
	role: string;
	createdAt: string;
	studentProfile?: {
		firstName: string;
		middleName?: string | null;
		lastName: string;
		studentNumber: string;
		courseDept: string;
	} | null;
}

interface UsersResponse {
	success: boolean;
	data: { users?: UserEntry[] } | UserEntry[];
}

function fullName(user: UserEntry) {
	if (!user.studentProfile) return '—';
	const { firstName, middleName, lastName } = user.studentProfile;
	return [lastName, [firstName, middleName].filter(Boolean).join(' ')].filter(Boolean).join(', ');
}

export default function AdminStudentsPage() {
	const [students, setStudents] = useState<UserEntry[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [search, setSearch] = useState('');

	const loadStudents = useCallback(async () => {
		const token = getToken();
		if (!token) {
			setError('Not authenticated.');
			setLoading(false);
			return;
		}

		setLoading(true);
		try {
			const res = await api.get<UsersResponse>('/admin/users', token);
			const payload = res.data;
			const resolvedUsers = Array.isArray(payload)
				? payload
				: Array.isArray(payload?.users)
					? payload.users
					: [];

			const studentUsers = resolvedUsers.filter((user) => user.role === 'STUDENT');
			setStudents(studentUsers);
			setError('');
		} catch (err) {
			setError(err instanceof ApiError ? err.message : 'Failed to load students.');
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void loadStudents();
	}, [loadStudents]);

	const filteredStudents = useMemo(() => {
		const q = search.toLowerCase().trim();
		if (!q) return students;

		return students.filter((user) => {
			const name = user.studentProfile
				? `${user.studentProfile.firstName} ${user.studentProfile.lastName}`.toLowerCase()
				: '';

			return user.email.toLowerCase().includes(q)
				|| name.includes(q)
				|| (user.studentProfile?.studentNumber ?? '').toLowerCase().includes(q)
				|| (user.studentProfile?.courseDept ?? '').toLowerCase().includes(q);
		});
	}, [search, students]);

	return (
		<div className="p-6 space-y-5 max-w-7xl mx-auto">
			<div>
				<h1 className="text-xl font-bold text-gray-900">Students</h1>
				<p className="text-sm text-gray-500 mt-0.5">{students.length} registered student accounts</p>
			</div>

			<div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
				<input
					value={search}
					onChange={(event) => setSearch(event.target.value)}
					placeholder="Search by name, email, student number, or department..."
					className="w-full min-w-[220px] border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
				/>
			</div>

			{error && (
				<div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
			)}

			<div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className="bg-gray-50 border-b border-gray-100">
								<th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Student Number</th>
								<th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Full Name</th>
								<th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Department / Course</th>
								<th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
								<th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Account Created</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-50">
							{loading ? (
								<tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400 text-sm">Loading students...</td></tr>
							) : filteredStudents.length === 0 ? (
								<tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400 text-sm">No students match your search.</td></tr>
							) : filteredStudents.map((student) => (
								<tr key={student.id} className="hover:bg-gray-50 transition-colors">
									<td className="px-4 py-3 text-gray-700">{student.studentProfile?.studentNumber ?? '—'}</td>
									<td className="px-4 py-3 text-gray-800 font-medium">{fullName(student)}</td>
									<td className="px-4 py-3 text-gray-500 text-xs">{student.studentProfile?.courseDept ?? '—'}</td>
									<td className="px-4 py-3 text-gray-700">{student.email}</td>
									<td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
										{new Date(student.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
