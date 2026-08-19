import React, { useEffect, useState, useCallback } from 'react';
import { Loader2, CheckCircle2, XCircle, Mail, ArrowRight } from 'lucide-react';
import logo from '../../../assets/classmind-logo.png';
import styles from './verify_email.module.css';
import { authApi } from '../../../lib/api';

export default function VerifyEmail({ token = '', onVerified, onGoToSignIn }) {
  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function doVerify() {
      if (!token) {
        if (isMounted) {
          setStatus('error');
          setErrorMessage('No verification token found in the link. Please check your email and click the link again.');
        }
        return;
      }

      try {
        await authApi.verifyEmail({ token });
        if (isMounted) {
          setStatus('success');
        }
      } catch (err) {
        if (isMounted) {
          setStatus('error');
          setErrorMessage(
            err?.message || 'The verification link is invalid or has expired. You can request a new one below.'
          );
        }
      }
    }

    doVerify();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleResend = useCallback(async (e) => {
    e.preventDefault();
    if (!resendEmail || isResending) return;
    setIsResending(true);
    setResendMessage('');
    try {
      const res = await authApi.resendVerification({ email: resendEmail });
      setResendMessage(res?.message || 'If an account with that email exists, a new link has been sent.');
    } catch (err) {
      setResendMessage(err?.message || 'Could not send verification email. Please try again.');
    } finally {
      setIsResending(false);
    }
  }, [resendEmail, isResending]);

  return (
    <div className={styles.page}>
      <div className={styles.brandRow}>
        <img src={logo} alt="Temar Lije logo" className={styles.brandLogo} />
        <span className={styles.brandName}>Temar Lije</span>
      </div>

      <div className={styles.card}>
        {status === 'verifying' && (
          <div className={styles.stateContainer}>
            <div className={styles.iconCircle}>
              <Loader2 className={`${styles.spinner} animate-spin`} size={32} />
            </div>
            <h2 className={styles.title}>Verifying Your Email</h2>
            <p className={styles.subtitle}>
              Please wait a moment while we confirm your account details…
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className={styles.stateContainer}>
            <div className={`${styles.iconCircle} ${styles.iconSuccess}`}>
              <CheckCircle2 size={36} />
            </div>
            <h2 className={styles.title}>Email Verified!</h2>
            <p className={styles.subtitle}>
              Your email address has been successfully verified. Your account is now fully active.
            </p>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => {
                if (onVerified) {
                  onVerified();
                } else if (onGoToSignIn) {
                  onGoToSignIn('Email verified successfully! You can now sign in.');
                }
              }}
            >
              <span>Continue to Sign in</span>
              <ArrowRight size={18} />
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className={styles.stateContainer}>
            <div className={`${styles.iconCircle} ${styles.iconError}`}>
              <XCircle size={36} />
            </div>
            <h2 className={styles.title}>Verification Failed</h2>
            <p className={styles.subtitle}>{errorMessage}</p>

            <div className={styles.resendSection}>
              <h3 className={styles.resendHeading}>Need a new verification link?</h3>
              <form onSubmit={handleResend} className={styles.resendForm}>
                <input
                  type="email"
                  required
                  placeholder="Enter your email"
                  className={styles.textInput}
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  disabled={isResending}
                />
                <button
                  type="submit"
                  className={styles.resendButton}
                  disabled={isResending || !resendEmail}
                >
                  {isResending ? <Loader2 className={`${styles.spinner} animate-spin`} size={16} /> : <Mail size={16} />}
                  <span>Resend Link</span>
                </button>
              </form>
              {resendMessage && <p className={styles.resendNotice}>{resendMessage}</p>}
            </div>

            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => onGoToSignIn && onGoToSignIn()}
            >
              Back to Sign in
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
