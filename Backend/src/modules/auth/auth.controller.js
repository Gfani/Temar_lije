const {
  Controller,
  Post,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  Dependencies,
} = require('@nestjs/common');
const { Throttle } = require('@nestjs/throttler');
const { ConfigService } = require('@nestjs/config');
const { AuthService } = require('./auth.service');
const { JwtAuthGuard } = require('../../common/guards/JwtAuthGuard');
const { JwtRefreshGuard } = require('../../common/guards/JwtRefreshGuard');

const REFRESH_COOKIE_NAME = 'refreshToken';
const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

@Controller('auth')
@Dependencies(AuthService, ConfigService)
class AuthController {
  constructor(authService, configService) {
    this.authService = authService;
    this.configService = configService;
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

  _sendAuthResult(res, result) {
    res.cookie(
      REFRESH_COOKIE_NAME,
      result.refreshToken,
      this._refreshCookieOptions(),
    );
    return { accessToken: result.accessToken, user: result.user };
  }

  @Throttle({ default: { limit: 5, ttl: 300000 } })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto, @Res({ passthrough: true }) res) {
    const result = await this.authService.register(dto);
    return this._sendAuthResult(res, result);
  }

  @Throttle({ default: { limit: 5, ttl: 300000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto, @Res({ passthrough: true }) res) {
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
}

module.exports = { AuthController };
