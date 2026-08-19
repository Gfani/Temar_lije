const {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  Dependencies,
  BadRequestException,
} = require('@nestjs/common');
const { Throttle } = require('@nestjs/throttler');
const { ConfigService } = require('@nestjs/config');
const { JwtService } = require('@nestjs/jwt');
const { validate } = require('class-validator');
const { plainToInstance } = require('class-transformer');
const crypto = require('crypto');

const { AuthService } = require('./auth.service');
const { RegisterDto } = require('./dto/register.dto');
const { LoginDto } = require('./dto/login.dto');
const { JwtAuthGuard } = require('../../common/guards/JwtAuthGuard');
const { JwtRefreshGuard } = require('../../common/guards/JwtRefreshGuard');
const { GoogleAuthGuard } = require('../../common/guards/GoogleAuthGuard');

const REFRESH_COOKIE_NAME = 'refreshToken';
const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

@Controller('auth')
@Dependencies(AuthService, ConfigService, JwtService)
class AuthController {
  constructor(authService, configService, jwtService) {
    this.authService = authService;
    this.configService = configService;
    this._jwtService = jwtService;
  }

  _refreshCookieOptions() {
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/auth/refresh',
      maxAge: REFRESH_COOKIE_MAX_AGE_MS,
    };
  }

  _setRefreshCookie(res, refreshToken) {
    res.cookie(
      REFRESH_COOKIE_NAME,
      refreshToken,
      this._refreshCookieOptions(),
    );
  }

  _sendAuthResult(res, result) {
    this._setRefreshCookie(res, result.refreshToken);
    return { accessToken: result.accessToken, user: result.user };
  }

  /**
   * Validate an incoming request body against a class-validator DTO.
   * The global ValidationPipe cannot infer DTO metatypes in plain-JS
   * controllers, so we validate explicitly here and return a 400 with
   * the readable constraint messages instead of a 500.
   */
  async _validateDto(dtoClass, value) {
    const errors = await validate(plainToInstance(dtoClass, value || {}), {
      whitelist: true,
      forbidNonWhitelisted: false,
    });
    if (errors.length > 0) {
      const messages = errors.flatMap((error) =>
        Object.values(error.constraints || {}),
      );
      throw new BadRequestException(messages);
    }
  }

  @Throttle({ default: { limit: 5, ttl: 300000 } })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto, @Res({ passthrough: true }) res) {
    await this._validateDto(RegisterDto, dto);
    const result = await this.authService.register(dto);
    return this._sendAuthResult(res, result);
  }

  @Throttle({ default: { limit: 10, ttl: 300000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto, @Res({ passthrough: true }) res) {
    await this._validateDto(LoginDto, dto);
    const result = await this.authService.login(dto);
    return this._sendAuthResult(res, result);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtRefreshGuard)
  async refresh(@Req() req, @Res({ passthrough: true }) res) {
    const userId = req.user?.id || req.user?.userId || req.user?.sub;
    const refreshToken = req.user?.refreshToken || req.cookies?.[REFRESH_COOKIE_NAME];
    const result = await this.authService.refreshTokens(userId, refreshToken);
    return this._sendAuthResult(res, result);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logout(@Req() req, @Res({ passthrough: true }) res) {
    const userId = req.user?.id || req.user?.userId || req.user?.sub;
    await this.authService.logout(userId);
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/auth/refresh' });
    return { message: 'Logged out successfully' };
  }

  /**
   * Kicks off the Google OAuth flow. This handler's body never
   * actually runs — GoogleAuthGuard intercepts the request first and
   * issues the redirect to Google's consent screen. It exists only so
   * there's a route for the guard to attach to.
   *
   * Frontend integration: this must be a full-page navigation
   * (window.location.href = ...), not a fetch/AJAX call — a fetch
   * request has no way to render Google's interactive login screen.
   * The create-account page's Google button should link here with
   * ?role=STUDENT or ?role=TEACHER based on the selected toggle; the
   * signin page's Google button should omit the role param entirely
   * (signing in should never silently create a new account).
   */
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleAuth() {}

  /**
   * Google redirects back here after the user consents. By the time
   * this method body runs, GoogleAuthGuard has already exchanged the
   * authorization code for a profile via GoogleStrategy — req.user is
   * that normalized profile object, NOT the AuthenticatedUser shape
   * from jwt.strategy.js.
   *
   * @Res() here (no passthrough) because this handler redirects
   * rather than returning JSON — passthrough mode is for letting Nest
   * auto-serialize a return value, which doesn't apply once we're
   * calling res.redirect() ourselves.
   *
   * Deliberately does NOT put the access token in the redirect URL.
   * A token in a URL ends up in browser history, server access logs,
   * and any Referer header sent by the next page load — real
   * exposure for very little benefit. Instead: the refresh cookie
   * (httpOnly, already scoped to /auth/refresh) is set here, and the
   * frontend's OAuth-callback page is expected to immediately call
   * POST /auth/refresh on mount — the same silent-refresh pattern
   * you'd use on normal app boot — to obtain an access token and the
   * user object (including role, for routing to the right dashboard)
   * without anything sensitive ever touching the URL.
   */
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() req, @Res() res) {
    const cookieNonce = req.cookies?.oauthNonce;
    res.clearCookie('oauthNonce', { path: '/auth/google/callback' });
    const frontendBaseUrl = this.configService.getOrThrow('FRONTEND_URL');
    const frontendErrorUrl = `${frontendBaseUrl}/signin?error=oauth_failed`;

    if (!req.query.state || !cookieNonce) {
      return res.redirect(frontendErrorUrl);
    }

    let statePayload;
    try {
      statePayload = this._jwtService.verify(req.query.state, {
        secret: this.configService.getOrThrow('GOOGLE_OAUTH_STATE_SECRET'),
      });
    } catch {
      return res.redirect(frontendErrorUrl);
    }

    const nonceBuffer = Buffer.from(statePayload.nonce || '');
    const cookieBuffer = Buffer.from(cookieNonce);
    const nonceMatches =
      nonceBuffer.length === cookieBuffer.length &&
      crypto.timingSafeEqual(nonceBuffer, cookieBuffer);

    if (!nonceMatches) {
      return res.redirect(frontendErrorUrl);
    }

    try {
      const result = await this.authService.loginWithGoogle(
        req.user,
        statePayload.role,
      );
      this._setRefreshCookie(res, result.refreshToken);
      return res.redirect(`${frontendBaseUrl}/oauth/callback`);
    } catch (err) {
      // Covers loginWithGoogle's own rejections (e.g. "no account
      // found, register first") — surfaced to the user via a query
      // param the signin page can read and display, rather than a raw
      // JSON error hitting a browser mid-redirect with nothing to
      // render it.
      const message = encodeURIComponent(
        err.message || 'Google sign-in failed',
      );
      return res.redirect(`${frontendErrorUrl}&message=${message}`);
    }
  }
}

module.exports = { AuthController };
