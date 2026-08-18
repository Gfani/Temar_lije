const {
  Injectable,
  Dependencies,
  UnauthorizedException,
} = require('@nestjs/common');
const { PassportStrategy } = require('@nestjs/passport');
const { Strategy } = require('passport-jwt');
const { ConfigService } = require('@nestjs/config');

function cookieExtractor(req) {
  return req?.cookies?.refreshToken || req?.headers?.['x-refresh-token'] || null;
}

@Injectable()
@Dependencies(ConfigService)
class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(configService) {
    super({
      jwtFromRequest: cookieExtractor,
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(req, payload) {
    const refreshToken = cookieExtractor(req);
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }
    return {
      id: payload.sub,
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      refreshToken,
    };
  }
}

module.exports = { JwtRefreshStrategy };
