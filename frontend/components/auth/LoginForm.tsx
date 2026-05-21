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
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/ui/ErrorAlert';

type LegalModalType = 'privacy' | 'terms' | null;

interface LegalModalProps {
  type: Exclude<LegalModalType, null>;
  onClose: () => void;
}

function LegalModal({ type, onClose }: LegalModalProps) {
  const isPrivacy = type === 'privacy';
  const title = isPrivacy ? 'Privacy Policy' : 'Terms of Agreement';

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm flex items-center justify-center px-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-modal-title"
        className="w-full max-w-2xl rounded-[var(--radius-xl)] bg-[hsl(var(--card))] shadow-[var(--shadow-lg)] border border-[hsl(var(--border))] animate-scale-in"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-4 border-b border-[hsl(var(--border))] flex items-center justify-between gap-3">
          <div>
            <h2 id="legal-modal-title" className="text-h3 text-[hsl(var(--foreground))]">{title}</h2>
            <p className="text-xs text-[hsl(var(--muted))] mt-1">GC HealthLink - Gordon College Clinic</p>
          </div>
          <button
            type="button"
            aria-label="Close legal policy"
            onClick={onClose}
            className="rounded-[var(--radius-md)] p-2 text-[hsl(var(--muted))] hover:bg-[hsl(var(--primary-soft))] hover:text-[hsl(var(--primary))] transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 max-h-[70vh] overflow-y-auto text-sm text-[hsl(var(--muted-foreground))] space-y-3 leading-relaxed">
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

        <div className="px-6 py-4 border-t border-[hsl(var(--border))] flex justify-end">
          <Button onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
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
      <Input
        id={emailInputId}
        type="email"
        label="Email Address"
        placeholder="Enter your email"
        value={email}
        onChange={(e) => onEmailChange(e.target.value)}
        containerClassName="mb-4"
        required
      />

      {/* Password Field */}
      <div className="mb-4">
        <label htmlFor={passwordInputId} className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
          Password <span className="text-[hsl(var(--danger))]">*</span>
        </label>
        <div className="relative">
          <input
            id={passwordInputId}
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            className="w-full h-10 px-3 pr-10 rounded-[var(--radius-md)]
              border border-[hsl(var(--input-border))]
              bg-[hsl(var(--surface))]
              text-sm text-[hsl(var(--foreground))]
              placeholder:text-[hsl(var(--muted))]
              transition-all
              focus:outline-none focus:ring-2 focus:ring-[hsl(var(--focus-ring)_/_0.4)] focus:border-[hsl(var(--primary))]"
          />
          <button
            type="button"
            onClick={() => setShowPassword((previous) => !previous)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute inset-y-0 right-0 px-3 text-[hsl(var(--muted))] hover:text-[hsl(var(--primary))] transition-colors"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Remember Me + Forgot Password */}
      <div className="flex items-center justify-between mb-5">
        <label htmlFor={rememberInputId} className="flex items-center gap-2 text-sm text-[hsl(var(--foreground))] cursor-pointer select-none">
          <input
            id={rememberInputId}
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => onRememberChange(e.target.checked)}
            className="w-4 h-4 rounded-[4px] accent-[hsl(var(--primary))] cursor-pointer"
          />
          Remember me
        </label>

        <button type="button" className="text-sm text-[hsl(var(--primary))] font-medium hover:text-[hsl(var(--primary-hover))] hover:underline transition-colors cursor-pointer">
          Forgot password?
        </button>
      </div>

      {/* Privacy + Terms (Required) */}
      <div className="mb-5">
        <label htmlFor={legalInputId} className="flex items-start gap-2 text-sm text-[hsl(var(--foreground))] cursor-pointer select-none">
          <input
            id={legalInputId}
            type="checkbox"
            checked={legalAccepted}
            onChange={(e) => onLegalChange(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded-[4px] accent-[hsl(var(--primary))] cursor-pointer"
          />
          <span>
            I agree to the{' '}
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                openLegalModal('privacy');
              }}
              className="font-medium text-[hsl(var(--primary))] hover:text-[hsl(var(--primary-hover))] hover:underline"
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
              className="font-medium text-[hsl(var(--primary))] hover:text-[hsl(var(--primary-hover))] hover:underline"
            >
              Terms of Agreement
            </button>
            .
          </span>
        </label>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-4">
          <ErrorAlert message={error} variant="error" />
        </div>
      )}

      {/* Sign In Button */}
      <Button
        onClick={onSubmit}
        disabled={loading || !legalAccepted}
        loading={loading}
        size="lg"
        className="w-full"
      >
        {loading ? 'Signing in…' : 'Sign In'}
      </Button>

      {activeLegalModal && <LegalModal type={activeLegalModal} onClose={closeLegalModal} />}
    </>
  );
}
