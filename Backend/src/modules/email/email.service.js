const { Injectable, Dependencies, Logger } = require('@nestjs/common');
const { ConfigService } = require('@nestjs/config');
const nodemailer = require('nodemailer');

/**
 * Thin abstraction over an actual email transport — every caller
 * (AuthService) talks to THIS interface, never to nodemailer or any
 * provider SDK directly.
 *
 * Dev-mode fallback: if SMTP_HOST isn't configured, this logs the
 * email to the console instead of throwing — specifically so the
 * whole verification/reset flow is testable immediately without a
 * real provider decision blocking progress. This fallback is
 * deliberately disabled in production (see constructor).
 */
@Injectable()
@Dependencies(ConfigService)
class EmailService {
  constructor(configService) {
    this.configService = configService;
    this.logger = new Logger(EmailService.name);
    this.isProduction = configService.get('NODE_ENV') === 'production';
    this.frontendUrl = configService.get('FRONTEND_URL') || 'http://localhost';
    this.fromAddress =
      configService.get('EMAIL_FROM') || 'no-reply@temarlije.local';

    const smtpHost = configService.get('SMTP_HOST');
    const smtpUser = configService.get('SMTP_USER') || '';
    const isDummySmtp =
      !smtpHost ||
      smtpHost.includes('example.com') ||
      smtpHost === 'dummy' ||
      smtpUser.includes('dummy') ||
      smtpUser === '';

    this.devMode = isDummySmtp;

    if (!this.devMode) {
      try {
        this.transporter = nodemailer.createTransport({
          host: smtpHost,
          port: Number(configService.get('SMTP_PORT') || 587),
          secure: configService.get('SMTP_SECURE') === 'true',
          auth: {
            user: configService.get('SMTP_USER') || '',
            pass: configService.get('SMTP_PASS') || '',
          },
        });
      } catch (err) {
        this.logger.warn(`Failed to initialize SMTP transport, falling back to console: ${err.message}`);
        this.devMode = true;
      }
    }
  }

  isSmtpConfigured() {
    return !this.devMode;
  }

  /** Every other method in this class funnels through here. */
  async _send({ to, subject, html }) {
    if (this.devMode) {
      this.logger.warn(
        `[EMAIL LOG — SMTP not configured] To: ${to} | Subject: ${subject}\n${html}`,
      );
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to,
        subject,
        html,
      });
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}: ${err.message}`);
    }
  }

  async sendVerificationEmail(user, rawToken) {
    // Points at a FRONTEND route, not this API directly — same
    // reasoning as the Google OAuth callback: the link the user
    // clicks lands on a page your frontend controls, which then POSTs
    // the token to the backend itself. This keeps the raw token out
    // of any server access logs on whatever serves the initial GET.
    const link = `${this.frontendUrl}/verify-email?token=${rawToken}`;
    await this._send({
      to: user.email,
      subject: 'Verify your Temar Lije account',
      html: `<p>Hi ${user.fullName || 'there'},</p><p>Confirm your email to activate your account:</p><p><a href="${link}">${link}</a></p><p>This link expires in 24 hours.</p>`,
    });
  }

  async sendPasswordResetEmail(user, rawToken) {
    const link = `${this.frontendUrl}/reset-password?token=${rawToken}`;
    await this._send({
      to: user.email,
      subject: 'Reset your Temar Lije password',
      html: `<p>Hi ${user.fullName || 'there'},</p><p>Click below to choose a new password. If you didn't request this, ignore this email.</p><p><a href="${link}">${link}</a></p><p>This link expires in 1 hour.</p>`,
    });
  }

  /**
   * Sent instead of a real reset link when someone requests a reset
   * for an account that has no password at all (Google-only). This
   * is the actual mechanism behind the "OAuth boundary" requirement.
   */
  async sendOAuthAccountNotice(user) {
    await this._send({
      to: user.email,
      subject: 'Password reset requested — Temar Lije',
      html: `<p>Hi ${user.fullName || 'there'},</p><p>Someone requested a password reset for this email, but this account signs in with Google, not a password. Use "Continue with Google" on the sign-in page instead.</p><p>If this wasn't you, no action is needed.</p>`,
    });
  }
}

module.exports = { EmailService };
