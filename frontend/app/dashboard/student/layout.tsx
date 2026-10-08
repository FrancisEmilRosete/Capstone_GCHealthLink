'use client';

/**
 * STUDENT LAYOUT
 * Wraps all /dashboard/student/* pages.
 * Provides: dark sidebar (Dashboard, My Record, optional Registration) + top bar.
 */

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ApiError, api } from '@/lib/api';
import { getDashboardRouteForRole, getNormalizedUserRole, getToken } from '@/lib/auth';
import StudentNotificationsBell from '@/components/dashboard/student/StudentNotificationsBell';
import Sidebar from '@/components/layout/Sidebar';
import {
  DashboardIcon,
  AuditIcon,
  CertificatesIcon,
  ConsultationsIcon,
  NotificationsIcon,
} from '@/components/icons/NavIcons';
import AiAssistantModal from '@/components/dashboard/AiAssistantModal';
import { Sparkles } from 'lucide-react';
import MessengerWidget from '@/components/messaging/MessengerWidget';
import QRCode from 'react-qr-code';

interface StudentProfileSummary {
  firstName: string;
  lastName: string;
  studentNumber: string;
  courseDept: string;
}

interface StudentProfileResponse {
  success: boolean;
  data: StudentProfileSummary;
}

interface StudentQrResponse {
  success: boolean;
  data: {
    studentNumber: string;
    qrToken: string;
  };
}

const REGISTRATION_ROUTE = '/dashboard/student/registration';
const DEFAULT_PROFILE_NAME = 'Student';
const STUDENT_QR_CACHE_KEY = 'gchl:student:static-qr';

interface CachedQrPayload {
  studentNumber: string;
  qrToken: string;
}

function readCachedQrPayload(): CachedQrPayload | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(STUDENT_QR_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<CachedQrPayload>;
    if (
      typeof parsed?.studentNumber !== 'string'
      || typeof parsed?.qrToken !== 'string'
    ) {
      return null;
    }

    if (!parsed.qrToken.trim()) {
      return null;
    }

    return {
      studentNumber: parsed.studentNumber,
      qrToken: parsed.qrToken,
    };
  } catch {
    return null;
  }
}

function writeCachedQrPayload(payload: CachedQrPayload) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(STUDENT_QR_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore cache write failures.
  }
}

// ── Nav items ─────────────────────────────────────────────────

const REGISTRATION_NAV_ITEM = {
  id: 'registration',
  label: 'Registration',
  href: REGISTRATION_ROUTE,
  icon: CertificatesIcon,
};

const getStudentNavGroups = (showRegistration: boolean) => [
  {
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        href: '/dashboard/student',
        icon: DashboardIcon,
      },
      {
        id: 'my-record',
        label: 'My Record',
        href: '/dashboard/student/my-record',
        icon: AuditIcon,
      },
      ...(showRegistration ? [REGISTRATION_NAV_ITEM] : []),
      {
        id: 'consultation-request',
        label: 'My Consultations',
        href: '/dashboard/student/consultation-request',
        icon: ConsultationsIcon,
      },
    ],
  },
];

// ── QR Modal ─────────────────────────────────────────────────

function QRModal({
  onClose,
  profileName,
  studentNumber,
  courseDept,
  qrToken,
}: {
  onClose: () => void;
  profileName: string;
  studentNumber: string;
  courseDept: string;
  qrToken: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-80 p-6 flex flex-col items-center"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="w-full flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-900">My Student QR Code</h2>
          <button aria-label="Close QR code" onClick={onClose} className="p-1.5 rounded-lg text-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--primary-soft))] transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* QR Code SVG */}
        <div className="mb-4 bg-white p-2 flex items-center justify-center rounded-lg border border-gray-100 w-[180px] h-[180px]">
          {qrToken ? (
            <QRCode
              size={256}
              style={{ height: "auto", maxWidth: "100%", width: "100%" }}
              value={qrToken}
              viewBox={`0 0 256 256`}
            />
          ) : (
            <div className="w-full h-full bg-gray-100 animate-pulse rounded-md flex items-center justify-center text-xs text-gray-400">
              Loading...
            </div>
          )}
        </div>

        {/* Student info */}
        <p className="text-[11px] text-gray-400 tracking-widest mb-0.5">{studentNumber || 'N/A'}</p>
        <p className="text-base font-bold text-gray-900">{profileName}</p>
        <p className="text-sm text-gray-500 mb-3">{courseDept || 'N/A'}</p>
        <p className="text-xs text-teal-600 text-center mb-5">
          Scan this code at the clinic kiosk for<br />faster check-in.
        </p>

        {/* Close button */}
        <div className="w-full border-t border-gray-100 pt-4">
          <button onClick={onClose}
            className="w-full py-2.5 text-sm font-medium text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--primary-soft))] rounded-xl transition">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Top Bar ───────────────────────────────────────────────────

function StudentTopBar({
  onMenuClick,
  isDark,
  onToggleDark,
  profileName,
  studentNumber,
  courseDept,
  qrToken,
}: {
  onMenuClick: () => void;
  isDark: boolean;
  onToggleDark: () => void;
  profileName: string;
  studentNumber: string;
  courseDept: string;
  qrToken: string;
}) {
  const [qrOpen, setQrOpen] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [autoOpened, setAutoOpened] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const hasSeen = sessionStorage.getItem('ai_reminders_shown');
    if (!hasSeen) {
      setAiModalOpen(true);
      setAutoOpened(true);
      sessionStorage.setItem('ai_reminders_shown', 'true');
    }
  }, []);

  function resolveStudentTitle(path: string) {
    const seg = path.replace(/\/$/, '');
    if (seg === '/dashboard/student') return 'Student Dashboard';
    if (seg.startsWith('/dashboard/student/my-record')) return 'My Record';
    if (seg.startsWith('/dashboard/student/registration')) return 'Registration';
    if (seg.startsWith('/dashboard/student/consultation-request')) return 'Consultation Request';
    if (seg.startsWith('/dashboard/student/notifications')) return 'Notifications';
    return 'Student Dashboard';
  }

  function resolveStudentSubtitle(path: string) {
    const seg = path.replace(/\/$/, '');
    if (seg === '/dashboard/student') return 'Your Health Overview';
    if (seg.startsWith('/dashboard/student/my-record')) return 'View Your Medical Record';
    if (seg.startsWith('/dashboard/student/registration')) return 'Complete Registration Details';
    if (seg.startsWith('/dashboard/student/consultation-request')) return 'Submit Consultation Requests';
    if (seg.startsWith('/dashboard/student/notifications')) return 'View Clinic Alerts';
    return 'Your Health Overview';
  }

  const currentPath = pathname || '/dashboard/student';
  const title = resolveStudentTitle(currentPath);
  const subtitle = resolveStudentSubtitle(currentPath);

  return (
    <>
      {qrOpen && (
        <QRModal
          onClose={() => setQrOpen(false)}
          profileName={profileName}
          studentNumber={studentNumber}
          courseDept={courseDept}
          qrToken={qrToken}
        />
      )}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-slate-100 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onMenuClick}
              aria-label="Open menu"
              className="lg:hidden shrink-0 p-2 -ml-1 rounded-lg text-slate-500 hover:bg-teal-50 hover:text-teal-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <h1 className="text-lg font-bold text-slate-800 tracking-tight">{title}</h1>
              <p className="text-[11px] font-semibold text-teal-600 uppercase tracking-widest mt-0.5">{subtitle}</p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            
            <button
              onClick={() => {
                setAutoOpened(false);
                setAiModalOpen(true);
              }}
              className="relative shrink-0 p-2 rounded-lg text-indigo-500 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
              title="Smart AI Assistant"
            >
              <Sparkles className="w-[18px] h-[18px]" strokeWidth={2} />
            </button>

            <StudentNotificationsBell />

            <button
              onClick={() => setQrOpen(true)}
              className="flex items-center gap-1.5 bg-white hover:bg-teal-50 text-slate-700 text-xs font-semibold px-3 py-2 rounded-lg transition-colors border border-slate-200"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 3h7v7H3V3zm2 2v3h3V5H5zm8-2h7v7h-7V3zm2 2v3h3V5h-3zM3 13h7v7H3v-7zm2 2v3h3v-3H5zm11-2h2v2h-2v-2zm-2 2h2v2h-2v-2zm2 2h2v2h-2v-2zm2 0h2v2h-2v-2zm-4 2h2v2h-2v-2zm4 0h2v2h-2v-2z" />
              </svg>
              My QR
            </button>
          </div>
        </div>
      </header>

      <AiAssistantModal 
        isOpen={aiModalOpen} 
        onClose={() => setAiModalOpen(false)} 
        autoOpened={autoOpened}
      />
    </>
  );
}

// ── Layout ────────────────────────────────────────────────────

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isDark,      setIsDark]      = useState(false);
  const [profileName, setProfileName] = useState(DEFAULT_PROFILE_NAME);
  const [hasCompletedProfile, setHasCompletedProfile] = useState<boolean | null>(null);
  const [studentNumber, setStudentNumber] = useState('');
  const [courseDept, setCourseDept] = useState('');
  const [qrToken, setQrToken] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const token = getToken();
  const role = getNormalizedUserRole();
  const roleLabel = role === 'STUDENT' ? 'Student' : 'User';
  const isAuthorized = !!token && role === 'STUDENT';

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!token || !role) {
      router.replace('/login');
      return;
    }

    if (role !== 'STUDENT') {
      router.replace(getDashboardRouteForRole(role));
      return;
    }

    const authToken = token;

    let mounted = true;
    async function loadStudentSession() {
      try {
        const cachedQr = readCachedQrPayload();
        if (cachedQr?.qrToken) {
          setQrToken(cachedQr.qrToken);
          if (cachedQr.studentNumber) {
            setStudentNumber(cachedQr.studentNumber);
          }
        }

        const [profileResponse, qrResponse] = await Promise.allSettled([
          api.get<StudentProfileResponse>('/students/me', authToken),
          api.get<StudentQrResponse>('/students/qr', authToken),
        ]);

        if (!mounted) return;

        let profile: StudentProfileSummary | null = null;

        if (profileResponse.status === 'fulfilled') {
          profile = profileResponse.value.data;
          const fullName = `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim();

          setProfileName(fullName || DEFAULT_PROFILE_NAME);
          setStudentNumber(profile?.studentNumber || '');
          setCourseDept(profile?.courseDept || '');
          setHasCompletedProfile(true);
        } else {
          setProfileName(DEFAULT_PROFILE_NAME);
          setStudentNumber('');
          setCourseDept('');

          if (profileResponse.reason instanceof ApiError && profileResponse.reason.status === 404) {
            setHasCompletedProfile(false);
          } else {
            setHasCompletedProfile(false);
          }
        }

        if (qrResponse.status === 'fulfilled') {
          const qrPayload = qrResponse.value.data;
          setQrToken(qrPayload?.qrToken || cachedQr?.qrToken || '');
          setStudentNumber(qrPayload?.studentNumber || profile?.studentNumber || cachedQr?.studentNumber || '');

          if (qrPayload?.qrToken) {
            writeCachedQrPayload({
              studentNumber: qrPayload.studentNumber || profile?.studentNumber || '',
              qrToken: qrPayload.qrToken,
            });
          }
        } else {
          setQrToken(cachedQr?.qrToken || '');
        }
      } catch {
        if (!mounted) return;

        setProfileName(DEFAULT_PROFILE_NAME);
        setHasCompletedProfile(false);
      }
    }

    void loadStudentSession();

    return () => {
      mounted = false;
    };
  }, [role, router, token]);

  if (!isMounted || !isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))]">
        <p className="text-sm text-[hsl(var(--muted))]">Checking session...</p>
      </div>
    );
  }

  return (
    <div className={`flex h-screen overflow-hidden dashboard-record-theme${isDark ? ' dark' : ''}`}>
      <Sidebar
        isOpen={sidebarOpen}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        onClose={() => setSidebarOpen(false)}
        userName={profileName}
        userRole={roleLabel}
        brandSubtitle="Student Portal"
        navGroups={getStudentNavGroups(hasCompletedProfile === false)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[hsl(var(--background))]">
        <StudentTopBar
          onMenuClick={() => setSidebarOpen(true)}
          isDark={isDark}
          onToggleDark={() => setIsDark(d => !d)}
          profileName={profileName}
          studentNumber={studentNumber}
          courseDept={courseDept}
          qrToken={qrToken}
        />
        <main className="flex-1 overflow-y-auto dashboard-uniform-width">
          {children}
        </main>
      </div>

      {/* Floating Messenger Widget */}
      <MessengerWidget />
    </div>
  );
}
