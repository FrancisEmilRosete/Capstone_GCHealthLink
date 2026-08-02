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

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

type LegalModalType = 'privacy' | 'terms' | null;

interface LegalModalProps {
  type: Exclude<LegalModalType, null>;
  onClose: () => void;
}

function LegalModal({ type, onClose }: LegalModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const isPrivacy = type === 'privacy';
  const title = isPrivacy ? 'Privacy Policy' : 'Terms of Agreement';

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm overflow-y-auto p-4 sm:p-6 animate-fade-in flex items-center justify-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-modal-title"
        className="w-full max-w-2xl my-auto max-h-[calc(100vh-3rem)] rounded-2xl bg-white shadow-2xl border border-slate-100 animate-scale-in flex flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-6 sm:px-8 pt-8 pb-6 border-b border-slate-100 flex items-start justify-between gap-4 shrink-0">
          <div>
            <h2 id="legal-modal-title" className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h2>
            <p className="text-sm text-slate-500 mt-1 font-medium">GC HealthLink - Gordon College Clinic</p>
          </div>
          <button
            type="button"
            aria-label="Close legal policy"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors shrink-0"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 sm:px-8 py-6 overflow-y-auto text-sm text-slate-600 space-y-4 leading-relaxed">
          {isPrivacy ? (
            <>
              <p>
                GC HealthLink processes personal and sensitive personal information to support campus clinic operations,
                including student registration, appointment scheduling, consultation documentation, medical and dental
                care, inventory issuance for treatment, and generation of authorized clinic reports.
              </p>
              <p>
                Data may include identification details, contact information, department and course, emergency contacts,
                consultation notes, diagnosis details, prescribed treatment, and related health records submitted through
                the system.
              </p>
              <p>
                Processing is performed in accordance with Republic Act No. 10173 (Data Privacy Act of 2012) and only
                for legitimate clinic, public health, safety, and academic health compliance purposes.
              </p>
              <p>
                Access is limited to authorized clinic personnel and system administrators who require the data to perform
                their official functions. GC HealthLink applies role-based access controls, authentication, and activity
                logging to reduce unauthorized access and misuse.
              </p>
              <p>
                Your records are retained only as long as necessary for medical recordkeeping, legal compliance, and
                institutional requirements. Where legally permitted, you may request access, correction, or deletion of
                personal data by contacting the Gordon College Clinic data privacy point of contact.
              </p>
              <p>
                By continuing to use GC HealthLink and submitting your information, you acknowledge this policy and consent
                to the collection and processing of your data for the purposes stated above.
              </p>
            </>
          ) : (
            <>
              <p>
                GC HealthLink is an official campus clinic management system for Gordon College. Use of this platform is
                limited to authorized users such as students, clinic personnel, and designated administrators.
              </p>
              <p>
                You agree to provide truthful and complete information during registration, login, and all clinic-related
                transactions. Submission of false, misleading, or unauthorized information may result in access restriction
                and referral for institutional action.
              </p>
              <p>
                Your account credentials are your responsibility. You must maintain confidentiality of your password and
                immediately report suspected unauthorized access.
              </p>
              <p>
                Clinic records in GC HealthLink are confidential and must only be accessed for legitimate medical,
                administrative, and reporting purposes. Copying, sharing, or extracting health information without authority
                is strictly prohibited.
              </p>
              <p>
                Gordon College may update system features, workflows, and these terms to comply with medical operations,
                legal obligations, and institutional policies. Continued use after updates constitutes acceptance of the
                revised terms.
              </p>
              <p>
                By selecting the agreement checkbox and signing in, you confirm that you have read, understood, and agreed
                to these terms and the Privacy Policy.
              </p>
            </>
          )}
        </div>

        <div className="px-6 sm:px-8 py-5 border-t border-slate-100 flex justify-end bg-slate-50/50 rounded-b-2xl shrink-0">
          <Button onClick={onClose} className="px-8 rounded-full shadow-sm bg-slate-900 hover:bg-slate-800 text-white font-medium">
            Close
          </Button>
        </div>
      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(modalContent, document.body);
}

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
  loading = false,
}: LoginFormProps) {
  const emailInputId = 'login-email';
  const passwordInputId = 'login-password';
  const rememberInputId = 'login-remember-me';
  const legalInputId = 'login-legal-terms';
  const [showPassword, setShowPassword] = useState(false);
  const [activeLegalModal, setActiveLegalModal] = useState<LegalModalType>(null);

  function openLegalModal(type: Exclude<LegalModalType, null>) {
    setActiveLegalModal(type);
  }

  function closeLegalModal() {
    setActiveLegalModal(null);
  }

  return (
    <>
      {/* Email Field */}
      <div className="mb-4">
        <Input
          id={emailInputId}
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          prefix={<Mail className="h-4 w-4" />}
          required
          autoComplete="email"
        />
      </div>

      {/* Password Field */}
      <div className="mb-3">
        <Input
          id={passwordInputId}
          type={showPassword ? 'text' : 'password'}
          placeholder="password"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          prefix={<Lock className="h-4 w-4" />}
          suffix={
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="text-[hsl(var(--muted))] hover:text-[hsl(var(--primary))] transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
          autoComplete="current-password"
        />
      </div>

      {/* Sign In Button */}
      <Button
        onClick={onSubmit}
        disabled={loading || !legalAccepted}
        loading={loading}
        size="lg"
        className="w-full mt-5"
      >
        {loading ? 'Signing in…' : 'Sign In'}
      </Button>

      {/* Privacy + Terms (Required) */}
      <div className="mt-6">
        <label htmlFor={legalInputId} className="flex items-start gap-2.5 text-xs text-[hsl(var(--muted-foreground))] cursor-pointer select-none group">
          <div className="relative flex items-center justify-center mt-0.5">
            <input
              id={legalInputId}
              type="checkbox"
              checked={legalAccepted}
              onChange={(e) => onLegalChange(e.target.checked)}
              className="w-4 h-4 rounded border-2 border-[hsl(var(--input-border))] accent-[hsl(var(--primary))] cursor-pointer transition-all"
            />
          </div>
          <span className="leading-relaxed">
            I agree to the{' '}
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                openLegalModal('privacy');
              }}
              className="text-[hsl(var(--primary))] font-medium hover:text-[hsl(var(--primary-hover))] hover:underline transition-colors"
            >
              Privacy Policy
            </button>{' '}
            and{' '}
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                openLegalModal('terms');
              }}
              className="text-[hsl(var(--primary))] font-medium hover:text-[hsl(var(--primary-hover))] hover:underline transition-colors"
            >
              Terms of Agreement
            </button>
            .
          </span>
        </label>
      </div>

      {/* Remember Me (moved to bottom) */}
      <div className="mt-4">
        <label htmlFor={rememberInputId} className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))] cursor-pointer select-none group">
          <input
            id={rememberInputId}
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => onRememberChange(e.target.checked)}
            className="w-4 h-4 rounded border-2 border-[hsl(var(--input-border))] accent-[hsl(var(--primary))] cursor-pointer transition-all"
          />
          <span>Remember me</span>
        </label>
      </div>

      {activeLegalModal && <LegalModal type={activeLegalModal} onClose={closeLegalModal} />}
    </>
  );
}
