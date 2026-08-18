const {
  Injectable,
  Dependencies,
  UnauthorizedException,
} = require('@nestjs/common');
const { PassportStrategy } = require('@nestjs/passport');
const { Strategy, ExtractJwt } = require('passport-jwt');
const { ConfigService } = require('@nestjs/config');
const { PrismaService } = require('../../../database/prisma.service');

/**
 * Validates the access token on every request to a route guarded by
 * JwtAuthGuard.
 */
@Injectable()
@Dependencies(ConfigService, PrismaService)
class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService, prisma) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow('JWT_ACCESS_SECRET'),
    });
    this.prisma = prisma;
  }

  async validate(payload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      throw new UnauthorizedException('Account no longer exists');
    }

    return { id: user.id, email: user.email, role: user.role };
  }
}

module.exports = { JwtStrategy };
