/**
 * LOGIN PAGE
 * ──────────────────────────────────────────────────────────────
 * Route: /login
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

import { ApiError }               from '@/lib/api';
import { authLogin, getDashboardRouteForRole, getSessionRoleFromUser, setUserRole } from '@/lib/auth';
import AppLogo                    from '@/components/branding/AppLogo';
import LoginForm                  from '@/components/auth/LoginForm';
import toast from 'react-hot-toast';

function mapLoginErrorMessage(error: ApiError): string {
  const message = (error.message || '').trim();
  const lowered = message.toLowerCase();

  if (error.status === 401) return 'Invalid email or password.';
  if (error.status === 429) return message || 'Too many login attempts. Please wait and try again.';
  if (
    error.status === 503 ||
    lowered.includes('database') ||
    lowered.includes('dbhandler') ||
    lowered.includes('connector') ||
    lowered.includes('temporarily unavailable')
  ) {
    return 'Login is temporarily unavailable because the database is offline. Please try again in a few minutes.';
  }
  if (error.status >= 500) return 'Server error during sign in. Please try again shortly.';

  return message || 'Unable to sign in. Please review your credentials and try again.';
}

export default function LoginPage() {
  const router = useRouter();

  // ── Form State ─────────────────────────────────────────────
  const [email,         setEmail]         = useState('');
  const [password,      setPassword]      = useState('');
  const [rememberMe,    setRememberMe]    = useState(false);
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [loading,       setLoading]       = useState(false);

  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    const savedRememberMe = localStorage.getItem('rememberMe') === 'true';
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(savedRememberMe);
    }
  }, []);

  // ── Handlers ───────────────────────────────────────────────
  async function handleSignIn() {
    if (!email.trim()) { toast.error('Please enter your email address.'); return; }
    if (!password)     { toast.error('Please enter your password.');       return; }
    if (!legalAccepted) {
      toast.error('Please accept the Privacy Policy and Terms of Agreement to continue.');
      return;
    }

    setLoading(true);

    try {
      const { user } = await authLogin({
        email: email.trim().toLowerCase(),
        password,
      }, rememberMe);

      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email.trim().toLowerCase());
        localStorage.setItem('rememberMe', 'true');
      } else {
        localStorage.removeItem('rememberedEmail');
        localStorage.removeItem('rememberMe');
      }

      const sessionRole = getSessionRoleFromUser(user);
      if (!sessionRole) {
        toast.error('Your account has an unrecognized role. Please contact the administrator.');
        setLoading(false);
        return;
      }

      toast.success('Successfully signed in!');
      setUserRole(sessionRole);
      router.push(getDashboardRouteForRole(sessionRole));
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(mapLoginErrorMessage(err));
      } else {
        toast.error('Could not connect to the server. Is the backend running?');
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="relative min-h-screen font-sans text-slate-900 selection:bg-blue-200 bg-[#f8fafc] overflow-hidden flex items-center justify-center">
      
      {/* ── Soft Background Gradients ─────────────────────────── */}
      <div className="absolute top-[-10%] left-[-10%] h-[600px] w-[600px] rounded-full bg-blue-200/50 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] h-[600px] w-[600px] rounded-full bg-cyan-100/40 blur-[120px] pointer-events-none"></div>
      <div className="absolute top-[20%] right-[10%] h-[400px] w-[400px] rounded-full bg-blue-100/30 blur-[90px] pointer-events-none"></div>

      {/* ── Main Content Container ────────────────────────────── */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-6 sm:px-8 py-12 flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-24">
        
        {/* ── Left Side: Brand Panel ─────────────────────────── */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center">
          
          {/* Top logos */}
          <div className="flex items-center gap-4 pb-6 mb-8 w-fit">
            <div className="w-14 h-14 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center p-2">
              <Image src="/icons/gc-logo.png" alt="Gordon College" width={42} height={42} className="object-contain" priority />
            </div>
            <div className="w-14 h-14 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center p-2">
              <Image src="/icons/clinic-logo.png" alt="Health Services Unit" width={42} height={42} className="object-contain" priority />
            </div>
          </div>

          <Link href="/" className="inline-flex items-center gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-xl group mb-8">
            <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm border border-slate-100">
              <AppLogo className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">GC HealthLink</h2>
            </div>
          </Link>

          <h1 className="text-4xl xl:text-5xl font-extrabold leading-[1.1] tracking-tight mb-6 text-slate-900">
            Welcome to your campus <span className="text-blue-600">clinic hub.</span>
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed font-medium max-w-md hidden lg:block">
            Secure access to medical records, appointments, and daily campus health operations.
          </p>

          {/* Bottom Footer (Desktop) */}
          <div className="hidden lg:block mt-16">
            <p className="text-sm text-slate-400 font-medium">
              Gordon College &copy; {new Date().getFullYear()}
            </p>
          </div>
        </div>

        {/* ── Right Side: Form Panel ────────────────────────────── */}
        <div className="w-full lg:w-1/2 flex justify-center lg:justify-end">
          {/* Login Form Container */}
          <div className="w-full max-w-[420px] bg-white/70 backdrop-blur-xl border border-white/50 p-8 sm:p-10 rounded-[2rem] shadow-xl shadow-slate-200/50">
            <div className="mb-8">
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Sign In</h2>
              <p className="text-sm text-slate-500 mt-2">Enter your credentials to access the portal</p>
            </div>

            <LoginForm
              email={email}
              password={password}
              rememberMe={rememberMe}
              legalAccepted={legalAccepted}
              onEmailChange={(v) => { setEmail(v); }}
              onPasswordChange={(v) => { setPassword(v); }}
              onRememberChange={setRememberMe}
              onLegalChange={(v) => { setLegalAccepted(v); }}
              onSubmit={handleSignIn}
              loading={loading}
            />
          </div>
        </div>

        {/* Bottom Footer (Mobile) */}
        <div className="lg:hidden mt-8 text-center w-full">
          <p className="text-sm text-slate-400 font-medium">
            Gordon College &copy; {new Date().getFullYear()}
          </p>
        </div>

      </div>
    </div>
  );
}
