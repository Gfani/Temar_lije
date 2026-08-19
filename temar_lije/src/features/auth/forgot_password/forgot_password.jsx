import React, { useState, useCallback } from 'react';
import { Loader2, ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';
import logo from '../../../assets/classmind-logo.png';
import styles from './forgot_password.module.css';
import { authApi } from '../../../lib/api';

export default function ForgotPassword({ onBackToSignIn }) {
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formError, setFormError] = useState('');

  const isEmailValid = !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (isSubmitting) return;
      setFormError('');

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setFormError('Please enter a valid email address.');
        return;
      }

      setIsSubmitting(true);
      try {
        await authApi.forgotPassword({ email });
        setIsSubmitted(true);
      } catch (err) {
        setFormError(err?.message || 'Could not process request. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [email, isSubmitting]
  );

  return (
    <div className={styles.page}>
      <div className={styles.brandRow}>
        <img src={logo} alt="Temar Lije logo" className={styles.brandLogo} />
        <span className={styles.brandName}>Temar Lije</span>
      </div>

      <div className={styles.card}>
        <button
          type="button"
          className={styles.backButton}
          onClick={onBackToSignIn}
        >
          <ArrowLeft size={16} />
          <span>Back to Sign in</span>
        </button>

        <div className={styles.header}>
          <div className={styles.iconCircle}>
            <Mail className={styles.mailIcon} />
          </div>
          <h2 className={styles.title}>Forgot Password</h2>
          <p className={styles.subtitle}>
            Enter your email address and we'll send you instructions to reset your password.
          </p>
        </div>

        {isSubmitted ? (
          <div className={styles.successBox}>
            <CheckCircle2 className={styles.successIcon} size={28} />
            <h3 className={styles.successTitle}>Check your inbox</h3>
            <p className={styles.successText}>
              If an account with <strong>{email}</strong> exists, password reset instructions have been sent.
            </p>
            <p className={styles.noteText}>
              Didn't receive the email? Check your spam folder or try again.
            </p>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={onBackToSignIn}
            >
              Return to Sign in
            </button>
          </div>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <label className={styles.fieldLabel} htmlFor="forgot-email">
              Email Address
            </label>
            <input
              id="forgot-email"
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
              disabled={isSubmitting}
              autoComplete="email"
            />
            {emailTouched && !isEmailValid && (
              <span className={styles.fieldError}>Please enter a valid email format.</span>
            )}

            {formError && (
              <p className={styles.inlineError} role="alert">
                {formError}
              </p>
            )}

            <button
              type="submit"
              className={styles.primaryButton}
              disabled={isSubmitting}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className={`${styles.spinner} animate-spin`} />
                  <span>Sending instructions…</span>
                </>
              ) : (
                <span>Send Reset Link</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
