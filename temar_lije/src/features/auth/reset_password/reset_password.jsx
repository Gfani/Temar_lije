import React, { useState, useMemo, useCallback } from 'react';
import { Loader2, Check, X, Eye, EyeOff, Lock, CheckCircle2 } from 'lucide-react';
import logo from '../../../assets/classmind-logo.png';
import styles from './reset_password.module.css';
import { authApi } from '../../../lib/api';

export default function ResetPassword({ token = '', onResetSuccess, onBackToSignIn }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formError, setFormError] = useState('');

  // Password strength checklist rules
  const passwordChecks = useMemo(() => {
    return {
      length: password.length >= 8,
      upper: /[A-Z]/.test(password),
      lower: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
    };
  }, [password]);

  const passedCount = useMemo(() => {
    return Object.values(passwordChecks).filter(Boolean).length;
  }, [passwordChecks]);

  const strengthInfo = useMemo(() => {
    if (password.length === 0) return { label: '', level: 0, class: '' };
    if (passedCount <= 2) return { label: 'Weak', level: 1, class: styles.strengthWeak };
    if (passedCount <= 4) return { label: 'Fair', level: 2, class: styles.strengthFair };
    return { label: 'Strong', level: 3, class: styles.strengthStrong };
  }, [password, passedCount]);

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (isSubmitting) return;
      setFormError('');

      if (!token) {
        setFormError('Invalid or missing reset token. Please request a new password reset link.');
        return;
      }

      if (passedCount < 5) {
        setFormError('Password must meet all 5 security requirements below.');
        return;
      }

      if (password !== confirmPassword) {
        setFormError('Passwords do not match.');
        return;
      }

      setIsSubmitting(true);
      try {
        const result = await authApi.resetPassword({ token, newPassword: password });
        setIsSuccess(true);
        if (onResetSuccess) {
          onResetSuccess(result);
        }
      } catch (err) {
        setFormError(err?.message || 'Could not reset password. The link may have expired.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [token, password, confirmPassword, passedCount, isSubmitting, onResetSuccess]
  );

  return (
    <div className={styles.page}>
      <div className={styles.brandRow}>
        <img src={logo} alt="Temar Lije logo" className={styles.brandLogo} />
        <span className={styles.brandName}>Temar Lije</span>
      </div>

      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.iconCircle}>
            <Lock className={styles.lockIcon} />
          </div>
          <h2 className={styles.title}>Reset Password</h2>
          <p className={styles.subtitle}>Choose a strong, new password for your account.</p>
        </div>

        {isSuccess ? (
          <div className={styles.successBox}>
            <CheckCircle2 className={styles.successIcon} size={32} />
            <h3 className={styles.successTitle}>Password Reset Complete</h3>
            <p className={styles.successText}>
              Your password has been successfully updated. You can now sign in with your new password.
            </p>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={onBackToSignIn}
            >
              Go to Sign in
            </button>
          </div>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <label className={styles.fieldLabel} htmlFor="reset-new-password">
              New Password
            </label>
            <div className={styles.inputWrapper}>
              <input
                id="reset-new-password"
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                className={styles.textInput}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (formError) setFormError('');
                }}
                disabled={isSubmitting}
                autoComplete="new-password"
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

            {/* Real-time Password Strength Meter & Checklist */}
            {password.length > 0 && (
              <div className={styles.passwordStrength}>
                <div className={styles.strengthHeader}>
                  <span>Password Strength</span>
                  <span className={`${styles.strengthBadge} ${strengthInfo.class}`}>
                    {strengthInfo.label}
                  </span>
                </div>

                <div className={styles.strengthMeter}>
                  <span
                    className={`${styles.strengthSegment} ${
                      passedCount >= 1
                        ? passedCount === 5
                          ? styles.segStrong
                          : passedCount >= 3
                          ? styles.segFair
                          : styles.segWeak
                        : ''
                    }`}
                  />
                  <span
                    className={`${styles.strengthSegment} ${
                      passedCount >= 3
                        ? passedCount === 5
                          ? styles.segStrong
                          : styles.segFair
                        : ''
                    }`}
                  />
                  <span
                    className={`${styles.strengthSegment} ${
                      passedCount >= 5 ? styles.segStrong : ''
                    }`}
                  />
                </div>

                <ul className={styles.reqList}>
                  <li className={`${styles.reqItem} ${passwordChecks.length ? styles.reqMet : styles.reqUnmet}`}>
                    {passwordChecks.length ? <Check className={styles.reqIcon} /> : <X className={styles.reqIcon} />}
                    <span>8+ characters</span>
                  </li>
                  <li className={`${styles.reqItem} ${passwordChecks.upper ? styles.reqMet : styles.reqUnmet}`}>
                    {passwordChecks.upper ? <Check className={styles.reqIcon} /> : <X className={styles.reqIcon} />}
                    <span>Uppercase (A-Z)</span>
                  </li>
                  <li className={`${styles.reqItem} ${passwordChecks.lower ? styles.reqMet : styles.reqUnmet}`}>
                    {passwordChecks.lower ? <Check className={styles.reqIcon} /> : <X className={styles.reqIcon} />}
                    <span>Lowercase (a-z)</span>
                  </li>
                  <li className={`${styles.reqItem} ${passwordChecks.number ? styles.reqMet : styles.reqUnmet}`}>
                    {passwordChecks.number ? <Check className={styles.reqIcon} /> : <X className={styles.reqIcon} />}
                    <span>Number (0-9)</span>
                  </li>
                  <li className={`${styles.reqItem} ${passwordChecks.special ? styles.reqMet : styles.reqUnmet}`}>
                    {passwordChecks.special ? <Check className={styles.reqIcon} /> : <X className={styles.reqIcon} />}
                    <span>Symbol (!@#$%^&*)</span>
                  </li>
                </ul>
              </div>
            )}

            <label className={styles.fieldLabel} htmlFor="reset-confirm-password">
              Confirm Password
            </label>
            <div className={styles.inputWrapper}>
              <input
                id="reset-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                className={styles.textInput}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (formError) setFormError('');
                }}
                disabled={isSubmitting}
                autoComplete="new-password"
              />
              <button
                type="button"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                className={styles.togglePasswordBtn}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
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
              disabled={isSubmitting}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className={`${styles.spinner} animate-spin`} />
                  <span>Updating password…</span>
                </>
              ) : (
                <span>Reset Password</span>
              )}
            </button>

            <button
              type="button"
              className={styles.secondaryButton}
              onClick={onBackToSignIn}
            >
              Cancel and Return to Sign in
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
