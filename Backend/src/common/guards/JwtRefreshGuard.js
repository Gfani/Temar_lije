const { Injectable } = require('@nestjs/common');
const { AuthGuard } = require('@nestjs/passport');

@Injectable()
class JwtRefreshGuard extends AuthGuard('jwt-refresh') {}

module.exports = { JwtRefreshGuard };
