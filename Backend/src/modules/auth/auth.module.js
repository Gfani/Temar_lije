const { Module } = require('@nestjs/common');
const { JwtModule } = require('@nestjs/jwt');
const { PassportModule } = require('@nestjs/passport');

const { AuthController } = require('./auth.controller');
const { AuthService } = require('./auth.service');
const { JwtStrategy } = require('./strategies/jwt.strategy');
const { JwtRefreshStrategy } = require('./strategies/jwt-refresh.strategy');
const { GoogleStrategy } = require('./strategies/google.strategy');
const { PrismaService } = require('../../database/prisma.service');

@Module({
  imports: [PassportModule, JwtModule.register({ global: true })],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtRefreshStrategy,
    GoogleStrategy,
    PrismaService,
  ],
  exports: [AuthService],
})
class AuthModule {}

module.exports = { AuthModule };
