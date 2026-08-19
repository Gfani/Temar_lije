import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Socket } from 'socket.io';

/**
 * Builds a socket.io handshake middleware that requires a valid JWT
 * access token. The token is read from the client `auth.token` field
 * (socket.io-client `auth: { token }` option) or the Authorization
 * header, verified with the same secret the JWT strategy uses, and the
 * verified payload is attached to `socket.data.user`.
 */
export function createSocketAuthMiddleware(
  jwtService: JwtService,
  configService: ConfigService,
) {
  return (socket: Socket, next: (err?: Error) => void) => {
    try {
      const authHeader =
        (socket.handshake?.headers?.authorization as string) || '';
      const token =
        (socket.handshake?.auth as any)?.token ||
        authHeader.replace(/^Bearer\s+/i, '');

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const payload = jwtService.verify(token, {
        secret: configService.getOrThrow('JWT_ACCESS_SECRET'),
      });

      (socket as any).data.user = payload;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  };
}