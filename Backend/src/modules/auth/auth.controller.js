// @ts-nocheck
// This controller is loaded by NestJS at runtime and is intentionally not part of the TypeScript project service.
// Keeping this file as a plain JS module avoids editor/project-service warnings for runtime-only NestJS wiring.

const {
  Controller,
  Post,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  Inject,
} = require('@nestjs/common');
const { Throttle } = require('@nestjs/throttler');
const { ConfigService } = require('@nestjs/config');
const { AuthService } = require('./auth.service');
const { RegisterDto } = require('./dto/register.dto');
const { LoginDto } = require('./dto/login.dto');
const { JwtAuthGuard } = require('../../common/guards/JwtAuthGuard');
const { JwtRefreshGuard } = require('../../common/guards/JwtRefreshGuard');

const REFRESH_COOKIE_NAME = 'refreshToken';
const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function applyMethodDecorators(target, methodName, decorators) {
  const descriptor = Object.getOwnPropertyDescriptor(target, methodName);
  if (!descriptor) {
    return;
  }

  let currentDescriptor = descriptor;
  for (const decorator of decorators) {
    const nextDescriptor = decorator(target, methodName, currentDescriptor);
    if (nextDescriptor) {
      currentDescriptor = nextDescriptor;
      Object.defineProperty(target, methodName, currentDescriptor);
    }
  }
}

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
    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, this._refreshCookieOptions());
    return { accessToken: result.accessToken, user: result.user };
  }

  async register(dto, res) {
    const result = await this.authService.register(dto);
    return this._sendAuthResult(res, result);
  }

  async login(dto, res) {
    const result = await this.authService.login(dto);
    return this._sendAuthResult(res, result);
  }

  async refresh(req, res) {
    const userId = req.user.id;
    const refreshToken = req.cookies[REFRESH_COOKIE_NAME];
    const result = await this.authService.refreshTokens(userId, refreshToken);
    return this._sendAuthResult(res, result);
  }

  async logout(req, res) {
    await this.authService.logout(req.user.id);
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/auth/refresh' });
    return { message: 'Logged out successfully' };
  }
}

Controller('auth')(AuthController);
Inject(AuthService)(AuthController.prototype, 'constructor', 0);
Inject(ConfigService)(AuthController.prototype, 'constructor', 1);

applyMethodDecorators(AuthController.prototype, 'register', [
  Throttle({ default: { limit: 5, ttl: 300000 } }),
  Post('register'),
  HttpCode(HttpStatus.CREATED),
]);
Body()(AuthController.prototype, 'register', 0);
Res({ passthrough: true })(AuthController.prototype, 'register', 1);

applyMethodDecorators(AuthController.prototype, 'login', [
  Throttle({ default: { limit: 5, ttl: 300000 } }),
  Post('login'),
  HttpCode(HttpStatus.OK),
]);
Body()(AuthController.prototype, 'login', 0);
Res({ passthrough: true })(AuthController.prototype, 'login', 1);

applyMethodDecorators(AuthController.prototype, 'refresh', [
  Post('refresh'),
  HttpCode(HttpStatus.OK),
  UseGuards(JwtRefreshGuard),
]);
Req()(AuthController.prototype, 'refresh', 0);
Res({ passthrough: true })(AuthController.prototype, 'refresh', 1);

applyMethodDecorators(AuthController.prototype, 'logout', [
  Post('logout'),
  HttpCode(HttpStatus.OK),
  UseGuards(JwtAuthGuard),
]);
Req()(AuthController.prototype, 'logout', 0);
Res({ passthrough: true })(AuthController.prototype, 'logout', 1);

module.exports = { AuthController };
