import React, { useCallback, useState, useEffect } from 'react';
import { Loader2, Eye, EyeOff, CheckCircle } from 'lucide-react';
import logo from '../../../assets/classmind-logo.png';
import styles from './signin.module.css';

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

export default function SignIn({
  onSignIn,
  onGoogleSignIn,
  onSwitchToCreateAccount,
  initialEmail = '',
  noticeMessage = '',
}) {
  const [email, setEmail] = useState(initialEmail || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [successNotice, setSuccessNotice] = useState(noticeMessage);

  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  useEffect(() => {
    if (noticeMessage) {
      setSuccessNotice(noticeMessage);
    }
  }, [noticeMessage]);

  const busy = isSubmitting || isGoogleLoading;

  const isEmailValid = !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (busy) return;
      setFormError('');

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setFormError('Please enter a valid email address.');
        return;
      }

      if (!password) {
        setFormError('Please enter your password.');
        return;
      }

      setIsSubmitting(true);
      try {
        if (onSignIn) {
          await onSignIn({ email, password });
        } else {
          await new Promise((resolve) => setTimeout(resolve, 900));
        }
      } catch (err) {
        const msg = err?.message || '';
        if (msg.toLowerCase().includes('invalid credentials')) {
          setFormError('Incorrect email or password. Please verify your credentials and try again.');
        } else {
          setFormError(msg || 'Could not sign in. Check your email and password and try again.');
        }
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

        {successNotice && (
          <div className={styles.inlineSuccess}>
            <CheckCircle size={18} />
            <span>{successNotice}</span>
          </div>
        )}

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <label className={styles.fieldLabel} htmlFor="signin-email">
            Email
          </label>
          <input
            id="signin-email"
            type="email"
            required
            placeholder="amina@example.com"
            className={styles.textInput}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (formError) setFormError('');
            }}
            onBlur={() => setEmailTouched(true)}
            disabled={busy}
            autoComplete="email"
          />
          {emailTouched && !isEmailValid && (
            <span className={styles.fieldError}>Please enter a valid email format.</span>
          )}

          <label className={styles.fieldLabel} htmlFor="signin-password">
            Password
          </label>
          <div className={styles.inputWrapper}>
            <input
              id="signin-password"
              type={showPassword ? 'text' : 'password'}
              required
              placeholder="••••••••"
              className={styles.textInput}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (formError) setFormError('');
              }}
              disabled={busy}
              autoComplete="current-password"
            />
            <button
              type="button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className={styles.togglePasswordBtn}
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

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