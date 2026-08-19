const { Injectable, Inject } = require('@nestjs/common');
const { PassportStrategy } = require('@nestjs/passport');
const { Strategy } = require('passport-google-oauth20');
const { ConfigService } = require('@nestjs/config');

/**
 * Wraps Google's OAuth2 authorization-code flow. Unlike jwt.strategy.js
 * and jwt-refresh.strategy.js, validate() here uses the callback
 * ("done") style rather than a plain return — the standard, documented
 * pattern for OAuth2-family Passport strategies, since the underlying
 * passport-oauth2 machinery drives this callback itself as part of the
 * authorization-code-for-token exchange.
 *
 * Deliberately dumb: this strategy only maps Google's response into a
 * plain object. It does NOT touch the database and does NOT decide
 * whether the user is new, existing, or should be linked to an
 * existing password account — all of that lives in
 * AuthService.loginWithGoogle(), called from the controller after this
 * strategy hands back its result. Keeping the strategy free of
 * business logic keeps the actual account-linking security decisions
 * in one reviewable place instead of split across a Passport callback.
 */
@Injectable()
class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(@Inject(ConfigService) configService) {
    super({
      clientID: configService.getOrThrow('GOOGLE_CLIENT_ID'),
      clientSecret: configService.getOrThrow('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.getOrThrow('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
    });
  }

  async validate(accessToken, refreshToken, profile, done) {
    const email = profile.emails?.[0]?.value;
    const emailVerified = profile.emails?.[0]?.verified === true;

    if (!email) {
      // Rare — a Google account exposing no email on the requested
      // scope — but fail explicitly here rather than let a null email
      // reach Prisma's unique constraint as a confusing 500 instead of
      // a clear auth error.
      return done(
        new Error('Google account has no accessible email address'),
        null,
      );
    }

    const normalizedProfile = {
      googleId: profile.id,
      // Same normalization as RegisterDto/LoginDto, deliberately — a
      // Google login and a password login for "the same" address must
      // always resolve to the same row, or account linking silently
      // breaks for anyone whose Gmail casing differs from how they
      // typed their email at signup.
      email: email.trim().toLowerCase(),
      fullName: profile.displayName || email,
      emailVerified,
    };

    done(null, normalizedProfile);
  }
}

module.exports = { GoogleStrategy };
