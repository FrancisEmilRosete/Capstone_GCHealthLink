/**
 * LOGIN PAGE
 * ──────────────────────────────────────────────────────────────
 * Route: /login
 *
 * This is the main login screen for GC HealthLink.
 * It is the first page users see when they open the app.
 *
 * Responsibilities:
 * 1. Holds the form state (role, email, password, rememberMe)
 * 2. Passes state and handlers down to child components
 * 3. Calls the real Node.js backend API when Sign In is clicked
 * 4. Redirects to the correct dashboard based on the database role
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import Link from 'next/link';

import { UserRole }               from '@/types/auth';
import { ApiError }               from '@/lib/api';
import { authLogin, authLogout }  from '@/lib/auth';
import HeartbeatIcon              from '@/components/icons/HeartbeatIcon';
import RoleSelector               from '@/components/auth/RoleSelector';
import LoginForm                  from '@/components/auth/LoginForm';

function getAccountRoleLabel(role: string): string {
  const normalized = role.trim().toUpperCase();
  if (normalized === 'ADMIN') return 'admin';
  if (normalized === 'CLINIC_STAFF') return 'clinic staff';
  return 'student';
}

const CLINIC_STAFF_ROLES: UserRole[] = ['staff', 'doctor', 'dental'];

function mapLoginErrorMessage(error: ApiError): string {
  const message = (error.message || '').trim();
  const lowered = message.toLowerCase();

  if (error.status === 401) {
    return 'Invalid email or password.';
  }

  if (error.status === 429) {
    return message || 'Too many login attempts. Please wait and try again.';
  }

  if (
    error.status === 503 ||
    lowered.includes('database') ||
    lowered.includes('dbhandler') ||
    lowered.includes('connector') ||
    lowered.includes('temporarily unavailable')
  ) {
    return 'Login is temporarily unavailable because the database is offline. Please try again in a few minutes.';
  }

  if (error.status >= 500) {
    return 'Server error during sign in. Please try again shortly.';
  }

  return message || 'Unable to sign in. Please review your credentials and try again.';
}

export default function LoginPage() {

  const router = useRouter();

  // ── Form State ─────────────────────────────────────────────
  const [selectedRole, setSelectedRole] = useState<UserRole>('staff');
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [rememberMe,   setRememberMe]   = useState(false);
  const [error,        setError]        = useState('');
  const [loading,      setLoading]      = useState(false);

  // ── Handlers ───────────────────────────────────────────────

  /**
   * Handles the Sign In button click.
   * Sends credentials to the Node.js backend and handles the JWT token.
   */
  async function handleSignIn() {
    setError('');

    if (!email.trim()) { setError('Please enter your email address.'); return; }
    if (!password)     { setError('Please enter your password.');       return; }

    setLoading(true);

    try {
      const { user } = await authLogin({
        email: email.trim().toLowerCase(),
        password,
      });

      const backendRole = (user.role || '').trim().toUpperCase();
      const allowedRoles: UserRole[] = backendRole === 'ADMIN'
        ? ['admin']
        : backendRole === 'CLINIC_STAFF'
          ? CLINIC_STAFF_ROLES
          : ['student'];

      if (!allowedRoles.includes(selectedRole)) {
        authLogout();
        setError(`Role mismatch. This account is registered as ${getAccountRoleLabel(backendRole)}.`);
        return;
      }

      const dashboardRoute = selectedRole === 'admin'
        ? '/dashboard/admin'
        : selectedRole === 'doctor'
          ? '/dashboard/doctor'
          : selectedRole === 'dental'
            ? '/dashboard/dental'
            : selectedRole === 'staff'
              ? '/dashboard/staff'
              : '/dashboard/student';

      router.push(dashboardRoute);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(mapLoginErrorMessage(err));
      } else {
        setError('Could not connect to the server. Is the backend running?');
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-white">

      {/* ── Background Blobs ───────────────────────────────── */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full bg-teal-400 opacity-20 blur-[120px]" />
      <div className="pointer-events-none absolute -top-20 -right-32 w-[480px] h-[480px] rounded-full bg-blue-400 opacity-20 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-32 -left-20 w-[420px] h-[420px] rounded-full bg-teal-300 opacity-15 blur-[120px]" />

      {/* ── Login Card ─────────────────────────────────────── */}
      <div className="relative z-10 bg-white rounded-3xl shadow-2xl p-8 w-full max-w-[380px] mx-4">

        {/* App Logo and Title */}
        <div className="flex flex-col items-center mb-7">
          <div className="w-14 h-14 bg-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-200 mb-3">
            <HeartbeatIcon />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            GC HealthLink
          </h1>
          <p className="text-teal-600 text-sm mt-0.5 font-medium">
            Campus Clinic Management System
          </p>
        </div>

        {/* Step 1: Pick a Role */}
        <RoleSelector
          selectedRole={selectedRole}
          onSelect={setSelectedRole}
        />

        {/* Step 2: Enter Credentials */}
        <LoginForm
          email={email}
          password={password}
          rememberMe={rememberMe}
          onEmailChange={(v) => { setError(''); setEmail(v); }}
          onPasswordChange={(v) => { setError(''); setPassword(v); }}
          onRememberChange={setRememberMe}
          onSubmit={handleSignIn}
          error={error}
          loading={loading}
        />

        {/* Register link for new students */}
        <p className="mt-4 text-center text-xs text-gray-400">
          New student?{' '}
          <Link href="/register" className="text-teal-600 hover:text-teal-700 font-semibold hover:underline">
            Register your health record
          </Link>
        </p>

      </div>
    </div>
  );
}
