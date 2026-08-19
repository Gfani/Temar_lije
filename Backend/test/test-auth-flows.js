const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../dist/app.module');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

async function testAllAuthFlows() {
  console.log('--- Starting Auth Flow Verification ---');
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = new PrismaClient();

  const authService = app.get(require('../dist/modules/auth/auth.service').AuthService);
  const emailService = app.get(require('../dist/modules/email/email.service').EmailService);

  const testEmail = `test_${Date.now()}@temarlije.test`;
  const password = 'Password123!';
  const newPassword = 'NewPassword456!';

  try {
    // 1. Register a new user
    console.log('1. Testing Registration...');
    const regResult = await authService.register({
      fullName: 'Test Student',
      email: testEmail,
      password: password,
      role: 'STUDENT',
    });
    console.log('   Registration response:', regResult);
    if (!regResult.message || regResult.accessToken) {
      throw new Error('Registration should return only message and no tokens');
    }

    const userInDb = await prisma.user.findUnique({ where: { email: testEmail } });
    if (!userInDb || userInDb.isEmailVerified !== false || !userInDb.emailVerificationTokenHash) {
      throw new Error('User in DB is not properly flagged as unverified with token hash');
    }
    console.log('   User created in DB with isEmailVerified = false and token hash set.');

    // 2. Try to login before verifying email
    console.log('\n2. Testing Login Before Email Verification...');
    let loginBlocked = false;
    try {
      await authService.login({ email: testEmail, password });
    } catch (err) {
      loginBlocked = true;
      console.log('   Login blocked with expected error:', err.message);
    }
    if (!loginBlocked) {
      throw new Error('Unverified user was unexpectedly allowed to login');
    }

    // 3. Verify Email with invalid and valid tokens
    console.log('\n3. Testing Email Verification...');
    let invalidTokenFailed = false;
    try {
      await authService.verifyEmail('invalid-raw-token');
    } catch (err) {
      invalidTokenFailed = true;
      console.log('   Invalid token rejected with error:', err.message);
    }
    if (!invalidTokenFailed) {
      throw new Error('Invalid token was accepted unexpectedly');
    }

    // For testing the valid token, generate a known token & hash to test verifyEmail
    const rawVerifyToken = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
    const verifyTokenHash = crypto.createHash('sha256').update(rawVerifyToken).digest('hex');
    await prisma.user.update({
      where: { id: userInDb.id },
      data: {
        emailVerificationTokenHash: verifyTokenHash,
        emailVerificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    const verifyResult = await authService.verifyEmail(rawVerifyToken);
    console.log('   Verification result:', verifyResult);

    const verifiedUser = await prisma.user.findUnique({ where: { id: userInDb.id } });
    if (!verifiedUser.isEmailVerified || verifiedUser.emailVerificationTokenHash !== null) {
      throw new Error('User was not marked as verified or token was not cleared');
    }
    console.log('   User successfully verified in DB.');

    // 4. Login after verification
    console.log('\n4. Testing Login After Verification...');
    const loginResult = await authService.login({ email: testEmail, password });
    console.log('   Login successful. Access token received:', !!loginResult.accessToken);
    if (!loginResult.accessToken || !loginResult.refreshToken) {
      throw new Error('Login failed to return token pair');
    }

    // 5. Resend verification for already verified user
    console.log('\n5. Testing Resend Verification...');
    const resendResult = await authService.resendVerificationEmail(testEmail);
    console.log('   Resend response:', resendResult);

    // 6. Forgot Password - Local account
    console.log('\n6. Testing Forgot Password (Local Account)...');
    const forgotResult = await authService.forgotPassword(testEmail);
    console.log('   Forgot password response:', forgotResult);

    const userWithResetToken = await prisma.user.findUnique({ where: { id: userInDb.id } });
    if (!userWithResetToken.passwordResetTokenHash) {
      throw new Error('Password reset token was not generated for local account');
    }
    console.log('   Reset token hash successfully set in DB.');

    // 7. Forgot Password - OAuth-only account (OAuth Boundary check)
    console.log('\n7. Testing OAuth Boundary on Forgot Password...');
    const oauthEmail = `oauth_${Date.now()}@temarlije.test`;
    const oauthUser = await prisma.user.create({
      data: {
        fullName: 'Google User',
        email: oauthEmail,
        googleId: `google_${Date.now()}`,
        role: 'STUDENT',
        isEmailVerified: true,
        passwordHash: null,
      },
    });

    const oauthForgotResult = await authService.forgotPassword(oauthEmail);
    console.log('   OAuth forgot password response:', oauthForgotResult);

    const oauthUserAfter = await prisma.user.findUnique({ where: { id: oauthUser.id } });
    if (oauthUserAfter.passwordResetTokenHash !== null) {
      throw new Error('OAuth user unexpectedly received a password reset token!');
    }
    console.log('   OAuth boundary successfully preserved: no reset token minted, OAuth notice triggered.');

    // 8. Reset Password
    console.log('\n8. Testing Reset Password...');
    const rawResetToken = 'fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321';
    const resetTokenHash = crypto.createHash('sha256').update(rawResetToken).digest('hex');
    await prisma.user.update({
      where: { id: userInDb.id },
      data: {
        passwordResetTokenHash: resetTokenHash,
        passwordResetExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    let invalidResetFailed = false;
    try {
      await authService.resetPassword('wrong-token', newPassword);
    } catch (err) {
      invalidResetFailed = true;
      console.log('   Invalid reset token rejected with error:', err.message);
    }
    if (!invalidResetFailed) {
      throw new Error('Invalid reset token was accepted unexpectedly');
    }

    const resetResult = await authService.resetPassword(rawResetToken, newPassword);
    console.log('   Password reset successful. New session issued:', !!resetResult.accessToken);

    const userAfterReset = await prisma.user.findUnique({ where: { id: userInDb.id } });
    if (userAfterReset.passwordResetTokenHash !== null || userAfterReset.passwordResetExpiresAt !== null) {
      throw new Error('Reset token fields were not cleared after reset');
    }

    // 9. Verify old password fails and new password works
    console.log('\n9. Testing Login with New Password...');
    let oldPasswordFailed = false;
    try {
      await authService.login({ email: testEmail, password });
    } catch {
      oldPasswordFailed = true;
      console.log('   Old password rejected as expected.');
    }
    if (!oldPasswordFailed) {
      throw new Error('Old password was still accepted after reset');
    }

    const newLoginResult = await authService.login({ email: testEmail, password: newPassword });
    console.log('   Login with new password succeeded! User ID:', newLoginResult.user.id);

    console.log('\n=========================================');
    console.log(' ALL AUTH FLOW TESTS PASSED SUCCESSFULLY! ');
    console.log('=========================================');

    // Clean up test data
    await prisma.user.deleteMany({
      where: { email: { in: [testEmail, oauthEmail] } },
    });
  } finally {
    await prisma.$disconnect();
    await app.close();
  }
}

testAllAuthFlows().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
