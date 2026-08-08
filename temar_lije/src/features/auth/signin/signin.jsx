import React, { useCallback, useState } from 'react';
import logo from '../../../assets/classmind-logo.png';
import styles from './signin.module.css';

const SpinnerIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

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
 * SignIn
 * Auth page for existing users. The Sign in / Create account segmented
 * control at the top is for navigating between the two auth pages —
 * wire onSwitchToCreateAccount to your router. Form submission and
 * Google auth are exposed as async callbacks; both show native
 * disabled/loading treatment and surface errors inline.
 */
export default function SignIn({ onSignIn, onGoogleSignIn, onSwitchToCreateAccount }) {
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
        if (onSignIn) {
          await onSignIn({ email, password });
        } else {
          await new Promise((resolve) => setTimeout(resolve, 900));
        }
      } catch (err) {
        setFormError('Could not sign in. Check your email and password and try again.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [busy, email, password, onSignIn]
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
          <button type="button" role="tab" aria-selected="true" className={styles.tabActive}>
            Sign in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected="false"
            className={styles.tabInactive}
            onClick={onSwitchToCreateAccount}
          >
            Create account
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit} noValidate={false}>
          <label className={styles.fieldLabel} htmlFor="signin-email">
            Email
          </label>
          <input
            id="signin-email"
            type="email"
            required
            className={styles.textInput}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
            autoComplete="email"
          />

          <label className={styles.fieldLabel} htmlFor="signin-password">
            Password
          </label>
          <input
            id="signin-password"
            type="password"
            required
            className={styles.textInput}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
            autoComplete="current-password"
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
                <SpinnerIcon className={styles.spinner} />
                <span>Signing in…</span>
              </>
            ) : (
              <span>Sign in</span>
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
            <SpinnerIcon className={styles.spinner} />
          ) : (
            <GoogleIcon className={styles.googleIcon} />
          )}
          <span>{isGoogleLoading ? 'Connecting…' : 'Continue with Google'}</span>
        </button>
      </div>
    </div>
  );
}