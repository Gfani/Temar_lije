import React, { useCallback, useState } from 'react';
import { Loader2 } from 'lucide-react';
import logo from '../../../assets/classmind-logo.png';
import styles from './create_account.module.css';

const GoogleIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.87 2.7-6.62Z"
      fill="#4285F4"
    />
    <path
      d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.83.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.95v2.33A9 9 0 0 0 9 18Z"
      fill="#34A853"
    />
    <path
      d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.16.28-1.7V4.97H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.03l3-2.33Z"
      fill="#FBBC05"
    />
    <path
      d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.97l3 2.33C4.66 5.17 6.65 3.58 9 3.58Z"
      fill="#EA4335"
    />
  </svg>
);

/**
 * CreateAccount
 * Auth page for new users. The Sign in / Create account segmented
 * control at the top is for navigating between the two auth pages —
 * wire onSwitchToSignIn to your router. Required fields rely on native
 * HTML5 validation (the browser's own "Please fill out this field"
 * bubble) rather than a custom tooltip. Form submission and Google
 * auth are exposed as async callbacks with loading/disabled treatment
 * and inline error feedback.
 */
export default function CreateAccount({ onCreateAccount, onGoogleSignIn, onSwitchToSignIn }) {
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const busy = isSubmitting || isGoogleLoading;

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (busy) return;
      setIsSubmitting(true);
      setFormError('');
      try {
        if (onCreateAccount) {
          await onCreateAccount({ fullName, role, email, password });
        } else {
          await new Promise((resolve) => setTimeout(resolve, 900));
        }
      } catch (err) {
        setFormError(err?.message || 'Could not create your account. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [busy, fullName, role, email, password, onCreateAccount]
  );

  const handleGoogleSignIn = useCallback(async () => {
    if (busy) return;
    setIsGoogleLoading(true);
    setFormError('');
    try {
      if (onGoogleSignIn) {
        await onGoogleSignIn();
      } else {
        await new Promise((resolve) => setTimeout(resolve, 900));
      }
    } catch (err) {
      setFormError('Google sign-in failed. Please try again.');
    } finally {
      setIsGoogleLoading(false);
    }
  }, [busy, onGoogleSignIn]);

  return (
    <div className={styles.page}>
      <div className={styles.brandRow}>
        <img src={logo} alt="Temar Lije logo" className={styles.brandLogo} />
        <span className={styles.brandName}>Temar Lije</span>
      </div>

      <div className={styles.card}>
        <div className={styles.tabs} role="tablist" aria-label="Authentication mode">
          <button
            type="button"
            role="tab"
            aria-selected="false"
            className={styles.tabInactive}
            onClick={onSwitchToSignIn}
          >
            Sign in
          </button>
          <button type="button" role="tab" aria-selected="true" className={styles.tabActive}>
            Create account
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.fieldLabel} htmlFor="ca-full-name">
            Full name
          </label>
          <input
            id="ca-full-name"
            type="text"
            required
            placeholder="Amina Yusuf"
            className={styles.textInput}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={busy}
            autoComplete="name"
          />

          <span className={styles.fieldLabel}>I am a</span>
          <div className={styles.roleToggle} role="radiogroup" aria-label="I am a">
            <button
              type="button"
              role="radio"
              aria-checked={role === 'student'}
              className={`${styles.roleOption} ${role === 'student' ? styles.roleOptionActive : ''}`}
              onClick={() => setRole('student')}
              disabled={busy}
            >
              Student
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={role === 'teacher'}
              className={`${styles.roleOption} ${role === 'teacher' ? styles.roleOptionActive : ''}`}
              onClick={() => setRole('teacher')}
              disabled={busy}
            >
              Teacher
            </button>
          </div>

          <label className={styles.fieldLabel} htmlFor="ca-email">
            Email
          </label>
          <input
            id="ca-email"
            type="email"
            required
            className={styles.textInput}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
            autoComplete="email"
          />

          <label className={styles.fieldLabel} htmlFor="ca-password">
            Password
          </label>
          <input
            id="ca-password"
            type="password"
            required
            minLength={8}
            className={styles.textInput}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
            autoComplete="new-password"
          />

          {formError && (
            <p className={styles.inlineError} role="alert">
              {formError}
            </p>
          )}

          <button
            type="submit"
            className={styles.primaryButton}
            disabled={busy}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className={`${styles.spinner} animate-spin`} />
                <span>Creating account…</span>
              </>
            ) : (
              <span>Create account</span>
            )}
          </button>
        </form>

        <div className={styles.divider}>
          <span className={styles.dividerLine} />
          <span className={styles.dividerText}>or</span>
          <span className={styles.dividerLine} />
        </div>

        <button
          type="button"
          className={styles.googleButton}
          onClick={handleGoogleSignIn}
          disabled={busy}
          aria-busy={isGoogleLoading}
        >
          {isGoogleLoading ? (
            <Loader2 className={`${styles.spinner} animate-spin`} />
          ) : (
            <GoogleIcon className={styles.googleIcon} />
          )}
          <span>{isGoogleLoading ? 'Connecting…' : 'Continue with Google'}</span>
        </button>
      </div>
    </div>
  );
}