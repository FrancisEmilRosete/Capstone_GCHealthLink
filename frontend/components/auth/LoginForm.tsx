/**
 * LOGIN FORM COMPONENT
 * ──────────────────────────────────────────────────────────────
 * Renders the Email, Password, Remember Me, Forgot Password fields,
 * and the Sign In button.
 *
 * This component is "controlled" — it does NOT manage its own state.
 * The parent page passes values and onChange handlers as props.
 * This keeps the logic in one place (the login page) and makes
 * this component easy to reuse or test.
 *
 * Props:
 *   email             → current email input value
 *   password          → current password input value
 *   rememberMe        → current checkbox state
 *   onEmailChange     → called when email input changes
 *   onPasswordChange  → called when password input changes
 *   onRememberChange  → called when checkbox changes
 *   onSubmit          → called when Sign In button is clicked
 */

import { useState } from 'react';

interface LoginFormProps {
  email: string;
  password: string;
  rememberMe: boolean;
  legalAccepted: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onRememberChange: (value: boolean) => void;
  onLegalChange: (value: boolean) => void;
  onSubmit: () => void;
  error?: string;
  loading?: boolean;
}

export default function LoginForm({
  email,
  password,
  rememberMe,
  legalAccepted,
  onEmailChange,
  onPasswordChange,
  onRememberChange,
  onLegalChange,
  onSubmit,
  error,
  loading = false,
}: LoginFormProps) {
  const emailInputId = 'login-email';
  const passwordInputId = 'login-password';
  const rememberInputId = 'login-remember-me';
  const legalInputId = 'login-legal-terms';
  const [showPassword, setShowPassword] = useState(false);

  return (
    <>
      {/* ── Email Field ── */}
      <div className="mb-4">
        <label htmlFor={emailInputId} className="block text-sm font-medium text-gray-700 mb-1.5">
          Email Address
        </label>
        <input
          id={emailInputId}
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200
            text-sm text-gray-900 placeholder-gray-400
            focus:outline-none focus:ring-2 focus:ring-teal-500
            focus:border-transparent transition-all"
        />
      </div>

      {/* ── Password Field ── */}
      <div className="mb-4">
        <label htmlFor={passwordInputId} className="block text-sm font-medium text-gray-700 mb-1.5">
          Password
        </label>
        <div className="relative">
          <input
            id={passwordInputId}
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            className="w-full px-4 py-2.5 pr-12 rounded-xl border border-gray-200
            text-sm text-gray-900 placeholder-gray-400
            focus:outline-none focus:ring-2 focus:ring-teal-500
            focus:border-transparent transition-all"
          />

          <button
            type="button"
            onClick={() => setShowPassword((previous) => !previous)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute inset-y-0 right-0 px-3 text-gray-500 hover:text-teal-600"
          >
            {showPassword ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                <path d="M3 3l18 18" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M10.58 10.58A2 2 0 0012 14a2 2 0 001.42-.58" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9.88 5.09A9.77 9.77 0 0112 5c5 0 9 4 10 7a11.8 11.8 0 01-4.29 5.19" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M6.61 6.61A11.76 11.76 0 002 12c1 3 5 7 10 7a9.77 9.77 0 003.42-.61" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* ── Remember Me + Forgot Password ── */}
      <div className="flex items-center justify-between mb-5">
        <label htmlFor={rememberInputId} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
          <input
            id={rememberInputId}
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => onRememberChange(e.target.checked)}
            className="w-4 h-4 rounded accent-teal-600 cursor-pointer"
          />
          Remember me
        </label>

        <button type="button" className="text-sm text-teal-600 font-medium hover:text-teal-700 hover:underline transition-colors cursor-pointer">
          Forgot password?
        </button>
      </div>

      {/* ── Privacy + Terms (Required) ── */}
      <div className="mb-5">
        <label htmlFor={legalInputId} className="flex items-start gap-2 text-sm text-gray-600 cursor-pointer select-none">
          <input
            id={legalInputId}
            type="checkbox"
            checked={legalAccepted}
            onChange={(e) => onLegalChange(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded accent-teal-600 cursor-pointer"
          />
          <span>
            I agree to the Privacy Policy and Terms of Agreement.
          </span>
        </label>
      </div>

      {/* ── Sign In Button ── */}
      {error && (
        <div className="mb-3 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 text-center">
          {error}
        </div>
      )}

      <button
        onClick={onSubmit}
        disabled={loading || !legalAccepted}
        className="w-full py-3 bg-teal-600 hover:bg-teal-700 active:bg-teal-800
          text-white font-semibold rounded-xl transition-colors
          shadow-md shadow-teal-200 cursor-pointer
          disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? 'Signing in…' : 'Sign In'}
      </button>
    </>
  );
}
