'use client';

import { useEffect, useState } from 'react';

import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import QrScannerInput from '@/components/scanner/QrCameraScanner';

interface SearchStudent {
  studentNumber: string;
  firstName: string;
  lastName: string;
  courseDept: string;
  user: {
    id: string;
  };
}

interface SearchResponse {
  success: boolean;
  data: SearchStudent[];
}

interface ScanProfile {
  id: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  courseDept: string;
}

interface ScanResponse {
  success: boolean;
  data: ScanProfile;
}

export interface QrResolvedStudent {
  userId?: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  courseDept?: string;
}

interface UseQrLookupModalProps {
  open: boolean;
  onClose: () => void;
  onResolved: (student: QrResolvedStudent) => void;
  onNotFound?: () => void;
}

function looksLikeStudentNumber(value: string) {
  return /^\d{4}-\d{3,}$/.test(value.trim());
}

function normalizeParsedValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function classifyStudentIdentifier(value: string): { userId?: string; studentNumber?: string } {
  const normalized = value.trim();
  if (!normalized) return {};
  if (looksLikeStudentNumber(normalized)) {
    return { studentNumber: normalized };
  }
  return { userId: normalized };
}

function parseQrPayload(raw: string): {
  userId?: string;
  studentNumber?: string;
  qrToken?: string;
  fallbackText: string;
} {
  const trimmed = raw.trim();
  if (!trimmed) return { fallbackText: '' };

  const fromRecord = (record: Record<string, unknown>) => {
    const qrToken = normalizeParsedValue(record.qrToken ?? record.token);
    const explicitUserId = normalizeParsedValue(record.userId ?? record.id);
    const explicitStudentNumber = normalizeParsedValue(record.studentNumber ?? record.studentNo);
    const ambiguousStudentId = normalizeParsedValue(record.studentId);

    const fromAmbiguousStudentId = classifyStudentIdentifier(ambiguousStudentId);
    const fromExplicitUserId = classifyStudentIdentifier(explicitUserId);
    const fromExplicitStudentNumber = classifyStudentIdentifier(explicitStudentNumber);

    return {
      qrToken: qrToken || undefined,
      userId: fromAmbiguousStudentId.userId || fromExplicitUserId.userId || undefined,
      studentNumber:
        fromAmbiguousStudentId.studentNumber
        || fromExplicitStudentNumber.studentNumber
        || undefined,
    };
  };

  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const resolved = fromRecord(parsed);
      if (resolved.qrToken || resolved.userId || resolved.studentNumber) {
        return { ...resolved, fallbackText: trimmed };
      }
    }
  } catch {
    // Non-JSON payloads are treated as manual query text.
  }

  try {
    const url = new URL(trimmed);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const lastSegment = decodeURIComponent(pathSegments[pathSegments.length - 1] || '');
    const resolved = fromRecord({
      qrToken:
        url.searchParams.get('qrToken')
        || url.searchParams.get('token')
        || (url.pathname.includes('/scan-token/') ? lastSegment : ''),
      userId: url.searchParams.get('userId') || url.searchParams.get('id') || '',
      studentId:
        url.searchParams.get('studentId')
        || (url.pathname.includes('/scan/') ? lastSegment : ''),
      studentNumber: url.searchParams.get('studentNumber') || url.searchParams.get('studentNo') || '',
    });

    if (resolved.qrToken || resolved.userId || resolved.studentNumber) {
      return { ...resolved, fallbackText: trimmed };
    }
  } catch {
    // Keep raw fallback handling when payload is not a URL.
  }

  return { fallbackText: trimmed };
}

export default function UseQrLookupModal({ open, onClose, onResolved, onNotFound }: UseQrLookupModalProps) {
  const [statusMessage, setStatusMessage] = useState('Scanner is ready. Scan a student QR now.');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setStatusMessage('Scanner is ready. Scan a student QR now.');
      setLoading(false);
    }
  }, [open]);

  async function fetchStudentByUserId(userId: string, token: string) {
    const response = await api.get<ScanResponse>(`/clinic/scan/${userId}`, token);
    return {
      userId,
      studentNumber: response.data.studentNumber,
      firstName: response.data.firstName,
      lastName: response.data.lastName,
      courseDept: response.data.courseDept,
    } as QrResolvedStudent;
  }

  async function fetchStudentByQrToken(qrToken: string, token: string) {
    const response = await api.get<ScanResponse>(`/clinic/scan-token/${encodeURIComponent(qrToken)}`, token);
    return {
      studentNumber: response.data.studentNumber,
      firstName: response.data.firstName,
      lastName: response.data.lastName,
      courseDept: response.data.courseDept,
    } as QrResolvedStudent;
  }

  async function searchStudent(query: string, token: string) {
    const response = await api.get<SearchResponse>(`/clinic/search?q=${encodeURIComponent(query)}`, token);
    const matches = response.data || [];
    if (matches.length === 0) {
      return null;
    }

    const exactMatch = matches.find((student) => student.studentNumber.toLowerCase() === query.toLowerCase());
    const chosen = exactMatch || matches[0];

    return {
      userId: chosen.user.id,
      studentNumber: chosen.studentNumber,
      firstName: chosen.firstName,
      lastName: chosen.lastName,
      courseDept: chosen.courseDept,
    } as QrResolvedStudent;
  }

  async function resolveLookup(rawInput: string) {
    const token = getToken();
    if (!token) {
      setStatusMessage('You are not logged in. Please sign in again.');
      return;
    }

    const parsed = parseQrPayload(rawInput);
    if (!parsed.userId && !parsed.studentNumber && !parsed.qrToken && !parsed.fallbackText) return;

    setLoading(true);
    try {
      let student: QrResolvedStudent | null = null;

      if (parsed.qrToken) {
        student = await fetchStudentByQrToken(parsed.qrToken, token);
      } else if (parsed.userId) {
        student = await fetchStudentByUserId(parsed.userId, token);
      } else if (parsed.studentNumber) {
        student = await searchStudent(parsed.studentNumber, token);
      } else {
        student = await searchStudent(parsed.fallbackText, token);
      }

      if (!student) {
        setStatusMessage('Student not found. Please try another QR.');
        onNotFound?.();
        return;
      }

      setStatusMessage(`Found: ${student.lastName}, ${student.firstName} (${student.studentNumber})`);
      onResolved(student);
      onClose();
    } catch (error) {
      if (error instanceof ApiError) {
        setStatusMessage(error.message || 'Student not found. Please try again.');
      } else {
        setStatusMessage('Student not found. Please try another QR.');
      }
      onNotFound?.();
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-slate-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-900">Use QR</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-sm font-bold"
            aria-label="Close"
          >
            Close
          </button>
        </div>

        <QrScannerInput active={!loading} onScan={(value) => { void resolveLookup(value); }} />

        <p className="mt-4 text-xs font-semibold text-slate-600 text-center">{statusMessage}</p>
      </div>
    </div>
  );
}
