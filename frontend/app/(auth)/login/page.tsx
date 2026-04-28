/**
 * LOGIN PAGE
 * ──────────────────────────────────────────────────────────────
 * Route: /login
 *
 * This is the main login screen for GC HealthLink.
 * It is the first page users see when they open the app.
 *
 * Responsibilities:
 * 1. Holds the form state (email, password, rememberMe, legalAccepted)
 * 2. Passes state and handlers down to child components
 * 3. Calls the real Node.js backend API when Sign In is clicked
 * 4. Automatically detects the user's role from the backend response
 *    and redirects to the correct dashboard (no manual role selection)
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import Link from 'next/link';

import { ApiError }               from '@/lib/api';
import { authLogin, getDashboardRouteForRole, getSessionRoleFromUser, setUserRole } from '@/lib/auth';
import AppLogo                    from '@/components/branding/AppLogo';
import LoginForm                  from '@/components/auth/LoginForm';

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
  const [email,         setEmail]         = useState('');
  const [password,      setPassword]      = useState('');
  const [rememberMe,    setRememberMe]    = useState(false);
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [error,         setError]         = useState('');
  const [loading,       setLoading]       = useState(false);

  // ── Handlers ───────────────────────────────────────────────

  /**
   * Handles the Sign In button click.
   * Sends credentials to the Node.js backend, reads the user's role
   * from the response (including clinicStaffType for staff), and
   * redirects automatically to the correct dashboard.
   */
  async function handleSignIn() {
    setError('');

    if (!email.trim()) { setError('Please enter your email address.'); return; }
    if (!password)     { setError('Please enter your password.');       return; }
    if (!legalAccepted) {
      setError('Please accept the Privacy Policy and Terms of Agreement to continue.');
      return;
    }

    setLoading(true);

    try {
      const { user } = await authLogin({
        email: email.trim().toLowerCase(),
        password,
      });

      // Resolve the correct dashboard role from the backend response.
      // For CLINIC_STAFF users, clinicStaffType distinguishes DOCTOR / DENTAL / NURSE.
      const sessionRole = getSessionRoleFromUser(user);

      if (!sessionRole) {
        setError('Your account has an unrecognized role. Please contact the administrator.');
        setLoading(false);
        return;
      }

      // Persist the resolved role so layout auth guards can read it.
      setUserRole(sessionRole);

      router.push(getDashboardRouteForRole(sessionRole));
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
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-200 mb-3 bg-white border border-teal-100">
            <AppLogo className="h-10 w-10 object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            GC HealthLink
          </h1>
          <p className="text-teal-600 text-sm mt-0.5 font-medium">
            Campus Clinic Management System
          </p>
        </div>

        {/* Login Form — role is detected automatically from the backend */}
        <LoginForm
          email={email}
          password={password}
          rememberMe={rememberMe}
          legalAccepted={legalAccepted}
          onEmailChange={(v) => { setError(''); setEmail(v); }}
          onPasswordChange={(v) => { setError(''); setPassword(v); }}
          onRememberChange={setRememberMe}
          onLegalChange={(v) => { setError(''); setLegalAccepted(v); }}
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
