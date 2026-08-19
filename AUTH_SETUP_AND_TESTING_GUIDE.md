# 🔐 Temar Lije - Authentication & Verification Setup Guide

This document provides complete instructions for teammates to set up, run, and test the **Email Verification**, **Password Reset**, and **OAuth Boundary** features.

---

## 📋 What Was Added

1. **Email Verification**:
   - New registrations receive a verification link with a secure SHA-256 token (expires in 24 hours).
   - Unverified accounts cannot log in via password until verified.
   - Resend verification button available on the sign-in page.

2. **Forgot / Reset Password**:
   - "Forgot password?" link on the sign-in page.
   - Sends a secure 1-hour password reset link to the user's email.
   - Reset password screen enforces strength requirements and invalidates old sessions across devices upon reset.

3. **OAuth Boundary Preservation**:
   - Google OAuth users who try to use "Forgot Password" receive an informational notice email (*"Use Continue with Google instead"*) without creating a reset token or leaking account information.

4. **Dev-Mode & SMTP Transport**:
   - **Dev Mode:** If `SMTP_HOST` is left blank in `.env`, outgoing emails and links are logged to your terminal console.
   - **Real Email Mode:** Supports Gmail SMTP, Mailtrap, SendGrid, Resend, or AWS SES via standard env vars.

---

## 🚀 Quick Setup Instructions

### 1. Checkout the Branch & Install Dependencies

Open a terminal in the project root:

```bash
# 1. Pull latest branches and switch to the feature branch
git checkout feature/email-verification-password-reset
git pull origin feature/email-verification-password-reset

# 2. Install Backend dependencies
cd Backend
npm install
npx prisma generate

# 3. Install Frontend dependencies
cd ../temar_lije
npm install
```

---

### 2. Configure Environment Variables (`Backend/.env`)

In the `Backend/` directory, create or edit your `.env` file:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration (SQLite / Prisma)
DATABASE_URL="file:./dev.db"

# JWT Authentication Secrets
JWT_ACCESS_SECRET=c3a9f0e84b8d7890e812d45c6123490abcde8901234567890abcdef123456789
JWT_REFRESH_SECRET=7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a

# Google OAuth2 Credentials
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
GOOGLE_OAUTH_STATE_SECRET=e4b7c1a8d2f5e930b6c1f4a7d0e3b6a9c2f5e8b1d4a7c0f3b6e9d2a5c8f1b4a7

# Frontend Application URL
FRONTEND_URL=http://localhost:5173

# ----------------------------------------------------
# Email Service Configuration (Choose Option A or B)
# ----------------------------------------------------

# OPTION A: Dev Mode (Console Logging - No setup required)
# Leave SMTP_HOST blank. Emails will print directly to your terminal.
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=no-reply@temarlije.local

# OPTION B: Real Gmail Delivery (To receive real emails in your inbox)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=your_email@gmail.com
# SMTP_PASS=your_16_char_gmail_app_password
# EMAIL_FROM="Temar Lije" <your_email@gmail.com>
```

> **Tip for Gmail SMTP:** To get an app password, go to [Google App Passwords](https://myaccount.google.com/apppasswords), generate a password for "Temar Lije", and paste the 16-character key in `SMTP_PASS`.

---

## 🏃 Running the Application

Open **two terminal windows**:

### Terminal 1: Start Backend Server
```bash
cd Backend
npm run start:dev
```
*Server runs at `http://localhost:3000`.*

### Terminal 2: Start Frontend Application
```bash
cd temar_lije
npm run dev
```
*Vite frontend runs at `http://localhost:5173`.*

---

## 🧪 Testing Walkthrough (Step-by-Step)

### Option 1: Automated Test Suite (Fastest Check)
In the `Backend/` directory, run:
```bash
node test/test-auth-flows.js
```
This tests all 9 scenarios in ~3 seconds.

---

### Option 2: Manual UI Testing in the Browser

Open your browser to `http://localhost:5173`:

#### Test 1: Registration & Email Verification
1. Click **"Create account"** or go to `http://localhost:5173/signup`.
2. Fill in your name, email, role, and password. Click **"Create account"**.
3. You will be redirected to the Sign-in page with a green notice:
   > *"Registration successful. Please check your email to verify your account before signing in."*
4. **Try signing in immediately**: Notice that login is blocked with *"Please verify your email before signing in."*
5. Open your email inbox (or check the Backend terminal if using Dev Mode) and click the verification link:
   `http://localhost:5173/verify-email?token=...`
6. The verification page will confirm your email. Click **"Continue to Sign in"**.
7. Sign in with your credentials — you will be successfully logged in!

#### Test 2: Forgot Password & Password Reset
1. On `http://localhost:5173/signin`, click **"Forgot password?"**.
2. Enter your email and click **"Send Reset Link"**.
3. Check your email inbox (or Backend terminal in Dev Mode) for the reset link:
   `http://localhost:5173/reset-password?token=...`
4. Enter your new password and click **"Reset Password"**.
5. Log in with your new password to verify it works (and that the old password is rejected).

#### Test 3: OAuth Boundary Security
1. If you enter an email for an account created via Google OAuth in **"Forgot password?"**:
   - The UI returns the exact same generic message (preventing email enumeration).
   - The user receives an informational notice email: *"This account signs in with Google, not a password. Use Continue with Google on the sign-in page instead."*
   - No reset token is created in the database.

---

## 📁 Key File Locations

- **Backend Logic:**
  - `Backend/src/modules/email/email.service.js` — Nodemailer & console logging service.
  - `Backend/src/modules/auth/auth.service.js` — Core auth, token hashing, and gate logic.
  - `Backend/src/modules/auth/auth.controller.js` — HTTP endpoints & rate limiting.
  - `Backend/test/test-auth-flows.js` — Automated integration tests.
- **Frontend Components:**
  - `temar_lije/src/features/auth/signin/signin.jsx` — Sign in with Forgot Password link.
  - `temar_lije/src/features/auth/forgot_password/` — Forgot password screen.
  - `temar_lije/src/features/auth/reset_password/` — Reset password screen with strength meter.
  - `temar_lije/src/features/auth/verify_email/` — Verification link receiver.
  - `temar_lije/src/App.jsx` — Screen routing & link token parsing.
