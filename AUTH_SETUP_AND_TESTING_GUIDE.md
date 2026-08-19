# 🚀 Temar Lije - Authentication Testing & Setup Guide

This guide contains everything you need to set up, configure, and test all authentication features: **Email Verification**, **Forgot/Reset Password**, and **Google OAuth Login**.

---

## 1. Quick Setup & Installation

Run these commands from the project root:

```bash
# 1.pull latest code
git pull origin

# 2. Install Backend dependencies
cd Backend
npm install
npx prisma generate

# 3. Install Frontend dependencies
cd ../temar_lije
npm install
```

---

## 2. Environment Configuration (`Backend/.env`)

In the `Backend/` directory, create or edit your `.env` file:

```env
# Server
PORT=3000
NODE_ENV=development
DATABASE_URL="file:./dev.db"

# JWT Secrets (Can leave defaults for dev)
JWT_ACCESS_SECRET=c3a9f0e84b8d7890e812d45c6123490abcde8901234567890abcdef123456789
JWT_REFRESH_SECRET=7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a

# Frontend App URL
FRONTEND_URL=http://localhost:5173

# -----------------------------------------------------------
# A. Google OAuth Configuration
# -----------------------------------------------------------
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
GOOGLE_OAUTH_STATE_SECRET=e4b7c1a8d2f5e930b6c1f4a7d0e3b6a9c2f5e8b1d4a7c0f3b6e9d2a5c8f1b4a7

# -----------------------------------------------------------
# B. Email Configuration (SMTP)
# -----------------------------------------------------------
# Option 1: Leave SMTP_HOST blank to use Console Dev Mode (Links print in terminal)
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=no-reply@temarlije.local

# Option 2: Real Gmail Delivery (Uncomment and fill in if you want real emails)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=your_email@gmail.com
# SMTP_PASS=your_16_char_gmail_app_password
# EMAIL_FROM="Temar Lije" <your_email@gmail.com>
```

---

## 3. How to Get Your Credentials

### How to get Google OAuth Client ID & Secret
1. Go to **[Google Cloud Console](https://console.cloud.google.com/)** and create a project (e.g. `Temar Lije`).
2. Go to **APIs & Services > OAuth consent screen**:
   - Select **External** > Click **Create**.
   - Enter **App name** (`Temar Lije`) and your email for support and developer contacts.
   - Under **Test users**, add your Google email address so you can sign in during dev.
3. Go to **APIs & Services > Credentials**:
   - Click **+ CREATE CREDENTIALS** > **OAuth client ID**.
   - **Application type:** Select **Web application**.
   - **Authorized JavaScript origins:** Add `http://localhost:5173` and `http://localhost:3000`.
   - **Authorized redirect URIs:** Add `http://localhost:3000/auth/google/callback`.
   - Click **Create** and copy your **Client ID** and **Client Secret** into `Backend/.env`.

### How to get Gmail App Password (Optional — for real email delivery)
1. Go to your [Google Account Security](https://myaccount.google.com/security) and ensure **2-Step Verification** is turned ON.
2. Go to [Google App Passwords](https://myaccount.google.com/apppasswords), generate a password for "Temar Lije", and paste the 16-character key in `SMTP_PASS`.

---

## 4. Running the Application

Open two separate terminals:

### Terminal 1: Backend
```bash
cd Backend
npm run start:dev
```
*Backend runs on `http://localhost:3000`.*

### Terminal 2: Frontend
```bash
cd temar_lije
npm run dev
```
*Frontend runs on `http://localhost:5173`.*

---

## 5. How to Test the Features

Open your browser to `http://localhost:5173`:

### Test 1: Email Verification Flow
1. Go to `http://localhost:5173/signup` and create an account with email and password.
2. You will be redirected to Sign-in with the notice: *"Registration successful. Please check your email to verify your account before signing in."*
3. Try logging in immediately -> Access is blocked until verified.
4. Click the link in your email inbox (or copy the link logged in the backend terminal if using Dev Mode): `http://localhost:5173/verify-email?token=...`
5. The page confirms verification. You can now sign in successfully!

### Test 2: Forgot & Reset Password Flow
1. On `http://localhost:5173/signin`, click **"Forgot password?"**.
2. Enter your email and submit.
3. Click the reset link in your email (or backend terminal): `http://localhost:5173/reset-password?token=...`
4. Set a new password with the real-time strength meter.
5. Log in with your new password!

### Test 3: Google OAuth Login Flow
1. On Sign-in or Sign-up page, click **"Continue with Google"**.
2. Complete Google's consent screen.
3. You will be authenticated and redirected straight into the dashboard!

### Test 4: Automated Backend Test Suite
To run all 9 backend test scenarios automatically:
```bash
cd Backend
node test/test-auth-flows.js
```
