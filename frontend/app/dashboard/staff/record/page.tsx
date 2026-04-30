'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, ChevronRight, AlertCircle } from 'lucide-react';

import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';

interface SearchStudent {
  id: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  courseDept: string;
  course?: string | null;
  yearLevel?: string | null;
  age: number | null;
  sex: string | null;
  user: { id: string };
}

function formatYearLevel(value?: string | null) {
  if (!value) return 'N/A';
  switch (value) {
    case 'YR_1': return 'Yr. 1';
    case 'YR_2': return 'Yr. 2';
    case 'YR_3': return 'Yr. 3';
    case 'YR_4': return 'Yr. 4';
    default: return value;
  }
}

interface SearchResponse {
  success: boolean;
  data: SearchStudent[];
  message?: string;
}

export default function StaffRecordPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const handleSearch = async (value: string) => {
    setQuery(value);
    setError('');

    if (!value.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    setSearched(true);

    try {
      const token = getToken();
      if (!token) {
        setError('You are not logged in. Please sign in again.');
        setLoading(false);
        return;
      }

      const response = await api.get<SearchResponse>(
        `/clinic/search?q=${encodeURIComponent(value)}`,
        token
      );
      setResults(response.data || []);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to search records. Please try again.');
      }
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const displayResults = useMemo(() => {
    if (!searched) return null;
    if (loading) return <div className="text-center py-8 text-gray-500">Searching...</div>;
    if (error)
      return (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      );
    if (results.length === 0)
      return (
        <div className="text-center py-12">
          <p className="text-sm font-medium text-gray-600">No records found</p>
          <p className="text-xs text-gray-400 mt-1">Try searching by student number or name</p>
        </div>
      );

    return (
      <div className="space-y-2">
        {results.map((student) => (
          <Link
            key={student.studentNumber}
            href={`/dashboard/staff/record/${encodeURIComponent(student.studentNumber)}?returnTo=${encodeURIComponent('/dashboard/staff/record')}`}
            className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 hover:border-teal-300 hover:bg-teal-50 transition-colors group"
          >
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-gray-900 truncate">
                {student.lastName}, {student.firstName}
              </h3>
              <p className="text-sm text-teal-600 font-medium">{student.studentNumber}</p>
              <p className="text-xs text-gray-500 mt-1">
                {student.courseDept} • {student.course || 'Course N/A'} • {formatYearLevel(student.yearLevel)} • {student.sex || 'Sex N/A'} • {student.age ? `${student.age} yrs` : 'Age N/A'}
              </p>
            </div>
            <ChevronRight className="ml-3 h-5 w-5 text-gray-300 group-hover:text-teal-500 shrink-0" />
          </Link>
        ))}
      </div>
    );
  }, [searched, loading, error, results]);

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Patient Records</h1>
        <p className="text-sm text-gray-600 mt-1">Search and access student medical records securely</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search by student number or name..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition shadow-sm"
        />
      </div>

      {displayResults}
    </div>
  );
}