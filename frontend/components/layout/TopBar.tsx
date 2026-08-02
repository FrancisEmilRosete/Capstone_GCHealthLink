'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import AdminNotificationsBell from '@/components/dashboard/admin/AdminNotificationsBell';
import StaffNotificationsBell from '@/components/dashboard/staff/StaffNotificationsBell';
import DoctorNotificationsBell from '@/components/dashboard/doctor/DoctorNotificationsBell';
import DentalNotificationsBell from '@/components/dashboard/dental/DentalNotificationsBell';
import AiAssistantModal from '@/components/dashboard/AiAssistantModal';
import { Sparkles, Bot } from 'lucide-react';
import { useState, useEffect } from 'react';

interface TopBarProps {
  onMenuOpen?:        () => void;
  userName?:          string;
  notificationsHref?: string;
}

/** Resolve a human-readable page title from the current pathname. */
function resolvePageTitle(pathname: string | null): string {
  if (!pathname) return 'Dashboard';

  const seg = pathname.replace(/\/$/, '');

  // Staff
  if (seg === '/dashboard/staff')                    return 'Medical Clinic Dashboard';
  if (seg.startsWith('/dashboard/staff/students'))   return 'Student Records';
  if (seg.startsWith('/dashboard/staff/inventory'))  return 'Medical Inventory';
  if (seg.startsWith('/dashboard/staff/certificates'))return 'Certificates';
  if (seg.startsWith('/dashboard/staff/reports'))    return 'Reports';
  if (seg.startsWith('/dashboard/staff/notifications'))return 'Notifications';
  if (seg.startsWith('/dashboard/staff/calendar'))   return 'Calendar';
  if (seg.startsWith('/dashboard/staff/history'))    return 'History';
  if (seg.startsWith('/dashboard/staff/logs'))       return 'Logs';
  if (seg.startsWith('/dashboard/staff/scanner'))    return 'QR Scanner';

  // Doctor
  if (seg === '/dashboard/doctor')                   return 'Doctor Dashboard';
  if (seg.startsWith('/dashboard/doctor/records'))   return 'Patient Records';
  if (seg.startsWith('/dashboard/doctor/students'))  return 'Student Records';
  if (seg.startsWith('/dashboard/doctor/inventory')) return 'Medical Inventory';
  if (seg.startsWith('/dashboard/doctor/certificates')) return 'Medical Certificates';
  if (seg.startsWith('/dashboard/doctor/consultations')) return 'Consultations';
  if (seg.startsWith('/dashboard/doctor/reports'))   return 'Reports';
  if (seg.startsWith('/dashboard/doctor/calendar'))  return 'Calendar';
  if (seg.startsWith('/dashboard/doctor/scanner'))   return 'QR Scanner';
  if (seg.startsWith('/dashboard/doctor/notifications'))return 'Notifications';
  if (seg.startsWith('/dashboard/doctor/history'))   return 'Health History';
  if (seg.startsWith('/dashboard/doctor/physical-examination')) return 'Physical Examination';
  if (seg.startsWith('/dashboard/doctor/settings'))  return 'Settings';
  if (seg.startsWith('/dashboard/doctor'))           return 'Doctor Portal';

  // Dental
  if (seg === '/dashboard/dental')                   return 'Dental Dashboard';
  if (seg.startsWith('/dashboard/dental/records'))   return 'Dental Records';
  if (seg.startsWith('/dashboard/dental/inventory')) return 'Dental Inventory';
  if (seg.startsWith('/dashboard/dental/notifications'))return 'Notifications';
  if (seg.startsWith('/dashboard/dental'))           return 'Dental Portal';

  // Student
  if (seg === '/dashboard/student') return 'Student Dashboard';
  if (seg.startsWith('/dashboard/student/my-record')) return 'My Record';
  if (seg.startsWith('/dashboard/student/registration')) return 'Registration';
  if (seg.startsWith('/dashboard/student/consultation-request')) return 'Consultation Request';
  if (seg.startsWith('/dashboard/student/notifications')) return 'Notifications';

  // Admin
  if (seg === '/dashboard/admin') return 'Admin Dashboard';
  if (seg.startsWith('/dashboard/admin/users')) return 'User Management';
  if (seg.startsWith('/dashboard/admin/students')) return 'Students';
  if (seg.startsWith('/dashboard/admin/records')) return 'Records';
  if (seg.startsWith('/dashboard/admin/inventory')) return 'Inventory';
  if (seg.startsWith('/dashboard/admin/certificates')) return 'Certificates';
  if (seg.startsWith('/dashboard/admin/reports')) return 'Reports';
  if (seg.startsWith('/dashboard/admin/notifications')) return 'Notifications';
  if (seg.startsWith('/dashboard/admin/audit')) return 'Audit Logs';
  if (seg.startsWith('/dashboard/admin/settings')) return 'Settings';
  if (seg.startsWith('/dashboard/admin/announcement')) return 'Announcements';

  return 'GC HealthLink';
}

/** Auto-derive notifications component from current path segment. */
function resolveNotifComponent(pathname: string | null) {
  if (!pathname) return null;
  if (pathname.startsWith('/dashboard/doctor')) return <DoctorNotificationsBell />;
  if (pathname.startsWith('/dashboard/dental')) return <DentalNotificationsBell />;
  if (pathname.startsWith('/dashboard/staff'))  return <StaffNotificationsBell />;
  if (pathname.startsWith('/dashboard/admin'))  return <AdminNotificationsBell />;
  return null;
}

function resolveDashboardSubtitle(pathname: string | null): string {
  if (!pathname) return 'Workspace Overview';

  const seg = pathname.replace(/\/$/, '');
  // Staff
  if (seg === '/dashboard/staff') return 'Monitor Patient Queue';
  if (seg.startsWith('/dashboard/staff/students')) return 'Browse Student Records';
  if (seg.startsWith('/dashboard/staff/inventory')) return 'Track Medicine Stocks';
  if (seg.startsWith('/dashboard/staff/certificates')) return 'Review Issued Certificates';
  if (seg.startsWith('/dashboard/staff/reports')) return 'Generate Clinic Reports';
  if (seg.startsWith('/dashboard/staff/notifications')) return 'View Clinic Alerts';
  if (seg.startsWith('/dashboard/staff/calendar')) return 'Manage Doctor Availability';
  if (seg.startsWith('/dashboard/staff/history')) return 'Audit Clinic Activity Logs';
  if (seg.startsWith('/dashboard/staff/logs')) return 'Audit Clinic Activity Logs';
  if (seg.startsWith('/dashboard/staff/scanner')) return 'Scan Student QR Codes';

  // Doctor
  if (seg === '/dashboard/doctor') return 'Monitor Patient Queue';
  if (seg.startsWith('/dashboard/doctor/records')) return 'Review Patient Records';
  if (seg.startsWith('/dashboard/doctor/students')) return 'Browse Student Records';
  if (seg.startsWith('/dashboard/doctor/inventory')) return 'Live data from the backend inventory table';
  if (seg.startsWith('/dashboard/doctor/certificates')) return 'Issue and manage medical certificates for students';
  if (seg.startsWith('/dashboard/doctor/scanner')) return 'Scan Student QR Codes';
  if (seg.startsWith('/dashboard/doctor/consultations')) return 'Manage Consultations';
  if (seg.startsWith('/dashboard/doctor/reports')) return 'View Medical Reports';
  if (seg.startsWith('/dashboard/doctor/history')) return 'Audit Clinical Activity';
  if (seg.startsWith('/dashboard/doctor/physical-examination')) return 'Track Physical Exams';
  if (seg.startsWith('/dashboard/doctor/settings')) return 'Configure Doctor Settings';

  // Dental
  if (seg === '/dashboard/dental') return 'Monitor Dental Queue';
  if (seg.startsWith('/dashboard/dental/records')) return 'Review Dental Records';
  if (seg.startsWith('/dashboard/dental/inventory')) return 'Track Dental Supplies';
  if (seg.startsWith('/dashboard/dental/scanner')) return 'Scan Student QR Codes';
  if (seg.startsWith('/dashboard/dental/history')) return 'Audit Dental Activity';
  if (seg.startsWith('/dashboard/dental/students')) return 'Browse Student Records';

  // Student
  if (seg === '/dashboard/student') return 'Your Health Overview';
  if (seg.startsWith('/dashboard/student/my-record')) return 'View Your Medical Record';
  if (seg.startsWith('/dashboard/student/registration')) return 'Complete Registration Details';
  if (seg.startsWith('/dashboard/student/consultation-request')) return 'Submit Consultation Requests';
  if (seg.startsWith('/dashboard/student/notifications')) return 'View Clinic Alerts';

  // Admin
  if (seg === '/dashboard/admin') return 'System Operations Overview';
  if (seg.startsWith('/dashboard/admin/users')) return 'Manage System Users';
  if (seg.startsWith('/dashboard/admin/students')) return 'Manage Student Directory';
  if (seg.startsWith('/dashboard/admin/records')) return 'Review Health Records';
  if (seg.startsWith('/dashboard/admin/inventory')) return 'Track Clinic Inventory';
  if (seg.startsWith('/dashboard/admin/certificates')) return 'Review Issued Certificates';
  if (seg.startsWith('/dashboard/admin/reports')) return 'Generate Analytics Reports';
  if (seg.startsWith('/dashboard/admin/notifications')) return 'Monitor System Alerts';
  if (seg.startsWith('/dashboard/admin/audit')) return 'Inspect Audit Trails';
  if (seg.startsWith('/dashboard/admin/settings')) return 'Configure System Settings';
  if (seg.startsWith('/dashboard/admin/announcement')) return 'Publish Clinic Advisories';

  return 'Workspace Overview';
}

export default function TopBar({
  onMenuOpen,
  notificationsHref,
}: TopBarProps) {
  const pathname = usePathname();
  const pageTitle  = resolvePageTitle(pathname);
  const notifComponent  = resolveNotifComponent(pathname);
  const isDashboardPath = Boolean(pathname?.startsWith('/dashboard/'));
  const dashboardSubtitle = resolveDashboardSubtitle(pathname);
  const isAdmin = pathname?.startsWith('/dashboard/admin');

  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [autoOpened, setAutoOpened] = useState(false);

  useEffect(() => {
    // Only auto-open if not admin and we haven't shown it yet in this session
    if (!isAdmin && isDashboardPath) {
      const hasSeen = sessionStorage.getItem('ai_reminders_shown');
      if (!hasSeen) {
        setAiModalOpen(true);
        setAutoOpened(true);
        sessionStorage.setItem('ai_reminders_shown', 'true');
      }
    }
  }, [isAdmin, isDashboardPath]);

  return (
    <>
    <header
      className={[
        'sticky top-0 print:hidden',
        isDashboardPath
          ? 'z-20 bg-white/95 backdrop-blur-sm border-b border-slate-100 px-6 py-4 shadow-sm'
          : 'z-10 flex items-center justify-between gap-3 px-4 sm:px-5 py-3 bg-[hsl(var(--surface))] border-b border-[hsl(var(--border))]',
      ].join(' ')}
      style={isDashboardPath ? undefined : { boxShadow: 'var(--shadow-topbar)' }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onMenuOpen}
            className={[
              'lg:hidden shrink-0 p-2 -ml-1 transition-colors',
              isDashboardPath
                ? 'rounded-lg text-slate-500 hover:bg-teal-50 hover:text-teal-700'
                : 'rounded-[var(--radius-md)] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--primary-soft))] hover:text-[hsl(var(--primary))]',
            ].join(' ')}
            aria-label="Open navigation menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {isDashboardPath ? (
            <div>
              <h1 className="text-lg font-bold text-slate-800 tracking-tight">{pageTitle}</h1>
              <p className="text-[11px] font-semibold text-teal-600 uppercase tracking-widest mt-0.5">{dashboardSubtitle}</p>
            </div>
          ) : (
            <span className="text-sm font-semibold text-[hsl(var(--foreground))] truncate">
              {pageTitle}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!isAdmin && isDashboardPath && (
            <button
              onClick={() => {
                setAutoOpened(false);
                setAiModalOpen(true);
              }}
              className="relative shrink-0 p-2 rounded-lg text-teal-600 hover:bg-teal-50 hover:text-teal-700 transition-colors"
              title="Smart AI Assistant"
            >
              <Bot className="w-[18px] h-[18px] animate-bounce" style={{ animationDuration: '2.5s' }} strokeWidth={2} />
            </button>
          )}

          {/* Right: Notification bell only */}
          {notifComponent ? (
            notifComponent
          ) : (
            <button
              type="button"
              className={[
                'relative shrink-0 p-2 transition-colors',
                isDashboardPath
                  ? 'rounded-lg text-slate-500 hover:bg-teal-50 hover:text-teal-700'
                  : 'rounded-[var(--radius-md)] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--primary-soft))] hover:text-[hsl(var(--primary))]',
              ].join(' ')}
              aria-label="Notifications"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </header>
    
    {!isAdmin && (
      <AiAssistantModal 
        isOpen={aiModalOpen} 
        onClose={() => setAiModalOpen(false)} 
        autoOpened={autoOpened}
      />
    )}
    </>
  );
}
