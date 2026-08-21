const { Injectable, Inject } = require('@nestjs/common');
const { AuthGuard } = require('@nestjs/passport');
const { JwtService } = require('@nestjs/jwt');
const { ConfigService } = require('@nestjs/config');
const crypto = require('crypto');

/**
 * One guard serves both GET /auth/google (initiate) and
 * GET /auth/google/callback (Google redirects back here) — both need
 * the 'google' strategy active. They're told apart below by the
 * presence of a `code` query param, which only Google's own redirect
 * includes.
 *
 * getAuthenticateOptions() is a Nest/Passport hook — whatever it
 * returns is merged into the options passed to passport's
 * authenticate() call. Used here to attach a custom, signed `state`
 * value, which does two jobs at once:
 *
 * 1. Carries the intended role (student/teacher) through Google's
 * redirect round-trip, tamper-proof — see AuthService.loginWithGoogle
 * for why it's still re-validated on arrival rather than trusted
 * blindly just because it's signed.
 * 2. Protects against OAuth login CSRF: an attacker who initiates
 * their own OAuth flow and tricks a victim into visiting the
 * resulting Google-redirect URL could otherwise get the victim's
 * browser to complete login as the *attacker's* Google account —
 * confusing which account the victim ends up authenticated as.
 *
 * Not using passport-oauth2's built-in `state: true` session-based
 * protection, because this app has no server-side session store —
 * deliberately, stateless JWT auth throughout. Instead: a random
 * nonce is minted here, stored in a short-lived httpOnly cookie, AND
 * embedded (signed) inside the state JWT sent to Google. The callback
 * verifies both copies match before trusting anything — an attacker
 * replaying just the state value against a victim's browser can't
 * succeed without also having the victim's matching nonce cookie,
 * which they were never issued.
 */
@Injectable()
class GoogleAuthGuard extends AuthGuard('google') {
  constructor(
    @Inject(JwtService) jwtService,
    @Inject(ConfigService) configService,
  ) {
    super();
    this.jwtService = jwtService;
    this.configService = configService;
  }

  getAuthenticateOptions(context) {
    const req = context.switchToHttp().getRequest();

    // Google's callback always includes ?code=... — that's how one
    // shared guard tells "we're initiating" apart from "Google is
    // calling us back," without needing two guard classes.
    if (req.query.code) {
      return {};
    }

    const res = context.switchToHttp().getResponse();
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    const nonce = crypto.randomBytes(24).toString('hex');

    // sameSite MUST be 'lax' here, not 'strict' like the refresh
    // cookie. This cookie specifically has to survive the scenario
    // 'strict' is designed to block: a top-level navigation arriving
    // from a different site (accounts.google.com redirecting the
    // browser back to us). 'lax' still blocks it from attaching to
    // cross-site subrequests/forms — enough for this cookie's purpose,
    // while still working within the OAuth redirect chain.
    res.cookie('oauthNonce', nonce, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 5 * 60 * 1000,
      path: '/',
    });

    // req.query.role is client input at this point (from our own
    // signin/create-account pages, but still just a query string) —
    // whitelisted to exactly two values here, then embedded in the
    // *signed* state below. That signature is what makes it
    // tamper-proof by the time it comes back from Google: a client
    // could send a different role in the initial request, but
    // couldn't alter it afterward without invalidating the signature.
    const role =
      req.query.role === 'TEACHER' || req.query.role === 'STUDENT'
        ? req.query.role
        : null;

    const state = this.jwtService.sign(
      { nonce, role },
      {
        secret: this.configService.getOrThrow('GOOGLE_OAUTH_STATE_SECRET'),
        expiresIn: '5m',
      },
    );

    return { state, scope: ['email', 'profile'] };
  }
}

module.exports = { GoogleAuthGuard };
